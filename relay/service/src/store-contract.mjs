import { defaultId, defaultNow } from "../../../sdk/js/core/src/ids.mjs";

export const RELAY_STORE_VERSION = "signallake.relay-store.v1";
export const RETAINABLE_STATUSES = ["acked", "dead_letter"];

export function createStoreClock(options = {}) {
  return {
    id: options.id ?? defaultId,
    now: options.now ?? defaultNow,
    maxAttempts: options.maxAttempts ?? 3
  };
}

export function createDeliveryRecord(batch, clock) {
  return {
    deliveryId: clock.id(),
    batchId: batch.batchId,
    createdAt: clock.now(),
    updatedAt: clock.now(),
    attempts: 0,
    status: "queued",
    batch: structuredClone(batch)
  };
}

export function snapshotDelivery(delivery) {
  return {
    deliveryId: delivery.deliveryId,
    batchId: delivery.batchId,
    createdAt: delivery.createdAt,
    updatedAt: delivery.updatedAt,
    attempts: delivery.attempts,
    status: delivery.status,
    batch: structuredClone(delivery.batch)
  };
}

export function countByStatus(deliveries) {
  const counts = {};
  for (const delivery of deliveries) {
    counts[delivery.status] = (counts[delivery.status] ?? 0) + 1;
  }
  return counts;
}

export function pruneDeliveries(deliveries, deliveryByBatch, options = {}) {
  const statuses = new Set(options.statuses ?? RETAINABLE_STATUSES);
  const olderThanMs = options.olderThanMs ?? 0;
  const nowMs = Date.parse(options.now ?? new Date().toISOString());
  let removed = 0;

  for (const [deliveryId, delivery] of deliveries.entries()) {
    const updatedAt = Date.parse(delivery.updatedAt ?? delivery.createdAt);
    const oldEnough = nowMs - updatedAt >= olderThanMs;
    if (statuses.has(delivery.status) && oldEnough) {
      deliveries.delete(deliveryId);
      deliveryByBatch.delete(delivery.batchId);
      removed += 1;
    }
  }

  return { removed };
}

export function indexDeliveries(deliveries) {
  const deliveryById = new Map();
  const deliveryByBatch = new Map();

  for (const delivery of deliveries) {
    deliveryById.set(delivery.deliveryId, delivery);
    deliveryByBatch.set(delivery.batchId, delivery.deliveryId);
  }

  return {
    deliveryById,
    deliveryByBatch
  };
}
