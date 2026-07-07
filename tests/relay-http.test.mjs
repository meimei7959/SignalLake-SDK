import test from "node:test";
import assert from "node:assert/strict";
import { buildBatch, createEventBuilder, encryptBatch } from "../sdk/js/core/src/index.mjs";
import { createHttpRelayServer } from "../relay/service/src/http-server.mjs";
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

test("HTTP relay supports health upload pull ack", async () => {
  const server = createHttpRelayServer();
  await listen(server);
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  try {
    const health = await fetchJson(`${baseUrl}/healthz`);
    assert.equal(health.status, 200);
    assert.equal(health.body.ok, true);

    const ready = await fetchJson(`${baseUrl}/readyz`);
    assert.equal(ready.status, 200);
    assert.equal(ready.body.store, "memory");

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

    const upload = await fetchJson(`${baseUrl}/v1/upload`, {
      method: "POST",
      body: JSON.stringify(batch)
    });
    assert.equal(upload.status, 202);

    const pulled = await fetchJson(`${baseUrl}/v1/delivery/pull?limit=1`);
    assert.equal(pulled.body.deliveries.length, 1);

    const ack = await fetchJson(`${baseUrl}/v1/delivery/ack`, {
      method: "POST",
      body: JSON.stringify({ deliveryId: pulled.body.deliveries[0].deliveryId })
    });
    assert.equal(ack.status, 200);

    const metrics = await fetchJson(`${baseUrl}/v1/metrics`);
    assert.equal(metrics.status, 200);
    assert.equal(metrics.body.metrics.counters["upload.accepted"], 1);
  } finally {
    await close(server);
  }
});

function listen(server) {
  return new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
}

function close(server) {
  return new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "content-type": "application/json",
      ...(options.headers ?? {})
    }
  });
  return {
    status: response.status,
    body: await response.json()
  };
}
