import fs from "node:fs/promises";
import path from "node:path";

export const SignalLakeDropPolicy = Object.freeze({
  DROP_OLDEST: "DROP_OLDEST",
  DROP_NEWEST: "DROP_NEWEST"
});

export function createStoragePolicy(options = {}) {
  return {
    maxDiskBytes: positiveNumber(options.maxDiskBytes ?? 1024 * 1024, "maxDiskBytes"),
    maxDiskBatches: positiveNumber(options.maxDiskBatches ?? 100, "maxDiskBatches"),
    dropPolicy: Object.values(SignalLakeDropPolicy).includes(options.dropPolicy)
      ? options.dropPolicy
      : SignalLakeDropPolicy.DROP_OLDEST
  };
}

export function createDiskEncryptedBatchQueue(options = {}) {
  const directory = options.directory;
  if (typeof directory !== "string" || directory.length < 1) {
    throw new TypeError("directory must be a non-empty string");
  }
  const policy = createStoragePolicy(options.policy);

  return {
    directory,
    policy,
    async enqueue(encryptedBatch) {
      const json = JSON.stringify(encryptedBatch);
      const bytes = Buffer.byteLength(json, "utf8");
      if (bytes > policy.maxDiskBytes) return null;
      await fs.mkdir(directory, { recursive: true });
      if (!(await makeRoom(directory, policy, bytes))) return null;
      const file = path.join(directory, fileName(encryptedBatch.batchId));
      const temp = `${file}.tmp`;
      await fs.writeFile(temp, json, "utf8");
      await fs.rename(temp, file);
      await enforceBatchLimit(directory, policy);
      return { file, batch: structuredClone(encryptedBatch) };
    },
    async peek() {
      const files = await batchFiles(directory);
      for (const file of files) {
        try {
          const batch = JSON.parse(await fs.readFile(file, "utf8"));
          return { file, batch };
        } catch {
          await removeQuietly(file);
        }
      }
      return null;
    },
    async delete(pendingBatch) {
      if (pendingBatch?.file) await removeQuietly(pendingBatch.file);
    },
    async count() {
      return (await batchFiles(directory)).length;
    },
    async sizeBytes() {
      return sizeBytes(directory);
    }
  };
}

async function makeRoom(directory, policy, incomingBytes) {
  if (policy.dropPolicy === SignalLakeDropPolicy.DROP_NEWEST) {
    return (await count(directory)) < policy.maxDiskBatches && (await sizeBytes(directory)) + incomingBytes <= policy.maxDiskBytes;
  }
  while ((await count(directory)) >= policy.maxDiskBatches || (await sizeBytes(directory)) + incomingBytes > policy.maxDiskBytes) {
    const [oldest] = await batchFiles(directory);
    if (!oldest) return false;
    await removeQuietly(oldest);
  }
  return true;
}

async function enforceBatchLimit(directory, policy) {
  while ((await count(directory)) > policy.maxDiskBatches) {
    const [oldest] = await batchFiles(directory);
    if (!oldest) return;
    await removeQuietly(oldest);
  }
}

async function count(directory) {
  return (await batchFiles(directory)).length;
}

async function sizeBytes(directory) {
  let total = 0;
  for (const file of await batchFiles(directory)) {
    total += (await fs.stat(file)).size;
  }
  return total;
}

async function batchFiles(directory) {
  let entries;
  try {
    entries = await fs.readdir(directory, { withFileTypes: true });
  } catch (error) {
    if (error?.code === "ENOENT") return [];
    throw error;
  }
  return entries
    .filter((entry) => entry.isFile() && entry.name.endsWith(".batch"))
    .map((entry) => path.join(directory, entry.name))
    .sort();
}

async function removeQuietly(file) {
  try {
    await fs.rm(file, { force: true });
  } catch {
    // Analytics cache cleanup must not destabilize host code.
  }
}

function fileName(batchId) {
  return `${String(Date.now()).padStart(13, "0")}-${sanitize(String(batchId))}.batch`;
}

function sanitize(value) {
  return value.replace(/[^a-zA-Z0-9_-]/g, "_");
}

function positiveNumber(value, name) {
  if (!Number.isFinite(value) || value < 1) throw new TypeError(`${name} must be positive`);
  return value;
}
