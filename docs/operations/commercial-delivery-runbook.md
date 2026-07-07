# SignalLake Commercial Delivery Runbook

## Local Verification

```bash
npm test
```

This includes contract checks, fixture checks, manifest lint, delivery asset checks, and unit/E2E tests.

## Local Relay

```bash
npm run relay:dev
```

## Durable Pilot Relay

```bash
SIGNALLAKE_RELAY_STORE_PATH=.signallake/relay-store.json npm run relay:dev
```

The file-backed store is intended for pilot and local commercial validation. Back it up like any other state file, and do not run multiple relay processes against the same file.

## Docker Pilot

```bash
cp deploy/pilot/.env.example deploy/pilot/.env
docker compose --env-file deploy/pilot/.env -f deploy/pilot/docker-compose.yaml up --build
```

## Health And Metrics

```bash
GET /healthz
GET /readyz
GET /v1/metrics
GET /metrics
```

`/readyz` returns store kind and delivery status counts. `/v1/metrics` returns JSON counters. `/metrics` returns text counters with `signallake_` prefixes.

## Retention

Manual prune endpoint:

```bash
POST /v1/retention/prune
```

Example body:

```json
{
  "statuses": ["acked", "dead_letter"],
  "olderThanMs": 86400000
}
```

Retention removes delivery records and their idempotency mapping after the retention window. After pruning, a very old duplicate `batchId` can be accepted again, so production retention windows must match customer replay and audit requirements.

Optional bearer token:

```bash
SIGNALLAKE_RELAY_TOKEN=local-dev-token npm run relay:dev
```

## Pre-Delivery Checklist

- Contract checks pass.
- Manifest lint passes.
- Unit and E2E tests pass.
- Relay auth token is configured outside local dev.
- Privacy policy has product-specific approval.
- In-memory relay is not used for customer traffic.
- File-backed relay is not used for high-concurrency production traffic.
- Retention policy is approved before pruning customer data.
- `npm run delivery-check` passes before handoff.

## Known Commercialization Gap

Production rollout still needs a database/queue adapter, metrics export, deployment manifests, and retention automation.
