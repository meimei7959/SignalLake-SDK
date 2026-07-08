# SignalLake Tauri Adapter

Thin dry-run adapter over `sdk/js/core`.

Current capabilities:

- `trackAppOpened`
- `trackScreenViewed`
- `trackCommandInvoked`
- `drainBatch`
- `drainEncryptedBatch`
- optional encrypted disk queue via `diskQueueDirectory`
- `ackEncryptedBatch` to delete uploaded encrypted batches

No network upload is performed by default.
Disk queue is not enabled by default. Tauri hosts that want offline cache should
pass an app-owned data directory as `diskQueueDirectory` plus an optional
`storagePolicy`. The adapter persists only encrypted batches and drops oldest
encrypted batches when configured byte or batch caps are reached.
