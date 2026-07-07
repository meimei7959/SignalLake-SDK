import fs from "node:fs";

export const picpeekCatalog = readCatalog("../../catalogs/picpeek.catalog.v1.json");
export const castReceiverCatalog = readCatalog("../../catalogs/cast-sdk.receiver.catalog.v1.json");

function readCatalog(relativePath) {
  return JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), "utf8"));
}
