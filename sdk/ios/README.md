# SignalLake iOS SDK

Phase 3 Swift skeleton.

Current capabilities:

- event builder
- privacy guard
- in-memory queue
- batch builder
- opt-in encrypted disk queue under an app-provided Application Support URL
- disk byte and batch-count caps with oldest-batch drop policy

Current non-goals:

- Swift Package release
- background upload scheduling
- UIKit/SwiftUI automatic lifecycle hooks beyond documented mapping

Disk queue is not enabled by default. Host apps should pass an app-owned
Application Support URL, commonly from
`DiskEncryptedBatchQueue.applicationSupportQueueURL(bundleIdentifier:)`. The
queue writes only `EncryptedEventBatch` JSON, excludes the directory from iCloud
backup, and drops oldest encrypted batches when `SignalLakeStoragePolicy` caps
are reached.
