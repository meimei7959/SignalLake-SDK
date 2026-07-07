import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const root = "/Users/meimei/Documents/SignalLake-SDK";
const moduleRoot = "sdk/android/signallake-android";
const javaRoot = `${moduleRoot}/src/main/java/dev/signallake`;

test("Android SDK is a minSdk 19 Android library AAR module", () => {
  const settings = read("sdk/android/settings.gradle.kts");
  const moduleBuild = read(`${moduleRoot}/build.gradle.kts`);
  const consumerRules = read(`${moduleRoot}/consumer-rules.pro`);

  assert.match(settings, /include\(":signallake-android"\)/);
  assert.match(moduleBuild, /id\("com\.android\.library"\)/);
  assert.match(moduleBuild, /minSdk = 19/);
  assert.match(moduleBuild, /consumerProguardFiles/);
  assert.match(consumerRules, /dev\.signallake\.SignalLakeClient/);
});

test("NoopSignalLakeClient has no side effects before consent", () => {
  const source = read(`${javaRoot}/NoopSignalLakeClient.java`);

  assert.match(source, /FlushResult\.noop\(\)/);
  assert.doesNotMatch(source, /UUID|Executor|HttpURLConnection|new Thread/);
});

test("Android SDK encrypts upload batches and never uploads plaintext batch JSON", () => {
  const encryptor = read(`${javaRoot}/AesGcmBatchEncryptor.java`);
  const uploader = read(`${javaRoot}/HttpUrlConnectionEncryptedBatchUploader.java`);

  assert.match(encryptor, /AES\/GCM\/NoPadding/);
  assert.match(encryptor, /GCMParameterSpec/);
  assert.doesNotMatch(encryptor, /KeyGenParameterSpec|AndroidKeyStore/);
  assert.match(uploader, /JsonCodec\.encryptedBatchToJson/);
  assert.doesNotMatch(uploader, /eventBatchToJson/);
});

test("Android SDK queue drains batches and retains pending encrypted upload for retry", () => {
  const queue = read(`${javaRoot}/RingMemoryQueue.java`);
  const client = read(`${javaRoot}/RealSignalLakeClient.java`);

  assert.match(queue, /ArrayDeque/);
  assert.match(queue, /drain\(int limit\)/);
  assert.match(client, /PendingUpload/);
  assert.match(client, /encryptor\.encrypt/);
  assert.match(client, /retainedForRetry/);
});

test("Android SDK provides key provider and async start API", () => {
  const signalLake = read(`${javaRoot}/SignalLake.java`);
  const provider = read(`${javaRoot}/SignalLakeKeyProvider.java`);
  const debugProvider = read(`${javaRoot}/SignalLakeDebugKeyProvider.java`);
  const consumerRules = read(`${moduleRoot}/consumer-rules.pro`);

  assert.match(provider, /interface SignalLakeKeyProvider/);
  assert.match(provider, /getEncryptionKey\(\) throws Exception/);
  assert.match(debugProvider, /SignalLakeDebugKeyProvider/);
  assert.match(debugProvider, /debug-only/);
  assert.match(debugProvider, /new SignalLakeEncryptionKey/);
  assert.match(signalLake, /startWithKeyProvider/);
  assert.match(signalLake, /startAsync/);
  assert.match(signalLake, /Executors\.newSingleThreadExecutor/);
  assert.match(consumerRules, /SignalLakeKeyProvider/);
});

test("Android SDK enforces event catalog before enqueue", () => {
  const config = read(`${javaRoot}/SignalLakeConfig.java`);
  const catalog = read(`${javaRoot}/SignalLakeEventCatalog.java`);
  const builder = read(`${javaRoot}/SignalLakeEventBuilder.java`);
  const client = read(`${javaRoot}/RealSignalLakeClient.java`);
  const envelope = read(`${javaRoot}/EventEnvelope.java`);
  const codec = read(`${javaRoot}/JsonCodec.java`);

  assert.match(config, /SignalLakeEventCatalog/);
  assert.match(config, /eventCatalog/);
  assert.match(config, /rejectListener/);
  assert.match(catalog, /validateSource/);
  assert.match(catalog, /validateEvent/);
  assert.match(catalog, /is not registered/);
  assert.match(catalog, /missing required property/);
  assert.match(catalog, /is not declared in catalog/);
  assert.match(builder, /eventCatalog\.validateEvent\(name, category, safeProperties\)/);
  assert.match(builder, /eventCatalog\.catalogVersion/);
  assert.match(client, /notifyRejected/);
  assert.match(envelope, /catalogVersion/);
  assert.match(codec, /catalogVersion/);
});

