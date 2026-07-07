import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const baseUrl = (process.env.SIGNALLAKE_RELAY_URL || "http://127.0.0.1:4318").replace(/\/$/, "");
const token = process.env.SIGNALLAKE_RELAY_TOKEN || "local-token";
const upload = JSON.parse(
  fs.readFileSync(path.join(repoRoot, "fixtures/uploads/valid-encrypted-upload-batch.json"), "utf8")
);
const serialized = JSON.stringify(upload);

if (upload.schemaVersion !== "signallake.encrypted-event-batch.v1") {
  throw new Error("fixture is not encrypted-event-batch.v1");
}
if (serialized.includes("app.opened")) {
  throw new Error("fixture contains plaintext event name");
}

const headers = {
  authorization: `Bearer ${token}`,
  "content-type": "application/json"
};

const uploadResponse = await fetch(`${baseUrl}/v1/upload`, {
  method: "POST",
  headers,
  body: JSON.stringify(upload)
});
if (![200, 202].includes(uploadResponse.status)) {
  throw new Error(`upload failed: ${uploadResponse.status} ${await uploadResponse.text()}`);
}

const pullResponse = await fetch(`${baseUrl}/v1/delivery/pull?limit=1`, { headers });
if (pullResponse.status !== 200) {
  throw new Error(`pull failed: ${pullResponse.status} ${await pullResponse.text()}`);
}
const pulled = await pullResponse.json();
const delivery = pulled.deliveries?.[0];
if (!delivery) throw new Error("no delivery returned");
const deliveryText = JSON.stringify(delivery);
if (!deliveryText.includes("payload") || !deliveryText.includes("ciphertext")) {
  throw new Error("delivery does not contain encrypted payload");
}
if (deliveryText.includes("app.opened")) {
  throw new Error("delivery contains plaintext event name");
}

const ackResponse = await fetch(`${baseUrl}/v1/delivery/ack`, {
  method: "POST",
  headers,
  body: JSON.stringify({ deliveryId: delivery.deliveryId })
});
if (ackResponse.status !== 200) {
  throw new Error(`ack failed: ${ackResponse.status} ${await ackResponse.text()}`);
}

console.log(`relay=${baseUrl}`);
console.log(`uploadStatus=${uploadResponse.status}`);
console.log(`deliveryId=${delivery.deliveryId}`);
console.log("encryptedOnly=true");
console.log("ackStatus=200");
