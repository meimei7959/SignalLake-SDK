import {
  buildBatch,
  createEventBuilder,
  createMemoryQueue,
  encryptBatch,
  normalizeEncryptionKey
} from "../../core/src/index.mjs";

export function createTauriSignalLake(options) {
  const builder = createEventBuilder(options);
  const queue = options.queue ?? createMemoryQueue(options.queueOptions);

  return {
    queue,
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
      const events = queue.drain(limit);
      if (!events.length) return null;
      const batch = buildBatch({ source: options.source, events });
      return encryptBatch(batch, encryption);
    }
  };

  function enqueue(event) {
    queue.enqueue(event);
    return event;
  }
}
