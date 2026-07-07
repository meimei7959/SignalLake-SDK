export function createMemoryQueue(options = {}) {
  const maxSize = options.maxSize ?? 1000;
  const items = [];

  return {
    enqueue(event) {
      if (items.length >= maxSize) {
        throw new Error(`SignalLake queue full: maxSize=${maxSize}`);
      }
      items.push(structuredClone(event));
      return items.length;
    },
    drain(limit = items.length) {
      return items.splice(0, limit);
    },
    snapshot() {
      return items.map((item) => structuredClone(item));
    },
    clear() {
      items.length = 0;
    },
    size() {
      return items.length;
    }
  };
}
