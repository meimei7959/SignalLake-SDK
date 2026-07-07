import fs from "node:fs";
import path from "node:path";
import {
  RELAY_STORE_VERSION,
  countByStatus,
  createDeliveryRecord,
  createStoreClock,
  indexDeliveries,
  pruneDeliveries,
  snapshotDelivery
} from "./store-contract.mjs";

export function createFileRelayStore(options = {}) {
  const clock = createStoreClock(options);
  const filePath = path.resolve(options.filePath ?? ".signallake/relay-store.json");
  const loaded = loadStoreFile(filePath);
  const { deliveryById: deliveries, deliveryByBatch } = indexDeliveries(
    loaded.deliveries
  );

  return {
    kind: "file",
    filePath,
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
      persist();

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
      if (items.length) persist();
      return items;
    },
    ack(deliveryId) {
      const delivery = deliveries.get(deliveryId);
      if (!delivery) return { acked: false, reason: "not_found" };
      delivery.status = "acked";
      delivery.updatedAt = clock.now();
      persist();
      return { acked: true };
    },
    nack(deliveryId) {
      const delivery = deliveries.get(deliveryId);
      if (!delivery) return { nacked: false, reason: "not_found" };
      delivery.status =
        delivery.attempts >= clock.maxAttempts ? "dead_letter" : "queued";
      delivery.updatedAt = clock.now();
      persist();
      return { nacked: true, status: delivery.status };
    },
    stats() {
      return countByStatus(deliveries.values());
    },
    prune(options = {}) {
      const result = pruneDeliveries(deliveries, deliveryByBatch, {
        ...options,
        now: options.now ?? clock.now()
      });
      if (result.removed) persist();
      return result;
    }
  };

  function persist() {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const body = {
      version: RELAY_STORE_VERSION,
      updatedAt: clock.now(),
      deliveries: [...deliveries.values()].map(snapshotDelivery)
    };
    const tmpPath = `${filePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(body, null, 2)}\n`);
    fs.renameSync(tmpPath, filePath);
  }
}

function loadStoreFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return {
      version: RELAY_STORE_VERSION,
      deliveries: []
    };
  }

  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  if (raw.version !== RELAY_STORE_VERSION) {
    throw new Error(
      `unsupported relay store version: ${raw.version ?? "missing"}`
    );
  }
  if (!Array.isArray(raw.deliveries)) {
    throw new Error("relay store deliveries must be an array");
  }
  return raw;
}
