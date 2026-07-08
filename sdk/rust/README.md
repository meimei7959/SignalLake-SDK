# SignalLake Rust SDK

Phase 3 Rust desktop skeleton for Tauri/native desktop integrations.

Current capabilities:

- event envelope structs
- privacy guard before queue
- in-memory queue
- batch builder
- opt-in encrypted disk queue for desktop/Tauri hosts
- disk byte and batch-count caps with oldest-batch drop policy

Current non-goals:

- HTTP upload
- async runtime integration
- crate publishing

The Rust skeleton mirrors JS core field names so contract tests can compare behavior across platforms.
Disk queue is not enabled by default; desktop hosts pass an app-owned data
directory to `DiskEncryptedBatchQueue::new`. The queue stores only encrypted
batch JSON and never stores plaintext event envelopes.
