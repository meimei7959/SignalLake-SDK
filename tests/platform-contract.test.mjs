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
