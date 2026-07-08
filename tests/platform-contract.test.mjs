import test from "node:test";
import assert from "node:assert/strict";
import { readJson } from "../tools/lib/load-json.mjs";

test("Phase 3 platform targets cover Rust Android and iOS", () => {
  const targets = readJson("contracts/platform-targets.v1.json");
  const ids = targets.targets.map((target) => target.id).sort();

  assert.deepEqual(ids, ["android", "ios", "rust-desktop"]);
});

test("Phase 3 platform targets require shared contract capabilities", () => {
  const targets = readJson("contracts/platform-targets.v1.json");
  for (const target of targets.targets) {
    assert.ok(target.requiredCapabilities.includes("event-builder"));
    assert.ok(target.requiredCapabilities.includes("privacy-filter"));
    assert.ok(target.requiredCapabilities.includes("memory-queue"));
    assert.ok(target.requiredCapabilities.includes("batch-builder"));
  }
});

test("all SDK platforms expose opt-in encrypted durable queue primitives", async () => {
  const fs = await import("node:fs");
  const path = await import("node:path");
  const root = "/Users/meimei/Documents/SignalLake-SDK";
  const ios = fs.readFileSync(path.join(root, "sdk/ios/Sources/SignalLake/SignalLake.swift"), "utf8");
  const rust = fs.readFileSync(path.join(root, "sdk/rust/signallake-core/src/lib.rs"), "utf8");
  const js = fs.readFileSync(path.join(root, "sdk/js/core/src/disk-encrypted-batch-queue.mjs"), "utf8");
  const tauri = fs.readFileSync(path.join(root, "sdk/js/tauri/src/index.mjs"), "utf8");

  assert.match(ios, /DiskEncryptedBatchQueue/);
  assert.match(ios, /SignalLakeStoragePolicy/);
  assert.match(ios, /isExcludedFromBackup = true/);
  assert.match(rust, /DiskEncryptedBatchQueue/);
  assert.match(rust, /StoragePolicy/);
  assert.match(rust, /encrypted_batch_to_json/);
  assert.match(js, /createDiskEncryptedBatchQueue/);
  assert.match(js, /SignalLakeDropPolicy/);
  assert.match(tauri, /diskQueueDirectory/);
  assert.match(tauri, /ackEncryptedBatch/);
});
