import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const fixturePath = path.join(repoRoot, "fixtures/uploads/valid-encrypted-upload-batch.json");
const upload = JSON.parse(fs.readFileSync(fixturePath, "utf8"));
const serialized = JSON.stringify(upload);

console.log(`schemaVersion=${upload.schemaVersion}`);
console.log(`batchId=${upload.batchId}`);
console.log(`keyId=${upload.encryption?.keyId}`);
console.log(`hasCiphertext=${typeof upload.payload?.ciphertext === "string"}`);
console.log(`containsPlaintextEventName=${serialized.includes("app.opened")}`);
