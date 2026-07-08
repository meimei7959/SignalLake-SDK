import fs from "node:fs";
import path from "node:path";
import { repoRoot, readJson } from "../lib/load-json.mjs";

const errors = [];
const targets = readJson("contracts/platform-targets.v1.json");

if (targets.version !== "signallake.platform-targets.v1") {
  errors.push("contracts/platform-targets.v1.json: unexpected version");
}

for (const target of targets.targets ?? []) {
  checkTarget(target);
}

const requiredDocs = [
  "docs/integration/rust-desktop.md",
  "docs/integration/android.md",
  "docs/integration/ios.md",
  "docs/integration/platform-lifecycle.md"
];
for (const file of requiredDocs) {
  if (!exists(file)) errors.push(`${file}: missing`);
}

mustContain("sdk/rust/signallake-core/src/lib.rs", [
  "EVENT_SCHEMA_VERSION",
  "BATCH_SCHEMA_VERSION",
  "EventBuilder",
  "MemoryQueue",
  "StoragePolicy",
  "DiskEncryptedBatchQueue",
  "encrypted_batch_to_json",
  "encrypted_batch_from_json",
  "assert_privacy_safe",
  "build_batch",
  "EncryptedEventBatch",
  "build_encrypted_batch_envelope"
]);
mustContain("sdk/android/settings.gradle.kts", [
  "include(\":signallake-android\")"
]);
mustContain("sdk/android/build.gradle.kts", [
  "com.android.library"
]);
mustContain("sdk/android/signallake-android/build.gradle.kts", [
  "com.android.library",
  "minSdk = 19",
  "consumerProguardFiles"
]);
mustContain("sdk/android/signallake-android/consumer-rules.pro", [
  "dev.signallake.SignalLakeClient",
  "dev.signallake.SignalLakeConfig"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLake.java", [
  "noop()",
  "start(SignalLakeConfig config)"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/RealSignalLakeClient.java", [
  "ExecutorService",
  "flush()",
  "PendingUpload"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeEventCatalog.java", [
  "validateSource",
  "validateEvent",
  "is not registered"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/SignalLakeQueuePolicy.java", [
  "androidTvDefault",
  "maxEvents",
  "flushBatchSize"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/AesGcmBatchEncryptor.java", [
  "AES/GCM/NoPadding",
  "GCMParameterSpec",
  "TAG_BITS = 128"
]);
mustContain("sdk/android/signallake-android/src/main/java/dev/signallake/HttpUrlConnectionEncryptedBatchUploader.java", [
  "HttpURLConnection",
  "JsonCodec.encryptedBatchToJson"
]);
mustContain("sdk/ios/Sources/SignalLake/SignalLake.swift", [
  "eventSchemaVersion",
  "batchSchemaVersion",
  "encryptedBatchSchemaVersion",
  "EventBuilder",
  "MemoryQueue",
  "SignalLakeStoragePolicy",
  "DiskEncryptedBatchQueue",
  "applicationSupportQueueURL",
  "PrivacyGuard",
  "buildBatch",
  "EncryptedEventBatch",
  "buildEncryptedBatchEnvelope"
]);
mustContain("sdk/js/core/src/disk-encrypted-batch-queue.mjs", [
  "createDiskEncryptedBatchQueue",
  "createStoragePolicy",
  "SignalLakeDropPolicy",
  "maxDiskBytes",
  "maxDiskBatches",
  "DROP_OLDEST"
]);
mustContain("sdk/js/tauri/src/index.mjs", [
  "diskQueueDirectory",
  "ackEncryptedBatch",
  "diskQueue.peek()",
  "diskQueue.enqueue(encrypted)",
  "const events = queue.drain(limit)"
]);
mustContain("docs/integration/platform-lifecycle.md", [
  "app.opened",
  "screen.viewed",
  "command.invoked",
  "Android TV"
]);

if (errors.length) {
  console.error("platform-check failed:");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`platform-check ok: ${(targets.targets ?? []).length} platform targets checked`);

function checkTarget(target) {
  for (const field of ["id", "language", "entrypoint"]) {
    if (!target[field]) errors.push(`platform target missing ${field}`);
  }
  if (!exists(target.entrypoint)) {
    errors.push(`${target.entrypoint}: missing for target ${target.id}`);
  }
  if (!Array.isArray(target.requiredCapabilities) || target.requiredCapabilities.length === 0) {
    errors.push(`${target.id}: missing requiredCapabilities`);
  }
}

function exists(file) {
  return fs.existsSync(path.join(repoRoot, file));
}

function mustContain(file, needles) {
  const absolutePath = path.join(repoRoot, file);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`${file}: missing`);
    return;
  }
  const content = fs.readFileSync(absolutePath, "utf8");
  for (const needle of needles) {
    if (!content.includes(needle)) {
      errors.push(`${file}: missing ${needle}`);
    }
  }
}
