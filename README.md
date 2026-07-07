# SignalLake SDK

SignalLake SDK is the data instrumentation SDK project for the SignalLake product family.

中文定位：

SignalLake SDK 是面向私有化、本地部署和企业数据闭环场景的数据埋点 SDK，负责把产品、设备、用户行为和业务信号以标准事件方式采集、缓存、治理并安全上报。

## This Project Owns

- event tracking SDK
- event schema and validation
- common field registry, event taxonomy, and manifest governance
- user/device/session identity model
- offline cache and retry
- upload protocol
- privacy and desensitization hooks before encryption
- encrypted upload envelope before data leaves the client
- SDK integration docs and examples
- SDK quality, compatibility, and acceptance tests

## This Project Does Not Own

- SignalLake Edge: local data storage, compute, cleaning, aggregation, desensitization at data-foundation level, and sync runtime.
- SignalLake Agent: natural-language data query, metric explanation, anomaly analysis, and report generation.
- SignalLake Console: management UI, visualization, rule configuration, and dashboard product.
- Customer data warehouse implementation.
- Business-specific event taxonomy decisions beyond SDK examples and schema contracts.
- Product-specific fields that have not been promoted into the SDK common registry.

## First Goal

Define the SDK product boundary, first PRD, event model, runtime constraints, and acceptance path before implementation starts.

## Current Contract Slice

Phase 0A is the active slice:

- event envelope schema
- event batch schema
- privacy guardrail rules
- valid and invalid fixtures
- local schema and fixture checks

Run:

```bash
npm test
```

Phase 0B adds:

- event manifest schema
- base event taxonomy
- PicPeek and Cast-SDK sample manifests
- local manifest lint

Phase 1 architecture now adds:

- JS SDK core
- Tauri dry-run adapter
- relay MVP
- encrypted upload and delivery API contracts
- commercial delivery runbook
- dry-run E2E test

Phase 2 adds:

- file-backed durable relay store
- delivery state persistence
- idempotency persistence
- readiness and metrics endpoints
- retention prune endpoint
- Docker pilot packaging
- delivery static checks

Phase 3 adds:

- Rust desktop SDK skeleton
- Android AAR SDK module
- iOS Swift SDK skeleton
- Android TV queue policy
- platform lifecycle mapping
- platform static checks

Android SDK delivery now includes:

- `sdk/android/signallake-android`
- `com.android.library`
- `minSdk 19`
- consent-gated `SignalLakeClient`
- runtime `SignalLakeKeyProvider` and debug-only key provider
- API 19-compatible AES-256-GCM encrypted upload
- lightweight `HttpURLConnection` uploader
- in-memory ring queue
- consumer ProGuard/R8 rules
- common field constants, enum values, typed property builder, and validator

Product Pilot 1 adds:

- PicPeek dry-run event mapping
- PicPeek pilot harness
- privacy rejection proof for folder path and clipboard text
- encrypted local relay upload / pull / ACK proof

## Encryption Boundary

All reporting payloads sent to `/v1/upload` must use
`signallake.encrypted-event-batch.v1`. Plain `signallake.event-batch.v1`
objects are client-internal only and are rejected by relay upload validation.
