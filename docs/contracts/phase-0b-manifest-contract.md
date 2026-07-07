# SignalLake SDK Phase 0B Manifest Contract

## Goal

Add a product event manifest contract on top of the Phase 0A event and batch contract.

## Scope

- Event manifest schema.
- Base event taxonomy.
- PicPeek sample manifest.
- Cast-SDK sample manifest.
- Local manifest lint.

## Non-goals

- SDK runtime instrumentation.
- Automatic source-code scanning.
- Relay upload or delivery APIs.
- Product analytics metric definitions.
- YAML parsing or external dependencies.

## Acceptance

- `npm run schema-check` includes `event-manifest.v1.json`.
- `npm run manifest-lint` validates sample manifests.
- Sample manifests do not define forbidden privacy fields.
- Product manifests reuse base event names where possible.

## Format Note

Sample manifests use JSON for Phase 0B so checks can run with Node.js built-ins only. YAML can be added later if the project accepts a parser dependency or a conversion step.
