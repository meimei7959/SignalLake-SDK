import test from "node:test";
import assert from "node:assert/strict";
import {
  buildBatch,
  buildCommonProperties,
  createEventBuilder,
  createMemoryQueue,
  decryptBatch,
  encryptBatch,
  EventCatalogValidationError,
  PrivacyViolationError,
  SignalLakeCommonFields,
  SignalLakeCommonValues
} from "../sdk/js/core/src/index.mjs";
import { castReceiverCatalog, picpeekCatalog } from "./helpers/catalogs.mjs";
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

test("event builder creates contract-shaped event", () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  const event = builder.buildEvent({
    name: "screen.viewed",
    category: "screen",
    properties: { screenId: "library" }
  });

  assert.equal(event.schemaVersion, "signallake.event-envelope.v1");
  assert.equal(event.catalogVersion, "signallake.catalog.picpeek.v1");
  assert.equal(event.event.name, "screen.viewed");
  assert.equal(event.session.sequence, 1);
});

test("common properties builder provides governed cross-product fields", () => {
  const properties = buildCommonProperties({
    channelId: "official",
    buildId: "debug-20260707",
    versionCode: 42,
    networkType: SignalLakeCommonValues.NETWORK_TYPE.ETHERNET,
    deviceTier: SignalLakeCommonValues.DEVICE_TIER.LOW,
    osVersion: "4.4.2",
    appForeground: true,
    outcome: SignalLakeCommonValues.OUTCOME.SUCCESS,
    errorCode: "RECEIVER_START_FAILED"
  });

  assert.equal(SignalLakeCommonFields.CHANNEL_ID, "channelId");
  assert.equal(properties.channelId, "official");
  assert.equal(properties.outcome, "success");
  assert.equal(properties.errorCode, "RECEIVER_START_FAILED");
});

test("common property validation rejects invalid common enum values", () => {
  assert.throws(
    () =>
      buildCommonProperties({
        outcome: "ok"
      }),
    /outcome must be one of/
  );
});

test("event builder rejects events or fields outside the registered catalog", () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });

  assert.throws(
    () =>
      builder.buildEvent({
        name: "media.random",
        category: "media",
        properties: {}
      }),
    EventCatalogValidationError
  );
  assert.throws(
    () =>
      builder.buildEvent({
        name: "screen.viewed",
        category: "screen",
        properties: { screenId: "library", strayField: "nope" }
      }),
    /strayField is not declared/
  );
});

test("privacy filter blocks forbidden fields before enqueue", () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  assert.throws(
    () =>
      builder.buildEvent({
        name: "command.invoked",
        category: "command",
        properties: { filePath: "/Users/meimei/private.png" }
      }),
    PrivacyViolationError
  );
});

test("memory queue drains into upload batch", () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  const queue = createMemoryQueue();
  queue.enqueue(
    builder.buildEvent({
      name: "app.opened",
      category: "lifecycle",
      properties: { launchType: "manual" }
    })
  );

  const batch = buildBatch({ source, events: queue.drain() });

  assert.equal(queue.size(), 0);
  assert.equal(batch.schemaVersion, "signallake.event-batch.v1");
  assert.equal(batch.eventCount, 1);
});

test("upload batch is encrypted before leaving SDK boundary", async () => {
  const builder = createEventBuilder({ source, identity, session, catalog: picpeekCatalog });
  const batch = buildBatch({
    source,
    events: [
      builder.buildEvent({
        name: "app.opened",
        category: "lifecycle",
        properties: { launchType: "manual" }
      })
    ]
  });

  const encrypted = await encryptBatch(batch, testEncryption);
  const decrypted = await decryptBatch(encrypted, testEncryption);

  assert.equal(encrypted.schemaVersion, "signallake.encrypted-event-batch.v1");
  assert.equal(encrypted.payload.encoding, "base64url");
  assert.equal(encrypted.payload.ciphertext.includes("app.opened"), false);
  assert.deepEqual(decrypted, batch);
});

test("Cast receiver catalog governs shared operation fields", () => {
  const builder = createEventBuilder({
    source: {
      appId: "com.zknowai.labi.cast.receiver",
      product: "Cast-SDK",
      sdkName: "signallake-android",
      sdkVersion: "0.1.0-test",
      platform: "android-tv",
      appVersion: "0.1.0",
      environment: "test"
    },
    identity,
    session,
    catalog: castReceiverCatalog
  });

  const event = builder.buildEvent({
    name: "command.invoked",
    category: "command",
    properties: {
      commandId: "player.start",
      protocol: SignalLakeCommonValues.PROTOCOL.DLNA,
      outcome: SignalLakeCommonValues.OUTCOME.SUCCESS
    }
  });

  assert.equal(event.catalogVersion, "signallake.catalog.cast-sdk.receiver.v1");
  assert.equal(event.event.properties.commandId, "player.start");
});
