import { readJson } from "../../../tools/lib/load-json.mjs";
import { validateSchema } from "../../../tools/lib/json-schema-subset.mjs";

const encryptedBatchSchema = readJson("schemas/encrypted-event-batch.v1.json");

export function validateUploadBatch(batch) {
  if (batch?.schemaVersion === "signallake.event-batch.v1") {
    return [
      "$: plaintext event-batch.v1 is not accepted for upload; encrypt before reporting"
    ];
  }
  return validateSchema(encryptedBatchSchema, batch);
}
