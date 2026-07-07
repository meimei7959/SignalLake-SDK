import fs from "node:fs";
import path from "node:path";
import { repoRoot } from "../lib/load-json.mjs";

const moduleRoot = "sdk/android/signallake-android";
const sourceRoot = `${moduleRoot}/src/main/java/dev/signallake`;
const errors = [];

mustContain("sdk/android/settings.gradle.kts", [
  "pluginManagement",
  "include(\":signallake-android\")"
]);
mustContain("sdk/android/build.gradle.kts", ["com.android.library"]);
mustContain(`${moduleRoot}/build.gradle.kts`, [
  "com.android.library",
  "namespace = \"dev.signallake\"",
  "minSdk = 19",
  "consumerProguardFiles"
]);
mustContain(`${moduleRoot}/consumer-rules.pro`, [
  "SignalLakeClient",
  "SignalLakeConfig"
]);

for (const file of [
  "SignalLakeClient.java",
  "NoopSignalLakeClient.java",
  "RealSignalLakeClient.java",
  "SignalLakeConfig.java",
  "SignalLakeEncryptionKey.java",
  "SignalLakeKeyProvider.java",
  "SignalLakeDebugKeyProvider.java",
  "SignalLakeEventCatalog.java",
  "SignalLakeEventDefinition.java",
  "SignalLakePropertyDefinition.java",
  "SignalLakeCatalogException.java",
  "SignalLakeRejectListener.java",
  "AesGcmBatchEncryptor.java",
  "EncryptedBatchUploader.java",
  "HttpUrlConnectionEncryptedBatchUploader.java",
  "RingMemoryQueue.java",
  "PrivacyGuard.java",
  "SignalLakeCommonFields.java",
  "SignalLakeCommonValues.java",
  "SignalLakeProperties.java",
  "SignalLakeAndroidContext.java",
  "EncryptedEventBatch.java"
]) {
  if (!exists(`${sourceRoot}/${file}`)) errors.push(`${sourceRoot}/${file}: missing`);
}
for (const file of [
  "docs/integration/android-production-closure.md",
  "sdk/android/samples/ProductionKeyProviderExample.java",
  "scripts/android/verify-release.sh",
  "scripts/android/assemble-android-test.sh",
  "scripts/android/verify-api19-emulator.sh",
  "scripts/relay/verify-local-encrypted-upload.mjs"
]) {
  if (!exists(file)) errors.push(`${file}: missing`);
}
if (!exists(`${moduleRoot}/src/androidTest/java/dev/signallake/Api19CryptoInstrumentedTest.java`)) {
  errors.push(`${moduleRoot}/src/androidTest/java/dev/signallake/Api19CryptoInstrumentedTest.java: missing`);
}

