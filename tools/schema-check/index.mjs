import path from "node:path";
import { listJsonFiles, readJson } from "../lib/load-json.mjs";

const schemaFiles = listJsonFiles("schemas");
const requiredFiles = new Set([
  "schemas/common-properties.v1.json",
  "schemas/event-envelope.v1.json",
  "schemas/event-batch.v1.json",
  "schemas/encrypted-event-batch.v1.json",
  "schemas/event-manifest.v1.json",
  "schemas/event-catalog.v1.json",
  "schemas/privacy-rules.v1.json"
]);

const errors = [];
for (const file of requiredFiles) {
  if (!schemaFiles.includes(file)) {
    errors.push(`${file}: missing`);
  }
}

for (const file of schemaFiles) {
  const json = readJson(file);
  if (!json.$schema) {
    errors.push(`${file}: missing $schema`);
  }
  if (file !== "schemas/privacy-rules.v1.json") {
    if (!json.$id) errors.push(`${file}: missing $id`);
    if (!json.title) errors.push(`${file}: missing title`);
    if (json.type !== "object") errors.push(`${file}: top-level type must be object`);
  }
}

const privacyRules = readJson("schemas/privacy-rules.v1.json");
const policy = privacyRules.eventPropertyPolicy;
if (privacyRules.version !== "signallake.privacy-rules.v1") {
  errors.push("schemas/privacy-rules.v1.json: unexpected version");
}
for (const key of [
  "allowedValueTypes",
  "forbiddenPropertyNames",
  "forbiddenNamePatterns",
  "forbiddenStringValuePatterns"
]) {
  if (!Array.isArray(policy?.[key])) {
    errors.push(`schemas/privacy-rules.v1.json: ${key} must be an array`);
  }
}

const batch = readJson("schemas/event-batch.v1.json");
const ref = batch.properties?.events?.items?.$ref;
if (ref !== path.basename("schemas/event-envelope.v1.json")) {
  errors.push("schemas/event-batch.v1.json: events.items must reference event-envelope.v1.json");
}

const commonProperties = readJson("schemas/common-properties.v1.json");
if (commonProperties["x-signallake-version"] !== "signallake.common-fields.v1") {
  errors.push("schemas/common-properties.v1.json: unexpected common fields version");
}
if (commonProperties["x-signallake-naming"] !== "camelCase") {
  errors.push("schemas/common-properties.v1.json: common fields must use camelCase");
}
for (const field of [
  "channelId",
  "channelName",
  "buildId",
  "versionCode",
  "distribution",
  "locale",
  "timezone",
  "networkType",
  "deviceTier",
  "osVersion",
  "appForeground",
  "sessionDurationBucket",
  "durationBucket",
  "outcome",
  "errorCode",
  "screenId",
  "commandId",
  "protocol",
  "playerBackend",
  "mediaKind"
]) {
  if (!commonProperties.properties?.[field]) {
    errors.push(`schemas/common-properties.v1.json: missing ${field}`);
  }
}
const envelopePropertyRefs =
  readJson("schemas/event-envelope.v1.json")
    .properties?.event?.properties?.properties?.allOf ?? [];
if (!envelopePropertyRefs.some((entry) => entry.$ref === "common-properties.v1.json")) {
  errors.push("schemas/event-envelope.v1.json: event.properties must reference common-properties.v1.json");
}

const encryptedBatch = readJson("schemas/encrypted-event-batch.v1.json");
if (encryptedBatch.properties?.plaintext?.properties?.schemaVersion?.const !== "signallake.event-batch.v1") {
  errors.push("schemas/encrypted-event-batch.v1.json: plaintext schema must be event-batch.v1");
}
if (encryptedBatch.properties?.encryption?.properties?.alg?.const !== "AES-256-GCM") {
  errors.push("schemas/encrypted-event-batch.v1.json: encryption alg must be AES-256-GCM");
}

const manifest = readJson("schemas/event-manifest.v1.json");
if (manifest.properties?.events?.items?.properties?.name?.pattern !== "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+$") {
  errors.push("schemas/event-manifest.v1.json: event name pattern must match envelope event.name");
}
if (!manifest.required?.includes("catalogVersion")) {
  errors.push("schemas/event-manifest.v1.json: catalogVersion is required");
}

const catalog = readJson("schemas/event-catalog.v1.json");
if (catalog.properties?.events?.items?.properties?.name?.pattern !== "^[a-z][a-z0-9]*(\\.[a-z][a-z0-9]*)+$") {
  errors.push("schemas/event-catalog.v1.json: event name pattern must match envelope event.name");
}

const envelope = readJson("schemas/event-envelope.v1.json");
if (!envelope.required?.includes("catalogVersion")) {
  errors.push("schemas/event-envelope.v1.json: catalogVersion is required");
}

if (errors.length) {
  console.error("schema-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`schema-check ok: ${schemaFiles.length} contract files checked`);
