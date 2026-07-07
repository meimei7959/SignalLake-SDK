# SignalLake SDK Phase 0A Contract

## Goal

Create the smallest verifiable event contract for SignalLake SDK before any runtime SDK or relay implementation.

## Scope

- Event envelope schema.
- Event batch schema.
- Privacy guardrail rules.
- Valid and invalid fixtures.
- Local schema and fixture checks.

## Non-goals

- JS/Tauri SDK runtime.
- Rust, Android, or iOS SDKs.
- Relay service.
- Local receiver, database, parser, dashboard, or analytics.
- Product-specific metric taxonomy beyond generic fixture examples.

## Acceptance

- `npm run schema-check` validates contract file shape.
- `npm run fixture-check` validates fixtures against schema and privacy rules.
- Invalid fixtures prove forbidden fields are blocked before upload.
- Checks use local Node.js built-ins only.

## Run

```bash
npm test
```
