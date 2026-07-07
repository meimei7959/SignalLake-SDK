import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import assert from "node:assert/strict";
import { buildBatch, createEventBuilder, encryptBatch } from "../sdk/js/core/src/index.mjs";
import { createFileRelayStore, createRelayService } from "../relay/service/src/index.mjs";
import { picpeekCatalog } from "./helpers/catalogs.mjs";
import { testEncryption } from "./helpers/encryption.mjs";

const source = {
  appId: "app.picpeek.desktop",
  product: "PicPeek",
  sdkName: "signallake-js-tauri",
  sdkVersion: "0.0.0-test",
  platform: "tauri",
  appVersion: "0.1.0",
  environment: "test"
};

test("relay metrics and retention prune are explicit service capabilities", async () => {
  const filePath = path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "signallake-retention-")),
    "relay-store.json"
  );
  const relay = createRelayService({
    store: createFileRelayStore({ filePath })
  });
  const batch = await createBatch();

  relay.upload(batch);
  const pulled = relay.pull(1);
  relay.ack(pulled.deliveries[0].deliveryId);
  const pruned = relay.pruneRetention({
    statuses: ["acked"],
    olderThanMs: 0
  });

  assert.equal(pruned.removed, 1);
  assert.deepEqual(relay.stats(), {});

  const counters = relay.metrics().counters;
  assert.equal(counters["upload.accepted"], 1);
  assert.equal(counters["delivery.pull.requests"], 1);
  assert.equal(counters["delivery.pull.items"], 1);
  assert.equal(counters["delivery.ack"], 1);
  assert.equal(counters["retention.pruned"], 1);
});

test("relay ready state exposes store kind and status counts", () => {
  const relay = createRelayService();
  const ready = relay.ready();

  assert.equal(ready.ok, true);
  assert.equal(ready.store, "memory");
  assert.deepEqual(ready.stats, {});
});

async function createBatch() {
  const builder = createEventBuilder({
    source,
    identity: {
      anonymousId: "anon_picpeek_dev_001",
      deviceId: "device_picpeek_dev_001"
    },
    session: {
      sessionId: "session_picpeek_dev_001",
      startedAt: "2026-07-05T06:00:00.000Z"
    },
    catalog: picpeekCatalog
  });
  return encryptBatch(buildBatch({
    source,
    batchId: "12121212-3434-4565-8787-909090909090",
    events: [
      builder.buildEvent({
        name: "app.opened",
        category: "lifecycle",
        properties: { launchType: "manual" }
      })
    ]
  }), testEncryption);
}