test("Android SDK documents production key relay and release verification", () => {
  const closure = read("docs/integration/android-production-closure.md");
  const script = read("scripts/android/verify-release.sh");
  const api19Script = read("scripts/android/verify-api19-emulator.sh");
  const relayVerify = read("scripts/relay/verify-local-encrypted-upload.mjs");
  const sample = read("sdk/android/samples/ProductionKeyProviderExample.java");
  const api19Test = read(`${moduleRoot}/src/androidTest/java/dev/signallake/Api19CryptoInstrumentedTest.java`);

  assert.match(closure, /SignalLakeKeyProvider/);
  assert.match(closure, /SignalLakeDebugKeyProvider/);
  assert.match(closure, /http:\/\/127\.0\.0\.1:4318\/v1\/upload/);
  assert.match(closure, /signallake\.encrypted-event-batch\.v1/);
  assert.match(closure, /relay:verify-local/);
  assert.match(closure, /API 19/);
  assert.match(script, /:signallake-android:assembleRelease/);
  assert.match(script, /AAR_BYTES/);
  assert.match(api19Script, /connectedAndroidTest/);
  assert.match(api19Script, /DEVICE_API/);
  assert.match(relayVerify, /\/v1\/upload/);
  assert.match(relayVerify, /encryptedOnly=true/);
  assert.match(sample, /ProductionKeyProviderExample/);
  assert.match(sample, /fetchCurrentKey/);
  assert.match(api19Test, /AesGcmBatchEncryptor/);
  assert.match(api19Test, /signallake\.encrypted-event-batch\.v1/);
  assert.match(api19Test, /command\.invoked/);
});

test("Android SDK rejects Cast-SDK unsafe fields", () => {
  const privacy = read(`${javaRoot}/PrivacyGuard.java`);
  for (const token of [
    "url",
    "filename",
    "path",
    "title",
    "metadata",
    "ip",
    "mac",
    "ssid",
    "bssid",
    "imei",
    "android_id",
    "token",
    "secret",
    "password",
    "email",
    "phone"
  ]) {
    assert.match(privacy, new RegExp(`"${token}"`));
  }
});

test("Android SDK owns common fields constants, typed builder, and validator", () => {
  const fields = read(`${javaRoot}/SignalLakeCommonFields.java`);
  const values = read(`${javaRoot}/SignalLakeCommonValues.java`);
  const props = read(`${javaRoot}/SignalLakeProperties.java`);
  const validator = read(`${javaRoot}/CommonPropertyValidator.java`);
  const builder = read(`${javaRoot}/SignalLakeEventBuilder.java`);
  const context = read(`${javaRoot}/SignalLakeAndroidContext.java`);

  for (const token of [
    "VERSION = \"signallake.common-fields.v1\"",
    "NAMING = \"camelCase\"",
    "CATALOG_VERSION = \"catalogVersion\"",
    "CHANNEL_ID = \"channelId\"",
    "BUILD_ID = \"buildId\"",
    "NETWORK_TYPE = \"networkType\"",
    "OUTCOME = \"outcome\"",
    "ERROR_CODE = \"errorCode\""
  ]) {
    assert.match(fields, new RegExp(escapeRegex(token)));
  }
  assert.match(values, /class Outcome/);
  assert.match(values, /SUCCESS = "success"/);
  assert.match(values, /FAILURE = "failure"/);
  assert.match(values, /CHROMECAST = "chromecast"/);
  assert.match(props, /SignalLakeProperties/);
  assert.match(props, /putProductField/);
  assert.match(props, /CommonPropertyValidator\.assertValid/);
  assert.match(validator, /SignalLakeCommonFields\.OUTCOME/);
  assert.match(validator, /SignalLakeCommonFields\.ERROR_CODE/);
  assert.match(builder, /CommonPropertyValidator\.assertValid\(safeProperties\)/);
  assert.match(context, /getPackageName\(\)/);
  assert.match(context, /versionCode/);
  assert.match(context, /timezone/);
});

test("Android SDK has no default heavy client dependencies", () => {
  const all = collect(path.join(root, moduleRoot)).join("\n").toLowerCase();
  for (const forbidden of [
    "okhttp",
    "workmanager",
    "gson",
    "retrofit",
    "room-runtime",
    "java.io.file",
    "fileoutputstream",
    "sharedpreferences"
  ]) {
    assert.equal(all.includes(forbidden), false, forbidden);
  }
});

function read(file) {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function escapeRegex(text) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function collect(dir) {
  const out = [];
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    const next = path.join(dir, ent.name);
    if (ent.isDirectory()) {
      if (ent.name !== "build") out.push(...collect(next));
    } else {
      out.push(fs.readFileSync(next, "utf8"));
    }
  }
  return out;
}
