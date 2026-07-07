import { createTauriSignalLake } from "../../sdk/js/tauri/src/index.mjs";
import { createRelayService } from "../../relay/service/src/index.mjs";
import fs from "node:fs";

const picpeekCatalog = JSON.parse(
  fs.readFileSync(new URL("../../catalogs/picpeek.catalog.v1.json", import.meta.url), "utf8")
);

const pilotEncryption = {
  keyId: "picpeek-local-dry-run-key",
  keyBytes: new Uint8Array([
    32, 31, 30, 29, 28, 27, 26, 25,
    24, 23, 22, 21, 20, 19, 18, 17,
    16, 15, 14, 13, 12, 11, 10, 9,
    8, 7, 6, 5, 4, 3, 2, 1
  ])
};

export async function runPicPeekDryRunPilot() {
  const sdk = createTauriSignalLake({
    source: {
      appId: "app.picpeek.desktop",
      product: "PicPeek",
      sdkName: "signallake-js-tauri",
      sdkVersion: "0.0.0-pilot",
      platform: "tauri",
      appVersion: "0.1.0-pilot",
      environment: "test"
    },
    identity: {
      anonymousId: "anon_picpeek_pilot_001",
      deviceId: "device_picpeek_pilot_001"
    },
    session: {
      sessionId: "session_picpeek_pilot_001",
      startedAt: "2026-07-06T00:00:00.000Z"
    },
    catalog: picpeekCatalog,
    encryption: pilotEncryption
  });

  const emitted = [
    sdk.trackAppOpened({ launchType: "manual" }),
    sdk.trackScreenViewed("library", { routeKey: "main" }),
    sdk.trackCommandInvoked("folder.open", {
      entry: "toolbar",
      hasSelection: false
    }),
    sdk.trackErrorOccurred("E_QUEUE_WRITE_FAILED", {
      severity: "error",
      recoverable: true
    })
  ];

  const privacyRejections = [];
  for (const candidate of [
    () => sdk.trackCommandInvoked("folder.open", { folderPath: "/Users/meimei/Pictures" }),
    () => sdk.trackCommandInvoked("clipboard.copy", { clipboardText: "raw clipboard text" })
  ]) {
    try {
      candidate();
    } catch (error) {
      privacyRejections.push({
        name: error.name,
        message: error.message
      });
    }
  }

  const batch = await sdk.drainEncryptedBatch();
  const relay = createRelayService();
  const upload = relay.upload(batch);
  const pulled = relay.pull(1);
  const ack = relay.ack(pulled.deliveries[0]?.deliveryId);

  return {
    pilot: "picpeek-dry-run",
    networkDefault: "off",
    uploadPayload: "encrypted",
    emittedEvents: emitted.map((event) => event.event.name),
    eventCount: emitted.length,
    uploadedSchemaVersion: batch.schemaVersion,
    privacyRejections,
    relay: {
      uploadStatus: upload.status,
      deliveryCount: pulled.deliveries.length,
      ackStatus: ack.status,
      stats: relay.stats(),
      metrics: relay.metrics().counters
    },
    pass:
      batch.schemaVersion === "signallake.encrypted-event-batch.v1" &&
      emitted.length === 4 &&
      privacyRejections.length === 2 &&
      upload.status === 202 &&
      pulled.deliveries.length === 1 &&
      ack.status === 200
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const report = await runPicPeekDryRunPilot();
  console.log(JSON.stringify(report, null, 2));
  if (!report.pass) process.exit(1);
}
