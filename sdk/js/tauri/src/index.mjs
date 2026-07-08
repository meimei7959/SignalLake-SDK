import {
  buildBatch,
  createEventBuilder,
  createDiskEncryptedBatchQueue,
  createMemoryQueue,
  encryptBatch,
  normalizeEncryptionKey
} from "../../core/src/index.mjs";

export function createTauriSignalLake(options) {
  const builder = createEventBuilder(options);
  const queue = options.queue ?? createMemoryQueue(options.queueOptions);
  const diskQueue =
    options.diskQueue ??
    (options.diskQueueDirectory
      ? createDiskEncryptedBatchQueue({
          directory: options.diskQueueDirectory,
          policy: options.storagePolicy
        })
      : null);

  return {
    queue,
    diskQueue,
    trackAppOpened(properties = {}) {
      return enqueue(
        builder.buildEvent({
          name: "app.opened",
          category: "lifecycle",
          properties,
          privacyClass: "behavioral"
        })
      );
    },
    trackScreenViewed(screenId, properties = {}) {
      return enqueue(
        builder.buildEvent({
          name: "screen.viewed",
          category: "screen",
          properties: {
            screenId,
            ...properties
          },
          privacyClass: "behavioral"
        })
      );
    },
    trackCommandInvoked(commandId, properties = {}) {
      return enqueue(
        builder.buildEvent({
          name: "command.invoked",
          category: "command",
          properties: {
            commandId,
            ...properties
          },
          privacyClass: "behavioral"
        })
      );
    },
    trackErrorOccurred(errorCode, properties = {}) {
      return enqueue(
        builder.buildEvent({
          name: "error.occurred",
          category: "error",
          properties: {
            errorCode,
            ...properties
          },
          privacyClass: "diagnostic"
        })
      );
    },
    drainBatch(limit = 500) {
      const events = queue.drain(limit);
      if (!events.length) return null;
      return buildBatch({ source: options.source, events });
    },
    async drainEncryptedBatch(limit = 500, encryption = options.encryption) {
      normalizeEncryptionKey(encryption);
      if (diskQueue) {
        const events = queue.drain(limit);
        if (events.length) {
          const batch = buildBatch({ source: options.source, events });
          const encrypted = await encryptBatch(batch, encryption);
          await diskQueue.enqueue(encrypted);
        }
        const pending = await diskQueue.peek();
        if (pending) return pending.batch;
        return null;
      }
      const events = queue.drain(limit);
      if (!events.length) return null;
      const batch = buildBatch({ source: options.source, events });
      const encrypted = await encryptBatch(batch, encryption);
      if (diskQueue) await diskQueue.enqueue(encrypted);
      return encrypted;
    },
    async ackEncryptedBatch(encryptedBatch) {
      if (!diskQueue || !encryptedBatch) return false;
      const pending = await diskQueue.peek();
      if (!pending || pending.batch.batchId !== encryptedBatch.batchId) return false;
      await diskQueue.delete(pending);
      return true;
    }
  };

  function enqueue(event) {
    queue.enqueue(event);
    return event;
  }
}
