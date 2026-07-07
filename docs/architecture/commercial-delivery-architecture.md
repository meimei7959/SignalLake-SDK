# SignalLake SDK Commercial Delivery Architecture

## Goal

Support commercial delivery without turning this repository into a full analytics platform.

## Layers

```text
Product App
  -> SDK Adapter
  -> JS Core
     -> Event Builder
     -> Privacy Filter
     -> Local Queue
     -> Batch Builder
  -> Relay Service
     -> Upload API
     -> Contract Validation
     -> Privacy Validation
     -> Idempotency
     -> Delivery Queue
     -> Pull / ACK / NACK API
  -> Local Receiver / Edge
     -> storage, parsing, metrics, analytics
```

## Repository Ownership

This repository owns:

- SDK contracts
- event and batch schemas
- product manifests
- SDK core and adapters
- relay upload and delivery contracts
- mock/MVP relay implementation
- contract and dry-run E2E tests

This repository does not own:

- customer warehouse schema
- long-term local storage
- BI/dashboard
- natural-language analytics
- product-specific business metric definitions beyond examples

## Commercial Delivery Gates

1. Contract check: schema, fixture, manifest lint pass.
2. SDK check: event builder, privacy filter, queue, batch builder pass.
3. Relay check: upload validation, idempotency, pull, ACK, NACK pass.
4. E2E check: Tauri dry-run SDK produces a batch and relay delivers it.
5. Security check: bearer auth enabled before non-local deployment.
6. Persistence check: Phase 2 durable queue replaces in-memory relay state.

## Phase Map

- Phase 0A: event and batch contracts.
- Phase 0B: product manifest contract.
- Phase 1A: JS/Tauri dry-run SDK.
- Phase 1B: relay MVP and E2E flow.
- Phase 2: durable relay persistence and delivery state.
- Phase 3: Rust, Android, iOS adapters.
- Phase 4: production hardening.

## Phase 2 Store Boundary

Relay service depends on a store port, not a specific persistence technology:

- `acceptBatch(batch)`
- `pull(limit)`
- `ack(deliveryId)`
- `nack(deliveryId)`
- `stats()`

Current adapters:

- in-memory store for local tests
- file relay store for commercial pilot delivery

The file store proves restart durability, idempotency, delivery state, and dead-letter behavior without introducing external infrastructure. Production can add a Postgres, Redis Streams, or Kafka adapter behind the same port.

## Phase 2B Operations Boundary

Relay service exposes operational surfaces without coupling to a monitoring vendor:

- `/readyz` for readiness and store status counts
- `/v1/metrics` for JSON counters
- `/metrics` for scrape-friendly text counters
- `/v1/retention/prune` for explicit retention cleanup

Metrics live at service level. Retention lives at store level. HTTP only exposes the service API.

## Phase 2C Deployment Boundary

Deployment packaging owns:

- Docker image definition
- pilot docker compose profile
- environment contract
- relay healthcheck
- delivery static check
- pilot handoff guide

It does not own cloud infrastructure, database provisioning, or multi-replica orchestration.
