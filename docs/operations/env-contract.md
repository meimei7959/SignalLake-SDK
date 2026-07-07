# SignalLake Relay Environment Contract

## Required For Pilot

| Variable | Required | Default | Meaning |
| --- | --- | --- | --- |
| `PORT` | no | `4318` | HTTP listen port. |
| `SIGNALLAKE_RELAY_TOKEN` | yes for non-local | none | Bearer token for all relay endpoints. |
| `SIGNALLAKE_RELAY_STORE_PATH` | yes for durable pilot | none | File-backed relay store path. Missing value uses in-memory mode. |
| `SIGNALLAKE_RELAY_MAX_ATTEMPTS` | no | `3` | Attempts before `dead_letter`. |
| `SIGNALLAKE_RELAY_RETENTION_MS` | no | `604800000` | Suggested prune window for retained terminal deliveries. |

## Modes

Memory mode:

```bash
npm run relay:dev
```

Durable pilot mode:

```bash
SIGNALLAKE_RELAY_TOKEN=local-token \
SIGNALLAKE_RELAY_STORE_PATH=.signallake/relay-store.json \
npm run relay:dev
```

## Security

Do not expose non-local relay without `SIGNALLAKE_RELAY_TOKEN`.

## Retention

Retention is manual in Phase 2. Use `/v1/retention/prune` after customer replay and audit windows are satisfied.
