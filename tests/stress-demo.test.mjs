import test from "node:test";
import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

test("Tauri stress demo validates bounded encrypted disk queue under pressure", async () => {
  const { stdout } = await execFileAsync(
    process.execPath,
    ["demos/stress/tauri-stress-demo.mjs"],
    {
      cwd: "/Users/meimei/Documents/SignalLake-SDK",
      env: {
        ...process.env,
        SIGNALLAKE_STRESS_EVENTS: "200",
        SIGNALLAKE_STRESS_MAX_BATCHES: "12",
        SIGNALLAKE_STRESS_BATCH_SIZE: "5"
      }
    }
  );
  const report = JSON.parse(stdout);

  assert.equal(report.ok, true);
  assert.equal(report.result.plaintextLeaked, false);
  assert.ok(report.result.offlineCount <= 12);
  assert.ok(report.result.offlineBytes <= report.result.maxDiskBytes);
  assert.equal(report.result.slowInFlightMax, 1);
  assert.equal(report.result.remainingCount, 0);
});
