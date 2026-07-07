import test from "node:test";
import assert from "node:assert/strict";
import { createTauriSignalLake } from "../sdk/js/tauri/src/index.mjs";
import { createRelayService } from "../relay/service/src/index.mjs";
import { picpeekCatalog } from "./helpers/catalogs.mjs";
import { testEncryption } from "./helpers/encryption.mjs";

test("dry-run Tauri SDK sends encrypted batch through relay pull ack flow", async () => {
  const sdk = createTauriSignalLake({
    source: {
      appId: "app.picpeek.desktop",
      product: "PicPeek",
      sdkName: "signallake-js-tauri",
      sdkVersion: "0.0.0-test",
      platform: "tauri",
      appVersion: "0.1.0",
      environment: "test"
    },
    identity: {
      anonymousId: "anon_picpeek_dev_001",
      deviceId: "device_picpeek_dev_001"
    },
    session: {
      sessionId: "session_picpeek_dev_001",
      startedAt: "2026-07-05T06:00:00.000Z"
    },
    catalog: picpeekCatalog,
    encryption: testEncryption
  });

  sdk.trackAppOpened({ launchType: "manual" });
  sdk.trackScreenViewed("library", { routeKey: "main" });
  sdk.trackCommandInvoked("folder.open", { entry: "toolbar" });

  const batch = await sdk.drainEncryptedBatch();
  const relay = createRelayService();
  const upload = relay.upload(batch);
  const pulled = relay.pull(1);
  const ack = relay.ack(pulled.deliveries[0].deliveryId);

  assert.equal(batch.schemaVersion, "signallake.encrypted-event-batch.v1");
  assert.equal(upload.status, 202);
  assert.equal(pulled.deliveries[0].batch.schemaVersion, "signallake.encrypted-event-batch.v1");
  assert.equal(ack.status, 200);
});
