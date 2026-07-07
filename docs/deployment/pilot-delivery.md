# SignalLake Pilot Delivery Guide

## Preflight

```bash
npm test
```

## Run Relay Locally

```bash
SIGNALLAKE_RELAY_TOKEN=local-token \
SIGNALLAKE_RELAY_STORE_PATH=.signallake/relay-store.json \
npm run relay:dev
```

## Docker Pilot

```bash
cp deploy/pilot/.env.example deploy/pilot/.env
docker compose --env-file deploy/pilot/.env -f deploy/pilot/docker-compose.yaml up --build
```

## Verify

```bash
npm run relay:healthcheck
```

Expected endpoints:

- `GET /healthz`
- `GET /readyz`
- `GET /v1/metrics`
- `GET /metrics`
- `POST /v1/upload`
- `GET /v1/delivery/pull`
- `POST /v1/delivery/ack`
- `POST /v1/delivery/nack`
- `POST /v1/retention/prune`

## Pilot Limitations

- Single relay process per file store.
- No production database adapter yet.
- No cloud secret manager integration.
- No automatic retention scheduler.
