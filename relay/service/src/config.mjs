export const DEFAULT_RELAY_PORT = 4318;
export const DEFAULT_RELAY_STORE_PATH = ".signallake/relay-store.json";

export function loadRelayConfig(env = process.env) {
  const port = parsePort(env.PORT ?? String(DEFAULT_RELAY_PORT));
  const storePath = env.SIGNALLAKE_RELAY_STORE_PATH || undefined;
  const token = env.SIGNALLAKE_RELAY_TOKEN || undefined;
  const maxAttempts = parsePositiveInteger(
    env.SIGNALLAKE_RELAY_MAX_ATTEMPTS ?? "3",
    "SIGNALLAKE_RELAY_MAX_ATTEMPTS"
  );
  const retentionMs = parseNonNegativeInteger(
    env.SIGNALLAKE_RELAY_RETENTION_MS ?? "604800000",
    "SIGNALLAKE_RELAY_RETENTION_MS"
  );

  return {
    port,
    storePath,
    token,
    maxAttempts,
    retentionMs,
    mode: storePath ? "file" : "memory"
  };
}

function parsePort(value) {
  const port = parsePositiveInteger(value, "PORT");
  if (port > 65535) {
    throw new Error("PORT must be between 1 and 65535");
  }
  return port;
}

function parsePositiveInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`${name} must be a positive integer`);
  }
  return parsed;
}

function parseNonNegativeInteger(value, name) {
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`${name} must be a non-negative integer`);
  }
  return parsed;
}
