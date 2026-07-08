import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { performance } from "node:perf_hooks";
import { createTauriSignalLake } from "../../sdk/js/tauri/src/index.mjs";

const eventCount = Number.parseInt(process.env.SIGNALLAKE_STRESS_EVENTS ?? "1000", 10);
const maxDiskBytes = Number.parseInt(process.env.SIGNALLAKE_STRESS_MAX_BYTES ?? `${1024 * 1024}`, 10);
const maxDiskBatches = Number.parseInt(process.env.SIGNALLAKE_STRESS_MAX_BATCHES ?? "40", 10);
const burstBatchSize = Number.parseInt(process.env.SIGNALLAKE_STRESS_BATCH_SIZE ?? "10", 10);

const source = {
  appId: "app.signallake.stress",
  product: "SignalLake-Stress",
  sdkName: "signallake-js-tauri",
  sdkVersion: "0.0.0-stress",
  platform: "tauri",
  appVersion: "0.0.0-stress",
  environment: "test"
};

const identity = {
  anonymousId: "stress-anon",
  deviceId: "stress-device"
};

const session = {
  sessionId: "stress-session",
  startedAt: "2026-07-08T00:00:00.000Z"
};

const catalog = {
  catalogVersion: "signallake.catalog.stress.v1",
  product: source.product,
  appId: source.appId,
  events: [
    {
      name: "command.invoked",
      category: "command",
      privacyClass: "behavioral",
      status: "active",
      properties: [
        { name: "commandId", type: "string", required: true },
        { name: "outcome", type: "string", required: false, enum: ["success", "failure", "unknown"] }
      ]
    }
  ]
};

const encryption = {
  keyId: "stress-local-aes-256-gcm",
  keyBytes: new Uint8Array([
    1, 2, 3, 4, 5, 6, 7, 8,
    9, 10, 11, 12, 13, 14, 15, 16,
    17, 18, 19, 20, 21, 22, 23, 24,
    25, 26, 27, 28, 29, 30, 31, 32
  ])
};

const queueDir = await fs.mkdtemp(path.join(os.tmpdir(), "signallake-tauri-stress-"));
const sdk = createTauriSignalLake({
  source,
  identity,
  session,
  catalog,
  encryption,
  diskQueueDirectory: queueDir,
  storagePolicy: {
    maxDiskBytes,
    maxDiskBatches
  }
});

const started = performance.now();
let trackMaxMs = 0;
for (let index = 0; index < eventCount; index++) {
  const before = performance.now();
  sdk.trackCommandInvoked("stress.run", { outcome: "success" });
  trackMaxMs = Math.max(trackMaxMs, performance.now() - before);
  if ((index + 1) % burstBatchSize === 0) {
    await sdk.drainEncryptedBatch(burstBatchSize);
  }
}
await sdk.drainEncryptedBatch(burstBatchSize);

const offlineCount = await sdk.diskQueue.count();
const offlineBytes = await sdk.diskQueue.sizeBytes();
const files = await fs.readdir(queueDir);
const fileContents = await Promise.all(files.map((file) => fs.readFile(path.join(queueDir, file), "utf8")));
const plaintextLeaked = fileContents.join("\n").includes("command.invoked");

const slowUploader = createFakeUploader({ mode: "slow", delayMs: 5 });
const pendingBeforeSlow = await sdk.drainEncryptedBatch(burstBatchSize);
const slowStarted = performance.now();
await Promise.all(Array.from({ length: 20 }, () => slowUploader.upload(pendingBeforeSlow)));
const slowElapsedMs = performance.now() - slowStarted;

const recoverUploader = createFakeUploader({ mode: "success" });
let uploaded = 0;
let pending;
while ((pending = await sdk.drainEncryptedBatch(burstBatchSize))) {
  await recoverUploader.upload(pending);
  await sdk.ackEncryptedBatch(pending);
  uploaded++;
}

const result = {
  eventCount,
  queueDir,
  trackMaxMs: Number(trackMaxMs.toFixed(3)),
  offlineCount,
  offlineBytes,
  maxDiskBytes,
  maxDiskBatches,
  plaintextLeaked,
  slowElapsedMs: Number(slowElapsedMs.toFixed(3)),
  slowInFlightMax: slowUploader.inFlightMax(),
  uploaded,
  remainingCount: await sdk.diskQueue.count(),
  elapsedMs: Number((performance.now() - started).toFixed(3))
};

const failures = [];
if (trackMaxMs > 20) failures.push(`trackMaxMs too high: ${trackMaxMs}`);
if (offlineCount > maxDiskBatches) failures.push(`offlineCount exceeds cap: ${offlineCount}`);
if (offlineBytes > maxDiskBytes) failures.push(`offlineBytes exceeds cap: ${offlineBytes}`);
if (plaintextLeaked) failures.push("plaintext event name leaked into disk queue");
if (slowUploader.inFlightMax() > 1) failures.push(`uploader in-flight exceeded 1: ${slowUploader.inFlightMax()}`);
if ((await sdk.diskQueue.count()) !== 0) failures.push("recover upload did not drain disk queue");

console.log(JSON.stringify({ ok: failures.length === 0, result, failures }, null, 2));
if (failures.length) process.exit(1);

function createFakeUploader({ mode, delayMs = 0 }) {
  let inFlight = 0;
  let inFlightMax = 0;
  return {
    async upload(batch) {
      if (!batch) return { ok: false };
      if (inFlight > 0) {
        return { ok: false, error: "concurrent upload rejected" };
      }
      inFlight++;
      inFlightMax = Math.max(inFlightMax, inFlight);
      try {
        if (delayMs > 0) await new Promise((resolve) => setTimeout(resolve, delayMs));
        if (mode === "success" || mode === "slow") return { ok: true };
        return { ok: false };
      } finally {
        inFlight--;
      }
    },
    inFlightMax() {
      return inFlightMax;
    }
  };
}
