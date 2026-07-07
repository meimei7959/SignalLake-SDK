import { defaultId, defaultNow, normalizeIsoDate } from "./ids.mjs";

export function buildBatch(options) {
  const source = options?.source;
  const events = options?.events ?? [];
  const id = options?.id ?? defaultId;
  const now = options?.now ?? defaultNow;

  if (!source || typeof source !== "object") {
    throw new TypeError("source must be an object");
  }
  if (!Array.isArray(events) || events.length === 0) {
    throw new TypeError("events must be a non-empty array");
  }

  return {
    schemaVersion: "signallake.event-batch.v1",
    batchId: options.batchId ?? id(),
    createdAt: normalizeIsoDate(options.createdAt ?? now(), "createdAt"),
    source: {
      appId: source.appId,
      product: source.product,
      sdkName: source.sdkName,
      sdkVersion: source.sdkVersion,
      environment: source.environment
    },
    eventCount: events.length,
    compression: "none",
    events: events.map((event) => structuredClone(event))
  };
}
