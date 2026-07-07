import fs from "node:fs";
import { listJsonFiles, readJson, repoRoot } from "../lib/load-json.mjs";
import { validateSchema } from "../lib/json-schema-subset.mjs";

const catalogSchema = readJson("schemas/event-catalog.v1.json");
const manifestSchema = readJson("schemas/event-manifest.v1.json");
const commonPropertiesSchema = readJson("schemas/common-properties.v1.json");
const privacyRules = readJson("schemas/privacy-rules.v1.json");
const schemas = new Map([
  ["event-catalog.v1.json", catalogSchema],
  ["event-manifest.v1.json", manifestSchema]
]);
const errors = [];
const catalogFiles = listJsonFiles("catalogs");
const catalogVersions = new Set();
const commonProperties = commonPropertiesSchema.properties ?? {};
const forbiddenPropertyNames = new Set(
  privacyRules.eventPropertyPolicy.forbiddenPropertyNames.map((name) => name.toLowerCase())
);
const forbiddenPatterns = privacyRules.eventPropertyPolicy.forbiddenNamePatterns.map(
  (pattern) => new RegExp(pattern, "i")
);

for (const file of catalogFiles) {
  const catalog = readJson(file);
  const findings = validateCatalog(file, catalog);
  if (findings.length) errors.push(`${file}: ${findings.join("; ")}`);
}

if (catalogFiles.length < 2) {
  errors.push("catalogs: expected at least two product catalog snapshots");
}

if (errors.length) {
  console.error("catalog-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`catalog-check ok: ${catalogFiles.length} catalogs checked`);

function validateCatalog(file, catalog) {
  const findings = validateSchema(catalogSchema, catalog, { schemas });
  if (catalogVersions.has(catalog.catalogVersion)) {
    findings.push(`${catalog.catalogVersion}: duplicate catalogVersion`);
  }
  catalogVersions.add(catalog.catalogVersion);

  if (catalog.generatedFromManifest) {
    if (!fs.existsSync(new URL(`../../${catalog.generatedFromManifest}`, import.meta.url))) {
      findings.push(`generatedFromManifest ${catalog.generatedFromManifest} does not exist`);
    } else {
      findings.push(...validateAgainstManifest(catalog));
    }
  }

  const eventNames = new Set();
  for (const event of catalog.events ?? []) {
    if (eventNames.has(event.name)) findings.push(`${event.name}: duplicate event name`);
    eventNames.add(event.name);
    if (event.status === "removed" && !event.deprecatedSince) {
      findings.push(`${event.name}: removed event must declare deprecatedSince`);
    }

    const propertyNames = new Set();
    for (const property of event.properties ?? []) {
      if (propertyNames.has(property.name)) findings.push(`${event.name}.${property.name}: duplicate property`);
      propertyNames.add(property.name);
      findings.push(...validateProperty(event.name, property));
    }
  }

  return findings;
}

function validateAgainstManifest(catalog) {
  const manifest = readJson(catalog.generatedFromManifest);
  const findings = validateSchema(manifestSchema, manifest, { schemas });
  if (manifest.catalogVersion !== catalog.catalogVersion) {
    findings.push(`manifest catalogVersion ${manifest.catalogVersion} does not match catalog`);
  }
  if (manifest.product !== catalog.product) findings.push("manifest product does not match catalog");
  if (manifest.appId !== catalog.appId) findings.push("manifest appId does not match catalog");

  const manifestEvents = new Map((manifest.events ?? []).map((event) => [event.name, event]));
  const catalogEvents = new Map((catalog.events ?? []).map((event) => [event.name, event]));

  for (const event of manifest.events ?? []) {
    if (!catalogEvents.has(event.name)) {
      findings.push(`${event.name}: missing from catalog`);
      continue;
    }
    const catalogEvent = catalogEvents.get(event.name);
    for (const key of ["category", "privacyClass", "status", "owner", "since"]) {
      if (event[key] !== catalogEvent[key]) findings.push(`${event.name}: ${key} differs between manifest and catalog`);
    }
    const manifestProperties = new Map((event.properties ?? []).map((property) => [property.name, property]));
    const catalogProperties = new Map((catalogEvent.properties ?? []).map((property) => [property.name, property]));
    for (const property of event.properties ?? []) {
      const catalogProperty = catalogProperties.get(property.name);
      if (!catalogProperty) {
        findings.push(`${event.name}.${property.name}: missing from catalog`);
        continue;
      }
      for (const key of ["type", "scope", "required"]) {
        if (property[key] !== catalogProperty[key]) {
          findings.push(`${event.name}.${property.name}: ${key} differs between manifest and catalog`);
        }
      }
      if (JSON.stringify(property.enum ?? []) !== JSON.stringify(catalogProperty.enum ?? [])) {
        findings.push(`${event.name}.${property.name}: enum differs between manifest and catalog`);
      }
    }
    for (const property of catalogEvent.properties ?? []) {
      if (!manifestProperties.has(property.name)) findings.push(`${event.name}.${property.name}: missing from manifest`);
    }
  }
  for (const event of catalog.events ?? []) {
    if (!manifestEvents.has(event.name)) findings.push(`${event.name}: missing from manifest`);
  }
  return findings;
}

function validateProperty(eventName, property) {
  const findings = [];
  const commonDefinition = commonProperties[property.name];
  if (commonDefinition) {
    if (property.scope !== "common") {
      findings.push(`${eventName}.${property.name}: SDK common field must use scope=common`);
    }
    if (property.type !== commonDefinition.type) {
      findings.push(`${eventName}.${property.name}: type must match common registry type ${commonDefinition.type}`);
    }
    if (Array.isArray(commonDefinition.enum)) {
      const allowed = new Set(commonDefinition.enum);
      for (const value of property.enum ?? commonDefinition.enum) {
        if (!allowed.has(value)) {
          findings.push(`${eventName}.${property.name}: enum value ${value} is not in common registry`);
        }
      }
    }
  } else if (property.scope === "common") {
    findings.push(`${eventName}.${property.name}: scope=common but field is not in common registry`);
  }

  const normalized = property.name.toLowerCase();
  if (forbiddenPropertyNames.has(normalized)) {
    findings.push(`${eventName}.${property.name}: forbidden property name`);
  }
  if (forbiddenPatterns.some((pattern) => pattern.test(property.name))) {
    findings.push(`${eventName}.${property.name}: forbidden property name pattern`);
  }
  return findings;
}
