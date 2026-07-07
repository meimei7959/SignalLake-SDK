import test from "node:test";
import assert from "node:assert/strict";
import { buildBatch, createEventBuilder, encryptBatch } from "../sdk/js/core/src/index.mjs";
import { createRelayService } from "../relay/service/src/index.mjs";
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

test("relay accepts encrypted batch and supports pull ack", async () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  const batch = await encryptBatch(buildBatch({
    source,
    events: [
      builder.buildEvent({
        name: "app.opened",
        category: "lifecycle",
        properties: { launchType: "manual" }
      })
    ]
  }), testEncryption);
  const relay = createRelayService();

  const upload = relay.upload(batch);
  assert.equal(upload.status, 202);
  assert.equal(upload.accepted, true);

  const pulled = relay.pull(1);
  assert.equal(pulled.deliveries.length, 1);
  assert.equal(pulled.deliveries[0].batch.schemaVersion, "signallake.encrypted-event-batch.v1");

  const ack = relay.ack(pulled.deliveries[0].deliveryId);
  assert.equal(ack.status, 200);
  assert.deepEqual(relay.stats(), { acked: 1 });
});

test("relay rejects plaintext upload batches", () => {
  const relay = createRelayService();
  const plaintextBatch = {
    schemaVersion: "signallake.event-batch.v1",
    batchId: "dddddddd-dddd-4ddd-8ddd-dddddddddddd",
    createdAt: "2026-07-05T06:00:00.000Z",
    source: {
      appId: source.appId,
      product: source.product,
      sdkName: source.sdkName,
      sdkVersion: source.sdkVersion,
      environment: source.environment
    },
    eventCount: 1,
    compression: "none",
    events: [
      {
        schemaVersion: "signallake.event-envelope.v1",
        catalogVersion: "signallake.catalog.picpeek.v1",
        eventId: "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee",
        occurredAt: "2026-07-05T06:00:00.000Z",
        collectedAt: "2026-07-05T06:00:00.000Z",
        source,
        identity,
        session: { sessionId: session.sessionId, startedAt: session.startedAt, sequence: 1 },
        event: {
          name: "command.invoked",
          category: "command",
          properties: { folderName: "Private Photos" }
        },
        privacy: {
          privacyClass: "behavioral",
          consent: { analytics: true, diagnostics: true },
          redactedFields: []
        }
      }
    ]
  };

  const result = relay.upload(plaintextBatch);
  assert.equal(result.status, 422);
  assert.equal(result.errorCode, "SIGNALLAKE_BATCH_INVALID");
  assert.match(result.findings[0], /plaintext/);
});

test("relay upload is idempotent by encrypted batchId", async () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  const batch = await encryptBatch(buildBatch({
    source,
    batchId: "ffffffff-ffff-4fff-8fff-ffffffffffff",
    events: [
      builder.buildEvent({
        name: "screen.viewed",
        category: "screen",
        properties: { screenId: "library" }
      })
    ]
  }), testEncryption);
  const relay = createRelayService();

  const first = relay.upload(batch);
  const second = relay.upload(batch);

  assert.equal(first.accepted, true);
  assert.equal(second.accepted, false);
  assert.equal(second.duplicate, true);
  assert.equal(second.deliveryId, first.deliveryId);
});
