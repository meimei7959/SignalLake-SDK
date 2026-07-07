# SignalLake Relay Service

MVP relay service for contract and commercial delivery architecture validation.

Current capabilities:

- upload batch validation
- privacy validation before queueing
- idempotency by `batchId`
- pull / ack / nack delivery flow
- in-memory store for local tests
- file-backed durable store for commercial pilot
- optional bearer token in HTTP mode through `SIGNALLAKE_RELAY_TOKEN`

Run:

```bash
npm run relay:dev
```

File-backed durable mode:

```bash
SIGNALLAKE_RELAY_STORE_PATH=.signallake/relay-store.json npm run relay:dev
```

Current limitation:

- file-backed mode is a pilot adapter, not a high-concurrency production database.
