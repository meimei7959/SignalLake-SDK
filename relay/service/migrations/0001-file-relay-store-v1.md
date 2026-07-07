# 0001 File Relay Store v1

## Status

Current Phase 2 pilot migration.

## Store Version

`signallake.relay-store.v1`

## File Shape

```json
{
  "version": "signallake.relay-store.v1",
  "updatedAt": "2026-07-06T00:00:00.000Z",
  "deliveries": []
}
```

Each delivery stores:

- `deliveryId`
- `batchId`
- `createdAt`
- `updatedAt`
- `attempts`
- `status`
- `batch`

## Durability Rule

Every state transition writes a full snapshot through a temp file and atomic rename.

## Production Replacement

Commercial production may replace this adapter with Postgres, Redis Streams, or Kafka. The relay service boundary must keep using the same store methods:

- `acceptBatch`
- `pull`
- `ack`
- `nack`
- `stats`
