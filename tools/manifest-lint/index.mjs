import { listJsonFiles, readJson } from "../lib/load-json.mjs";
import { validateSchema } from "../lib/json-schema-subset.mjs";

const manifestSchema = readJson("schemas/event-manifest.v1.json");
const commonPropertiesSchema = readJson("schemas/common-properties.v1.json");
const privacyRules = readJson("schemas/privacy-rules.v1.json");
const manifestFiles = listJsonFiles("fixtures/manifests");
const errors = [];
const commonProperties = commonPropertiesSchema.properties ?? {};
const deprecatedAliases = new Map([
  ["channel", "channelId"],
  ["version", "appVersion"],
  ["network", "networkType"]
]);
const baseEvents = new Set([
  "app.opened",
  "app.closed",
  "session.started",
  "session.ended",
  "screen.viewed",
  "command.invoked",
  "error.occurred",
  "cast.started",
  "cast.failed",
  "receiver.discovered"
]);

for (const file of manifestFiles) {
  const manifest = readJson(file);
  const findings = validateManifest(manifest);
  if (findings.length) {
    errors.push(`${file}: ${findings.join("; ")}`);
  }
}

if (manifestFiles.length < 2) {
  errors.push("fixtures/manifests: expected at least two sample manifests");
}

if (errors.length) {
  console.error("manifest-lint failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`manifest-lint ok: ${manifestFiles.length} manifests checked`);

function validateManifest(manifest) {
  const findings = validateSchema(manifestSchema, manifest);
  const eventNames = new Set();
  const forbiddenPropertyNames = new Set(
    privacyRules.eventPropertyPolicy.forbiddenPropertyNames.map((name) =>
      name.toLowerCase()
    )
  );
  const forbiddenPatterns = privacyRules.eventPropertyPolicy.forbiddenNamePatterns.map(
    (pattern) => new RegExp(pattern, "i")
  );

  for (const event of manifest.events ?? []) {
    if (eventNames.has(event.name)) {
      findings.push(`${event.name}: duplicate event name`);
    }
    eventNames.add(event.name);

    if (!baseEvents.has(event.name) && !isProductSpecific(event.name)) {
      findings.push(`${event.name}: not base event and not product-specific enough`);
    }

    const propertyNames = new Set();
    for (const property of event.properties ?? []) {
      if (propertyNames.has(property.name)) {
        findings.push(`${event.name}.${property.name}: duplicate property`);
      }
      propertyNames.add(property.name);

      const commonDefinition = commonProperties[property.name];
      if (deprecatedAliases.has(property.name)) {
        findings.push(
          `${event.name}.${property.name}: deprecated alias, use ${deprecatedAliases.get(property.name)}`
        );
      }
      if (commonDefinition) {
        if (property.scope !== "common") {
          findings.push(`${event.name}.${property.name}: SDK common field must use scope=common`);
        }
        if (property.type !== commonDefinition.type) {
          findings.push(
            `${event.name}.${property.name}: type must match common registry type ${commonDefinition.type}`
          );
        }
        if (Array.isArray(commonDefinition.enum)) {
          const allowed = new Set(commonDefinition.enum);
          for (const value of property.enum ?? commonDefinition.enum) {
            if (!allowed.has(value)) {
              findings.push(`${event.name}.${property.name}: enum value ${value} is not in common registry`);
            }
          }
        }
      } else if (property.scope === "common") {
        findings.push(`${event.name}.${property.name}: scope=common but field is not in common registry`);
      }

      const normalized = property.name.toLowerCase();
      if (forbiddenPropertyNames.has(normalized)) {
        findings.push(`${event.name}.${property.name}: forbidden property name`);
      }
      if (forbiddenPatterns.some((pattern) => pattern.test(property.name))) {
        findings.push(`${event.name}.${property.name}: forbidden property name pattern`);
      }
    }
  }

  return findings;
}

function isProductSpecific(eventName) {
  return /^[a-z][a-z0-9]+\\.[a-z][a-z0-9]+$/.test(eventName);
}
