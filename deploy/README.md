# SignalLake Deployment

## Pilot Target

The current deployable unit is `signallake-relay`.

It supports:

- HTTP upload API
- delivery pull / ACK / NACK API
- file-backed durable pilot store
- readiness and metrics endpoints
- manual retention prune

## Local Pilot

```bash
cp deploy/pilot/.env.example deploy/pilot/.env
docker compose --env-file deploy/pilot/.env -f deploy/pilot/docker-compose.yaml up --build
```

## Non-goals

- multi-replica file-store deployment
- database migrations
- cloud-specific infrastructure
- production secrets management

Production deployment should replace file store with a database or queue adapter before multi-instance rollout.
