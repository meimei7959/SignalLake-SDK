export function createRelayMetrics(options = {}) {
  const now = options.now ?? (() => new Date().toISOString());
  const startedAt = now();
  const counters = new Map();

  return {
    increment(name, value = 1) {
      counters.set(name, (counters.get(name) ?? 0) + value);
    },
    snapshot() {
      return {
        startedAt,
        updatedAt: now(),
        counters: Object.fromEntries([...counters.entries()].sort())
      };
    },
    toPrometheus() {
      return [...counters.entries()]
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([name, value]) => `signallake_${name.replaceAll(".", "_")} ${value}`)
        .join("\n") + "\n";
    }
  };
}
