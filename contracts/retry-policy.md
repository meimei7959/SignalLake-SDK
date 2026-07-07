# SignalLake Retry Policy

## SDK Upload

- Batch upload may retry network, timeout, and `5xx` failures.
- Batch upload must not retry `4xx` contract failures without changing payload or credentials.
- SDK must keep events queued until upload is accepted.
- SDK must not upload by default in dry-run/local-log mode.

## Relay Delivery

- Relay must keep a delivery until receiver `ACK`.
- `NACK` requeues until max attempts.
- Delivery moves to dead-letter after max attempts.
- Duplicate upload is detected by `batchId`.
- Receiver-side duplicate handling should use `deliveryId` and `batchId`.

## Phase Status

The relay now supports:

- in-memory state for fast local tests
- file-backed durable state for commercial pilot delivery

Production rollout should replace file-backed state with a database or queue adapter once concurrency, retention, and operational requirements are confirmed.

## Retention

- Default retainable statuses: `acked`, `dead_letter`.
- Prune only after the configured audit/replay window.
- Pruning removes delivery records and idempotency mappings.
- Do not prune `queued` or `inflight` deliveries.
