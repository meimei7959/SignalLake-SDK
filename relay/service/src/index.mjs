import { validateUploadBatch } from "./contract-validation.mjs";
import { createFileRelayStore } from "./file-relay-store.mjs";
import { createRelayMetrics } from "./metrics.mjs";
import { createInMemoryRelayStore } from "./relay-store.mjs";

export {
  createFileRelayStore,
  createInMemoryRelayStore,
  createRelayMetrics,
  validateUploadBatch
};

export function createRelayService(options = {}) {
  const store = options.store ?? createInMemoryRelayStore(options.storeOptions);
  const metrics = options.metrics ?? createRelayMetrics(options.metricsOptions);

  return {
    upload(batch) {
      const findings = validateUploadBatch(batch);
      if (findings.length) {
        metrics.increment("upload.rejected");
        metrics.increment("validation.findings", findings.length);
        return {
          ok: false,
          status: 422,
          errorCode: "SIGNALLAKE_BATCH_INVALID",
          findings
        };
      }
      const accepted = store.acceptBatch(batch);
      metrics.increment(accepted.duplicate ? "upload.duplicate" : "upload.accepted");
      return {
        ok: true,
        status: 202,
        ...accepted
      };
    },
    pull(limit) {
      const deliveries = store.pull(limit);
      metrics.increment("delivery.pull.requests");
      metrics.increment("delivery.pull.items", deliveries.length);
      return {
        ok: true,
        status: 200,
        deliveries
      };
    },
    ack(deliveryId) {
      const result = store.ack(deliveryId);
      metrics.increment(result.acked ? "delivery.ack" : "delivery.ack.not_found");
      return {
        ok: result.acked,
        status: result.acked ? 200 : 404,
        ...result
      };
    },
    nack(deliveryId) {
      const result = store.nack(deliveryId);
      metrics.increment(result.nacked ? "delivery.nack" : "delivery.nack.not_found");
      if (result.status === "dead_letter") metrics.increment("delivery.dead_letter");
      return {
        ok: result.nacked,
        status: result.nacked ? 200 : 404,
        ...result
      };
    },
    stats() {
      return store.stats();
    },
    ready() {
      return {
        ok: true,
        store: store.kind ?? "custom",
        stats: store.stats()
      };
    },
    metrics() {
      return metrics.snapshot();
    },
    metricsText() {
      return metrics.toPrometheus();
    },
    pruneRetention(options = {}) {
      const result = store.prune(options);
      metrics.increment("retention.pruned", result.removed);
      return {
        ok: true,
        status: 200,
        ...result
      };
    }
  };
}
