import path from "node:path";
import { listJsonFiles, readJson } from "../lib/load-json.mjs";
import { validateSchema } from "../lib/json-schema-subset.mjs";
import { checkEventPrivacy } from "../lib/privacy-check.mjs";
import {
  assertCatalogMatchesSource,
  normalizeEventCatalog,
  validateRegisteredEvent
} from "../../sdk/js/core/src/event-catalog.mjs";

const envelopeSchema = readJson("schemas/event-envelope.v1.json");
const commonPropertiesSchema = readJson("schemas/common-properties.v1.json");
const batchSchema = readJson("schemas/event-batch.v1.json");
const encryptedBatchSchema = readJson("schemas/encrypted-event-batch.v1.json");
const privacyRules = readJson("schemas/privacy-rules.v1.json");
const catalogs = new Map(
  listJsonFiles("catalogs").map((file) => {
    const catalog = normalizeEventCatalog(readJson(file));
    return [catalog.catalogVersion, catalog];
  })
);
const schemas = new Map([
  ["event-envelope.v1.json", envelopeSchema],
  ["common-properties.v1.json", commonPropertiesSchema]
]);

const errors = [];
const stats = {
  validEvents: 0,
  invalidEvents: 0,
  validBatches: 0,
  invalidBatches: 0,
  validUploads: 0,
  invalidUploads: 0
};

for (const file of listJsonFiles("fixtures/events")) {
  const event = readJson(file);
  const expectedValid = path.basename(file).startsWith("valid-");
  const findings = validateEvent(event);
  assertExpected(file, expectedValid, findings);
  if (expectedValid) stats.validEvents += 1;
  else stats.invalidEvents += 1;
}

for (const file of listJsonFiles("fixtures/batches")) {
  const batch = readJson(file);
  const expectedValid = path.basename(file).startsWith("valid-");
  const findings = validateBatch(batch);
  assertExpected(file, expectedValid, findings);
  if (expectedValid) stats.validBatches += 1;
  else stats.invalidBatches += 1;
}

for (const file of listJsonFiles("fixtures/uploads")) {
  const upload = readJson(file);
  const expectedValid = path.basename(file).startsWith("valid-");
  const findings = validateUpload(upload);
  assertExpected(file, expectedValid, findings);
  if (expectedValid) stats.validUploads += 1;
  else stats.invalidUploads += 1;
}

if (errors.length) {
  console.error("fixture-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `fixture-check ok: valid events=${stats.validEvents}, invalid events=${stats.invalidEvents}, valid batches=${stats.validBatches}, invalid batches=${stats.invalidBatches}, valid uploads=${stats.validUploads}, invalid uploads=${stats.invalidUploads}`
);

function validateEvent(event) {
  return [
    ...validateSchema(envelopeSchema, event, { schemas }),
    ...checkEventPrivacy(event, privacyRules),
    ...checkEventCatalog(event)
  ];
}

function validateBatch(batch) {
  const findings = validateSchema(batchSchema, batch, { schemas });
  if (batch.eventCount !== batch.events?.length) {
    findings.push("$.eventCount: must match events.length");
  }
  for (const [index, event] of (batch.events ?? []).entries()) {
    for (const finding of validateEvent(event)) {
      findings.push(`$.events[${index}] ${finding}`);
    }
  }
  return findings;
}

function validateUpload(upload) {
  if (upload.schemaVersion === "signallake.event-batch.v1") {
    return ["$: plaintext event-batch.v1 is not accepted for upload"];
  }
  return validateSchema(encryptedBatchSchema, upload);
}

function assertExpected(file, expectedValid, findings) {
  if (expectedValid && findings.length) {
    errors.push(`${file}: expected valid but failed: ${findings.join("; ")}`);
  }
  if (!expectedValid && findings.length === 0) {
    errors.push(`${file}: expected invalid but passed`);
  }
}

function checkEventCatalog(event) {
  const findings = [];
  const catalogVersion = event?.catalogVersion;
  const catalog = catalogs.get(catalogVersion);
  if (!catalog) {
    return [`$.catalogVersion: unknown catalog ${catalogVersion}`];
  }
  try {
    assertCatalogMatchesSource(catalog, event.source);
    validateRegisteredEvent(catalog, {
      name: event.event?.name,
      category: event.event?.category,
      privacyClass: event.privacy?.privacyClass,
      properties: event.event?.properties ?? {}
    });
  } catch (error) {
    findings.push(`$.event: ${error.message}`);
  }
  return findings;
}
