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

const identity = {
  anonymousId: "anon_picpeek_dev_001",
  deviceId: "device_picpeek_dev_001"
};

const session = {
  sessionId: "session_picpeek_dev_001",
  startedAt: "2026-07-05T06:00:00.000Z"
};

test("file relay store persists queued encrypted batch and idempotency across restart", async () => {
  const filePath = tempStorePath();
  const batch = await createBatch("11111111-2222-4333-8444-555555555555");

  const firstRelay = createRelayService({
    store: createFileRelayStore({ filePath })
  });
  const firstUpload = firstRelay.upload(batch);
  assert.equal(firstUpload.status, 202);
  assert.equal(firstUpload.accepted, true);

  const restartedRelay = createRelayService({
    store: createFileRelayStore({ filePath })
  });
  const duplicateUpload = restartedRelay.upload(batch);
  assert.equal(duplicateUpload.duplicate, true);
  assert.equal(duplicateUpload.deliveryId, firstUpload.deliveryId);

  const pulled = restartedRelay.pull(1);
  assert.equal(pulled.deliveries.length, 1);
  assert.equal(pulled.deliveries[0].batchId, batch.batchId);
});

test("file relay store persists dead-letter state", async () => {
  const filePath = tempStorePath();
  const batch = await createBatch("66666666-7777-4888-8999-aaaaaaaaaaaa");
  const relay = createRelayService({
    store: createFileRelayStore({ filePath, maxAttempts: 1 })
  });

  relay.upload(batch);
  const pulled = relay.pull(1);
  const nack = relay.nack(pulled.deliveries[0].deliveryId);
  assert.equal(nack.status, "dead_letter");

  const restartedRelay = createRelayService({
    store: createFileRelayStore({ filePath, maxAttempts: 1 })
  });
  assert.deepEqual(restartedRelay.stats(), { dead_letter: 1 });
});

async function createBatch(batchId) {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  return encryptBatch(buildBatch({
    source,
    batchId,
    events: [
      builder.buildEvent({
        name: "app.opened",
        category: "lifecycle",
        properties: { launchType: "manual" }
      })
    ]
  }), testEncryption);
}

function tempStorePath() {
  return path.join(
    fs.mkdtempSync(path.join(os.tmpdir(), "signallake-relay-store-")),
    "relay-store.json"
  );
}
