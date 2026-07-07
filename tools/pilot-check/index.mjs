import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../lib/load-json.mjs";

const errors = [];
const eventMap = readJson("pilots/picpeek/event-map.json");
const manifest = readJson(eventMap.manifest);
const manifestEvents = new Set(manifest.events.map((event) => event.name));

for (const event of eventMap.events ?? []) {
  if (!manifestEvents.has(event.name)) {
    errors.push(`pilots/picpeek/event-map.json: ${event.name} missing from manifest`);
  }
}

for (const file of [
  "pilots/picpeek/run-dry-run.mjs",
  "pilots/picpeek/pilot-report.md",
  "pilots/picpeek/integration-plan.md",
  "tests/picpeek-pilot.test.mjs"
]) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    errors.push(`${file}: missing`);
  }
}

mustContain("pilots/picpeek/run-dry-run.mjs", [
  "trackAppOpened",
  "trackScreenViewed",
  "trackCommandInvoked",
  "trackErrorOccurred",
  "drainEncryptedBatch",
  "uploadPayload",
  "folderPath",
  "clipboardText",
  "createRelayService"
]);

if (errors.length) {
  console.error("pilot-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`pilot-check ok: ${eventMap.events.length} PicPeek events mapped`);

function mustContain(file, needles) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) return;
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const needle of needles) {
    if (!content.includes(needle)) {
      errors.push(`${file}: missing ${needle}`);
    }
  }
}
