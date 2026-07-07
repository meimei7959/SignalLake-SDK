import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../lib/load-json.mjs";

const common = readJson("schemas/common-properties.v1.json");
const errors = [];

const requiredFields = [
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
];

if (common["x-signallake-version"] !== "signallake.common-fields.v1") {
  errors.push("common-properties: missing common field version");
}
if (common["x-signallake-naming"] !== "camelCase") {
  errors.push("common-properties: naming must be camelCase");
}
for (const field of requiredFields) {
  if (!common.properties?.[field]) errors.push(`common-properties: missing ${field}`);
}

const envelope = readJson("schemas/event-envelope.v1.json");
const refs = envelope.properties?.event?.properties?.properties?.allOf ?? [];
if (!refs.some((entry) => entry.$ref === "common-properties.v1.json")) {
  errors.push("event-envelope: event.properties must allOf common-properties.v1.json");
}

const manifest = readJson("schemas/event-manifest.v1.json");
const manifestProperty =
  manifest.properties?.events?.items?.properties?.properties?.items;
if (!manifestProperty?.required?.includes("scope")) {
  errors.push("event-manifest: property scope is required");
}

const jsCommon = read("sdk/js/core/src/common-fields.mjs");
const jsBuilder = read("sdk/js/core/src/event-builder.mjs");
const androidFields = read("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeCommonFields.java");
const androidValues = read("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeCommonValues.java");
const androidProperties = read("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeProperties.java");
const androidBuilder = read("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeEventBuilder.java");

for (const field of requiredFields) {
  if (!jsCommon.includes(`${field}:`)) errors.push(`JS common-fields: missing ${field}`);
  const constantName = camelToConstant(field);
  if (!androidFields.includes(`${constantName} = "${field}"`)) {
    errors.push(`Android SignalLakeCommonFields: missing ${constantName}`);
  }
}

for (const token of [
  "validateCommonProperties(properties)",
  "buildCommonProperties",
  "SignalLakeCommonValues"
]) {
  if (!jsCommon.includes(token) && !jsBuilder.includes(token)) {
    errors.push(`JS common governance: missing ${token}`);
  }
}

for (const token of [
  "CommonPropertyValidator.assertValid(safeProperties)",
  "SignalLakeProperties",
  "SignalLakeCommonValues",
  "putProductField"
]) {
  const haystack = `${androidBuilder}\n${androidProperties}\n${androidValues}`;
  if (!haystack.includes(token)) errors.push(`Android common governance: missing ${token}`);
}

const docs = read("docs/event-taxonomy/common-fields.md");
for (const token of [
  "scope: \"common\"",
  "scope: \"product\"",
  "channelId",
  "deprecation",
  "SignalLakeProperties.builder()"
]) {
  if (!docs.includes(token)) errors.push(`common fields docs: missing ${token}`);
}

if (errors.length) {
  console.error("common-fields-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`common-fields-check ok: ${requiredFields.length} common fields governed across schema, JS, Android, docs, and manifest lint`);

function read(file) {
  return fs.readFileSync(path.join(repoRoot, file), "utf8");
}

function camelToConstant(name) {
  return name.replace(/[A-Z]/g, (match) => `_${match}`).toUpperCase();
}
