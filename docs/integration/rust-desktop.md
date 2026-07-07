# Rust Desktop Integration

Use `sdk/rust/signallake-core` as a contract skeleton for native desktop or Tauri backend integrations.

Expected flow:

1. Create `Source`, `Identity`, and session values.
2. Build events through `EventBuilder`.
3. Enqueue events in `MemoryQueue`.
4. Drain events into `build_batch`.
5. Encrypt the batch with platform-native AES-256-GCM.
6. Wrap ciphertext with `build_encrypted_batch_envelope`.
7. Send only the encrypted envelope to relay upload.

No network upload is implemented in Phase 3.
