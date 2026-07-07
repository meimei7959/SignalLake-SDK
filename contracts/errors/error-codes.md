# SignalLake Error Codes

| Code | Layer | Meaning | Retry |
| --- | --- | --- | --- |
| `SIGNALLAKE_BATCH_INVALID` | relay | Batch failed schema, fixture, or privacy validation. | no |
| `SIGNALLAKE_AUTH_UNAUTHORIZED` | relay | Bearer token missing or invalid when auth is enabled. | after credential fix |
| `SIGNALLAKE_ROUTE_NOT_FOUND` | relay | API path does not exist. | no |
| `SIGNALLAKE_INTERNAL_ERROR` | relay | Unexpected relay error. | yes |
| `SIGNALLAKE_QUEUE_FULL` | sdk | Local SDK queue reached configured max size. | after drain |
| `SIGNALLAKE_PRIVACY_VIOLATION` | sdk | Event contains forbidden fields or values. | no |
