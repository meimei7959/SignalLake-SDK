import { execFileSync, spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const root = path.resolve(new URL("../..", import.meta.url).pathname);
const androidRoot = path.join(root, "sdk/android");
const packageName = "dev.signallake.demo";
const activityName = "dev.signallake.demo/.StressDemoActivity";
const statusPath = "files/signallake-demo-status.txt";
const adb = findAdb();

run("gradle", ["-p", androidRoot, ":signallake-stress-demo:installDebug"], { stdio: "inherit" });
run(adb, ["shell", "am", "force-stop", packageName]);
run(adb, ["shell", "am", "start", "-n", activityName]);
waitForStatus("STATUS ready", 30000);

tapButton("Clear");
const cleared = waitForStatus("STATUS cleared", 30000);

tapButton("Run Offline");
const offline = waitForStatus("STATUS offline_done", 90000);
assertField(offline, "plaintextLeak", "false");
assertNumber(offline, "diskBatches", 1, 40);
assertNumber(offline, "diskBytes", 1, 1024 * 1024);
assertNumber(offline, "maxInFlight", 1, 1);

tapButton("Recover");
const recovered = waitForStatus("STATUS recover_done", 90000);
assertField(recovered, "diskBatches", "0");
assertField(recovered, "plaintextLeak", "false");
assertNumber(recovered, "uploads", 1, Number.MAX_SAFE_INTEGER);
assertNumber(recovered, "maxInFlight", 1, 1);

tapButton("Run Slow");
const slow = waitForStatus("STATUS slow_done", 90000);
assertField(slow, "plaintextLeak", "false");
assertNumber(slow, "maxInFlight", 1, 1);

console.log("android-click-test ok");
console.log(cleared);
console.log(offline);
console.log(recovered);
console.log(slow);

function tapButton(label) {
  const bounds = findButtonBounds(label);
  const x = Math.floor((bounds.left + bounds.right) / 2);
  const y = Math.floor((bounds.top + bounds.bottom) / 2);
  run(adb, ["shell", "input", "tap", String(x), String(y)]);
}

function findButtonBounds(label) {
  for (let attempt = 0; attempt < 20; attempt++) {
    run(adb, ["shell", "uiautomator", "dump", "/sdcard/signallake-window.xml"], { quiet: true });
    const xml = execFileSync(adb, ["exec-out", "cat", "/sdcard/signallake-window.xml"], { encoding: "utf8" });
    for (const node of xml.match(/<node [^>]+>/g) || []) {
      if (!node.includes(`text="${escapeXml(label)}"`)) continue;
      const match = node.match(/bounds="\[(\d+),(\d+)]\[(\d+),(\d+)]"/);
      if (!match) continue;
      return {
        left: Number(match[1]),
        top: Number(match[2]),
        right: Number(match[3]),
        bottom: Number(match[4])
      };
    }
    sleep(500);
  }
  throw new Error(`button not found: ${label}`);
}

function waitForStatus(token, timeoutMs) {
  const deadline = Date.now() + timeoutMs;
  let last = "";
  while (Date.now() < deadline) {
    last = readStatus();
    if (last.includes(token)) return last;
    sleep(500);
  }
  throw new Error(`timed out waiting for ${token}; last=${last}`);
}

function readStatus() {
  const result = spawnSync(adb, ["shell", "run-as", packageName, "cat", statusPath], { encoding: "utf8" });
  return (result.stdout || "").trim();
}

function assertField(status, name, expected) {
  const value = field(status, name);
  if (value !== expected) {
    throw new Error(`${name} expected ${expected}, got ${value}; status=${status}`);
  }
}

function assertNumber(status, name, min, max) {
  const value = Number(field(status, name));
  if (!Number.isFinite(value) || value < min || value > max) {
    throw new Error(`${name} expected ${min}..${max}, got ${value}; status=${status}`);
  }
}

function field(status, name) {
  const match = status.match(new RegExp(`(?:^| )${name}=([^ ]+)`));
  if (!match) throw new Error(`missing ${name}; status=${status}`);
  return match[1];
}

function run(command, args, options = {}) {
  const result = spawnSync(command, args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.stdio || (options.quiet ? "ignore" : "pipe")
  });
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} failed: ${result.stderr || result.stdout || result.status}`);
  }
  return result.stdout || "";
}

function findAdb() {
  const sdk = process.env.ANDROID_HOME
    || process.env.ANDROID_SDK_ROOT
    || path.join(os.homedir(), "Library/Android/sdk");
  const candidate = path.join(sdk, "platform-tools/adb");
  if (fs.existsSync(candidate)) return candidate;
  return "adb";
}

function escapeXml(value) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("\"", "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}
