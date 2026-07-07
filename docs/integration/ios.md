# iOS Integration

Use `sdk/ios` as a Swift contract skeleton.

Expected flow:

1. Initialize `EventBuilder`.
2. Track lifecycle and screen events according to `platform-lifecycle.md`.
3. Use `MemoryQueue` for dry-run and local validation.
4. Drain to `buildBatch`.
5. Encrypt with CryptoKit / keychain-managed material.
6. Wrap ciphertext with `buildEncryptedBatchEnvelope`.
7. Send only the encrypted envelope to relay upload.

No background upload or persistent queue is implemented in Phase 3.
