import test from "node:test";
import assert from "node:assert/strict";
import { loadRelayConfig } from "../relay/service/src/config.mjs";

test("relay config defaults to memory mode", () => {
  const config = loadRelayConfig({});

  assert.equal(config.port, 4318);
  assert.equal(config.mode, "memory");
  assert.equal(config.storePath, undefined);
  assert.equal(config.maxAttempts, 3);
  assert.equal(config.retentionMs, 604800000);
});

test("relay config supports durable file mode", () => {
  const config = loadRelayConfig({
    PORT: "9999",
    SIGNALLAKE_RELAY_TOKEN: "token",
    SIGNALLAKE_RELAY_STORE_PATH: ".signallake/test-store.json",
    SIGNALLAKE_RELAY_MAX_ATTEMPTS: "5",
    SIGNALLAKE_RELAY_RETENTION_MS: "1000"
  });

  assert.equal(config.port, 9999);
  assert.equal(config.mode, "file");
  assert.equal(config.token, "token");
  assert.equal(config.storePath, ".signallake/test-store.json");
  assert.equal(config.maxAttempts, 5);
  assert.equal(config.retentionMs, 1000);
});

test("relay config rejects invalid port", () => {
  assert.throws(() => loadRelayConfig({ PORT: "70000" }), /PORT/);
});