mustContain(`${sourceRoot}/NoopSignalLakeClient.java`, [
  "FlushResult.noop()",
  "queuedCount()",
  "return 0"
]);
mustNotContain(`${sourceRoot}/NoopSignalLakeClient.java`, [
  "UUID",
  "Executor",
  "HttpURLConnection",
  "new Thread"
]);
mustContain(`${sourceRoot}/RealSignalLakeClient.java`, [
  "Executors.newSingleThreadExecutor()",
  "UUID.randomUUID()",
  "SignalLakePrivacyException",
  "notifyRejected",
  "PendingUpload",
  "encryptor.encrypt"
]);
mustContain(`${sourceRoot}/SignalLakeConfig.java`, [
  "SignalLakeEventCatalog",
  "eventCatalog",
  "rejectListener"
]);
mustContain(`${sourceRoot}/SignalLakeEventBuilder.java`, [
  "SignalLakeEventCatalog",
  "eventCatalog.validateEvent",
  "eventCatalog.catalogVersion"
]);
mustContain(`${sourceRoot}/SignalLakeEventCatalog.java`, [
  "validateSource",
  "validateEvent",
  "is not registered",
  "missing required property",
  "is not declared in catalog"
]);
mustContain(`${sourceRoot}/EventEnvelope.java`, [
  "catalogVersion"
]);
mustContain(`${sourceRoot}/JsonCodec.java`, [
  "catalogVersion"
]);
mustContain(`${sourceRoot}/SignalLake.java`, [
  "startWithKeyProvider",
  "startAsync",
  "SignalLakeKeyProvider",
  "Executors.newSingleThreadExecutor()"
]);
mustContain(`${sourceRoot}/SignalLakeDebugKeyProvider.java`, [
  "debug-only",
  "SignalLakeEncryptionKey",
  "Arrays.copyOf"
]);
mustContain(`${sourceRoot}/AesGcmBatchEncryptor.java`, [
  "Cipher.getInstance(\"AES/GCM/NoPadding\")",
  "new GCMParameterSpec(TAG_BITS, nonce)",
  "TAG_BITS = 128",
  "Base64Url.encode(ciphertext)"
]);
mustNotContain(`${sourceRoot}/AesGcmBatchEncryptor.java`, [
  "KeyGenParameterSpec",
  "AndroidKeyStore"
]);
mustContain(`${sourceRoot}/HttpUrlConnectionEncryptedBatchUploader.java`, [
  "HttpURLConnection",
  "JsonCodec.encryptedBatchToJson",
  "return new UploadResult(false"
]);
mustContain(`${sourceRoot}/RingMemoryQueue.java`, [
  "ArrayDeque",
  "restoreFront",
  "policy.maxEvents"
]);
mustContain(`${sourceRoot}/SignalLakeCommonFields.java`, [
  "VERSION = \"signallake.common-fields.v1\"",
  "NAMING = \"camelCase\"",
  "CATALOG_VERSION = \"catalogVersion\"",
  "CHANNEL_ID = \"channelId\"",
  "BUILD_ID = \"buildId\"",
  "NETWORK_TYPE = \"networkType\"",
  "OUTCOME = \"outcome\"",
  "ERROR_CODE = \"errorCode\""
]);
mustContain(`${sourceRoot}/SignalLakeProperties.java`, [
  "SignalLakeProperties",
  "putProductField",
  "CommonPropertyValidator.assertValid",
  "PrivacyGuard.assertSafe"
]);
mustContain(`${sourceRoot}/SignalLakeEventBuilder.java`, [
  "CommonPropertyValidator.assertValid(safeProperties)",
  "eventCatalog.validateEvent(name, category, safeProperties)"
]);
mustContain(`${sourceRoot}/SignalLakeAndroidContext.java`, [
  "getPackageName()",
  "versionCode",
  "locale",
  "timezone",
  "osVersion"
]);
mustContain("docs/integration/android-production-closure.md", [
  "SignalLakeKeyProvider",
  "SignalLakeDebugKeyProvider",
  "http://127.0.0.1:4318/v1/upload",
  "Authorization: Bearer",
  "signallake.encrypted-event-batch.v1",
  "npm run relay:verify-local",
  "scripts/android/verify-release.sh",
  "API 19"
]);
mustContain("scripts/relay/verify-local-encrypted-upload.mjs", [
  "signallake.encrypted-event-batch.v1",
  "/v1/upload",
  "/v1/delivery/pull",
  "/v1/delivery/ack",
  "encryptedOnly=true"
]);
mustContain("scripts/android/verify-release.sh", [
  ":signallake-android:assembleRelease",
  "AAR_BYTES",
  "consumer-rules=ok"
]);
mustContain("scripts/android/verify-api19-emulator.sh", [
  "android-19",
  "connectedAndroidTest",
  "DEVICE_API",
  "api19-aes-gcm=ok"
]);
mustContain("scripts/android/assemble-android-test.sh", [
  ":signallake-android:assembleAndroidTest",
  "ANDROID_TEST_APK_BYTES"
]);
mustContain(`${moduleRoot}/src/androidTest/java/dev/signallake/Api19CryptoInstrumentedTest.java`, [
  "AesGcmBatchEncryptor",
  "AES-256-GCM",
  "signallake.encrypted-event-batch.v1",
  "assertFalse(encrypted.payload.ciphertext.contains(\"command.invoked\"))"
]);
mustContain(`${sourceRoot}/PrivacyGuard.java`, [
  "\"url\"",
  "\"filename\"",
  "\"path\"",
  "\"title\"",
  "\"metadata\"",
  "\"ip\"",
  "\"mac\"",
  "\"ssid\"",
  "\"bssid\"",
  "\"imei\"",
  "\"android_id\"",
  "\"token\"",
  "\"secret\"",
  "\"password\"",
  "\"email\"",
  "\"phone\""
]);
mustNotContain(moduleRoot, [
  "okhttp",
  "workmanager",
  "gson",
  "retrofit",
  "room-runtime",
  "java.io.file",
  "fileoutputstream",
  "sharedpreferences"
]);

if (errors.length) {
  console.error("android-sdk-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log("android-sdk-check ok: Android AAR module, consent gate, AES-GCM, uploader, queue, and privacy checks verified");

function exists(file) {
  return fs.existsSync(path.join(repoRoot, file));
}

function mustContain(file, needles) {
  const content = readTarget(file);
  if (content === null) return;
  for (const needle of needles) {
    if (!content.includes(needle)) errors.push(`${file}: missing ${needle}`);
  }
}

function mustNotContain(file, needles) {
  const content = readTarget(file);
  if (content === null) return;
  const lower = content.toLowerCase();
  for (const needle of needles) {
    if (lower.includes(needle.toLowerCase())) {
      errors.push(`${file}: must not contain ${needle}`);
    }
  }
}

function readTarget(file) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${file}: missing`);
    return null;
  }
  const stat = fs.statSync(absolutePath);
  if (stat.isDirectory()) {
    return collectFiles(absolutePath)
      .map((pathName) => fs.readFileSync(pathName, "utf8"))
      .join("\n");
  }
  return fs.readFileSync(absolutePath, "utf8");
}

function collectFiles(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== "build") out.push(...collectFiles(next));
    } else {
      out.push(next);
    }
  }
  return out;
}
