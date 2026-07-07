const ENCRYPTED_BATCH_SCHEMA_VERSION = "signallake.encrypted-event-batch.v1";
const PLAINTEXT_BATCH_CONTENT_TYPE = "application/vnd.signallake.event-batch+json;v=1";
const AES_GCM_ALG = "AES-256-GCM";
const AES_GCM_KEY_BYTES = 32;
const AES_GCM_NONCE_BYTES = 12;
const AES_GCM_TAG_BYTES = 16;

export async function encryptBatch(batch, options = {}) {
  const key = normalizeEncryptionKey(options);
  const nonce = await randomBytes(AES_GCM_NONCE_BYTES);
  const header = buildEncryptedHeader(batch, key.keyId, bytesToBase64url(nonce));
  const aad = encodeUtf8(JSON.stringify(buildAadObject(header)));
  const plaintext = encodeUtf8(JSON.stringify(batch));
  const cryptoKey = await importAesGcmKey(key.keyBytes, ["encrypt"]);
  const sealed = new Uint8Array(
    await subtleCrypto().encrypt(
      {
        name: "AES-GCM",
        iv: nonce,
        additionalData: aad,
        tagLength: AES_GCM_TAG_BYTES * 8
      },
      cryptoKey,
      plaintext
    )
  );
  const ciphertext = sealed.slice(0, sealed.length - AES_GCM_TAG_BYTES);
  const authTag = sealed.slice(sealed.length - AES_GCM_TAG_BYTES);

  return {
    ...header,
    payload: {
      encoding: "base64url",
      ciphertext: bytesToBase64url(ciphertext),
      authTag: bytesToBase64url(authTag)
    }
  };
}

export async function decryptBatch(encryptedBatch, options = {}) {
  const key = normalizeEncryptionKey(options);
  const nonce = base64urlToBytes(encryptedBatch?.encryption?.nonce ?? "");
  const ciphertext = base64urlToBytes(encryptedBatch?.payload?.ciphertext ?? "");
  const authTag = base64urlToBytes(encryptedBatch?.payload?.authTag ?? "");
  const sealed = concatBytes(ciphertext, authTag);
  const aad = encodeUtf8(JSON.stringify(buildAadObject(encryptedBatch)));
  const cryptoKey = await importAesGcmKey(key.keyBytes, ["decrypt"]);
  const plaintext = await subtleCrypto().decrypt(
    {
      name: "AES-GCM",
      iv: nonce,
      additionalData: aad,
      tagLength: AES_GCM_TAG_BYTES * 8
    },
    cryptoKey,
    sealed
  );
  return JSON.parse(decodeUtf8(new Uint8Array(plaintext)));
}

export function normalizeEncryptionKey(options = {}) {
  const keyId = options.keyId;
  const rawKey = options.keyBytes ?? options.key;
  if (typeof keyId !== "string" || keyId.length < 1) {
    throw new TypeError("encryption.keyId must be a non-empty string");
  }

  const keyBytes = normalizeKeyBytes(rawKey);
  if (keyBytes.length !== AES_GCM_KEY_BYTES) {
    throw new TypeError("encryption key must be 32 bytes for AES-256-GCM");
  }
  return { keyId, keyBytes };
}

export async function generateEncryptionKey() {
  return randomBytes(AES_GCM_KEY_BYTES);
}

function buildEncryptedHeader(batch, keyId, nonce) {
  if (!batch || typeof batch !== "object") {
    throw new TypeError("batch must be an object");
  }
  if (batch.schemaVersion !== "signallake.event-batch.v1") {
    throw new TypeError("batch.schemaVersion must be signallake.event-batch.v1");
  }
  if (!batch.batchId || !batch.createdAt || !batch.source) {
    throw new TypeError("batch must include batchId, createdAt, and source");
  }

  return {
    schemaVersion: ENCRYPTED_BATCH_SCHEMA_VERSION,
    batchId: batch.batchId,
    createdAt: batch.createdAt,
    source: structuredClone(batch.source),
    plaintext: {
      schemaVersion: batch.schemaVersion,
      contentType: PLAINTEXT_BATCH_CONTENT_TYPE
    },
    encryption: {
      alg: AES_GCM_ALG,
      keyId,
      nonce
    }
  };
}

function buildAadObject(encryptedBatch) {
  return {
    schemaVersion: encryptedBatch.schemaVersion,
    batchId: encryptedBatch.batchId,
    createdAt: encryptedBatch.createdAt,
    source: encryptedBatch.source,
    plaintext: encryptedBatch.plaintext,
    encryption: {
      alg: encryptedBatch.encryption?.alg,
      keyId: encryptedBatch.encryption?.keyId,
      nonce: encryptedBatch.encryption?.nonce
    }
  };
}

async function importAesGcmKey(keyBytes, usages) {
  return subtleCrypto().importKey(
    "raw",
    keyBytes,
    {
      name: "AES-GCM",
      length: 256
    },
    false,
    usages
  );
}

function subtleCrypto() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("Web Crypto AES-GCM is required for SignalLake encryption");
  }
  return globalThis.crypto.subtle;
}

async function randomBytes(length) {
  const bytes = new Uint8Array(length);
  if (globalThis.crypto?.getRandomValues) {
    globalThis.crypto.getRandomValues(bytes);
    return bytes;
  }
  throw new Error("Web Crypto random source is required for SignalLake encryption");
}

function normalizeKeyBytes(value) {
  if (value instanceof Uint8Array) return value;
  if (value instanceof ArrayBuffer) return new Uint8Array(value);
  if (ArrayBuffer.isView(value)) {
    return new Uint8Array(value.buffer, value.byteOffset, value.byteLength);
  }
  if (typeof value === "string") return base64urlToBytes(value);
  throw new TypeError("encryption.keyBytes must be bytes or base64url string");
}

function concatBytes(left, right) {
  const bytes = new Uint8Array(left.length + right.length);
  bytes.set(left, 0);
  bytes.set(right, left.length);
  return bytes;
}

function encodeUtf8(value) {
  return new TextEncoder().encode(value);
}

function decodeUtf8(value) {
  return new TextDecoder().decode(value);
}

function bytesToBase64url(bytes) {
  const base64 = bytesToBase64(bytes);
  return base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function base64urlToBytes(value) {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=");
  return base64ToBytes(padded);
}

function bytesToBase64(bytes) {
  if (typeof btoa === "function") {
    let binary = "";
    for (let index = 0; index < bytes.length; index += 0x8000) {
      binary += String.fromCharCode(...bytes.slice(index, index + 0x8000));
    }
    return btoa(binary);
  }
  return Buffer.from(bytes).toString("base64");
}

function base64ToBytes(value) {
  if (typeof atob === "function") {
    return Uint8Array.from(atob(value), (char) => char.charCodeAt(0));
  }
  return Uint8Array.from(Buffer.from(value, "base64"));
}
