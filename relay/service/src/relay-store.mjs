import {
  countByStatus,
  createDeliveryRecord,
  createStoreClock,
  indexDeliveries,
  pruneDeliveries,
  snapshotDelivery
} from "./store-contract.mjs";

export function createInMemoryRelayStore(options = {}) {
  const clock = createStoreClock(options);
  const { deliveryById: deliveries, deliveryByBatch } = indexDeliveries([]);

  return {
    kind: "memory",
    acceptBatch(batch) {
      const existingDeliveryId = deliveryByBatch.get(batch.batchId);
      if (existingDeliveryId) {
        return {
          accepted: false,
          duplicate: true,
          deliveryId: existingDeliveryId
        };
      }

      const delivery = createDeliveryRecord(batch, clock);
      deliveries.set(delivery.deliveryId, delivery);
      deliveryByBatch.set(batch.batchId, delivery.deliveryId);

      return {
        accepted: true,
        duplicate: false,
        deliveryId: delivery.deliveryId
      };
    },
    pull(limit = 10) {
      const items = [];
      for (const delivery of deliveries.values()) {
        if (items.length >= limit) break;
        if (delivery.status !== "queued") continue;
        delivery.status = "inflight";
        delivery.attempts += 1;
        delivery.updatedAt = clock.now();
        items.push(snapshotDelivery(delivery));
      }
      return items;
    },
    ack(deliveryId) {
      const delivery = deliveries.get(deliveryId);
      if (!delivery) return { acked: false, reason: "not_found" };
      delivery.status = "acked";
      delivery.updatedAt = clock.now();
      return { acked: true };
    },
    nack(deliveryId) {
      const delivery = deliveries.get(deliveryId);
      if (!delivery) return { nacked: false, reason: "not_found" };
      delivery.status = delivery.attempts >= clock.maxAttempts ? "dead_letter" : "queued";
      delivery.updatedAt = clock.now();
      return { nacked: true, status: delivery.status };
    },
    stats() {
      return countByStatus(deliveries.values());
    },
    prune(options = {}) {
      return pruneDeliveries(deliveries, deliveryByBatch, {
        ...options,
        now: options.now ?? clock.now()
      });
    }
  };
}
