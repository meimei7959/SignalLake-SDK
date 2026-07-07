import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../lib/load-json.mjs";

const errors = [];

const requiredFiles = [
  "Dockerfile",
  ".dockerignore",
  "deploy/pilot/docker-compose.yaml",
  "deploy/pilot/.env.example",
  "deploy/README.md",
  "docs/operations/env-contract.md",
  "docs/deployment/pilot-delivery.md",
  "relay/service/src/config.mjs",
  "relay/service/src/healthcheck.mjs",
  "relay/service/src/file-relay-store.mjs",
  "relay/service/migrations/0001-file-relay-store-v1.md"
];

for (const file of requiredFiles) {
  if (!fs.existsSync(path.join(repoRoot, file))) {
    errors.push(`${file}: missing`);
  }
}

const packageJson = readJson("package.json");
for (const scriptName of ["relay:dev", "relay:healthcheck", "delivery-check"]) {
  if (!packageJson.scripts?.[scriptName]) {
    errors.push(`package.json: missing script ${scriptName}`);
  }
}

mustContain("Dockerfile", [
  "HEALTHCHECK",
  "relay/service/src/server.mjs",
  "USER node"
]);
mustContain("deploy/pilot/docker-compose.yaml", [
  "SIGNALLAKE_RELAY_STORE_PATH",
  "SIGNALLAKE_RELAY_TOKEN",
  "4318"
]);
mustContain("deploy/pilot/.env.example", [
  "SIGNALLAKE_RELAY_TOKEN",
  "SIGNALLAKE_RELAY_STORE_PATH",
  "SIGNALLAKE_RELAY_RETENTION_MS"
]);
mustContain("docs/operations/env-contract.md", [
  "PORT",
  "SIGNALLAKE_RELAY_STORE_PATH",
  "SIGNALLAKE_RELAY_TOKEN",
  "SIGNALLAKE_RELAY_MAX_ATTEMPTS",
  "SIGNALLAKE_RELAY_RETENTION_MS"
]);

if (errors.length) {
  console.error("delivery-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`delivery-check ok: ${requiredFiles.length} delivery assets checked`);

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
