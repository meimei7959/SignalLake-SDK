# SignalLake Catalog Governance

## Purpose

SignalLake uses registered catalogs as the data-quality boundary. Product code
must not invent event names or fields at call sites. Every emitted event must be
valid against a versioned catalog before it can enter the SDK queue.

## Ownership Layers

| Layer | Role | Runtime dependency |
| --- | --- | --- |
| Governance database or console | Owns field registry, event registry, review status, owners, approvals, deprecation, and compatibility checks. | No direct client dependency |
| Catalog artifact | Immutable export of an approved registry version, stored as JSON and built into or passed to SDKs. | SDK and warehouse parser dependency |
| SDK runtime validator | Rejects unregistered events, undeclared fields, missing required fields, enum drift, and privacy violations before encryption. | Required |
| Relay | Accepts and forwards only encrypted batches. It does not inspect event content. | No plaintext dependency |
| Receiver or warehouse parser | Decrypts and validates against the same `catalogVersion` before parsing facts. | Required |

## Current Repo Artifacts

- Common field registry: `schemas/common-properties.v1.json`
- Event catalog schema: `schemas/event-catalog.v1.json`
- Product catalog snapshots: `catalogs/*.catalog.v1.json`
- Product manifest inputs: `fixtures/manifests/*.sample-manifest.json`
- Runtime validators: JS `event-catalog.mjs`, Android `SignalLakeEventCatalog`
- CI gate: `npm run catalog-check`

## Registration Rules

New events must answer:

- What business question does this event support?
- Is an existing base event enough?
- Is the trigger stable and non-duplicative?
- Which product owns it?
- Which catalog version introduced it?
- Does every field already exist in the common registry?
- If a field is product-specific, why should it not be common?
- Is the event high frequency?
- Is every field privacy-safe and non-content-bearing?

## Compatibility Rules

- Never repurpose an event or field.
- Never change an existing field type in place.
- Do not delete active events from catalogs; mark deprecated first.
- Do not make an optional field required without a new catalog version and migration note.
- Enum additions are allowed only when downstream parsers treat unknown values safely.
- Removed events must keep enough metadata for replay and error reporting.

## SDK Runtime Rule

`RealSignalLakeClient` requires `SignalLakeEventCatalog` after consent. If an
event is not present in the catalog, the SDK drops it before queueing and reports
the rejection through the optional reject listener. Plaintext validation happens
only in memory, before encryption.

## Database Rule

The governance database is the long-term source of truth, but SDKs consume
immutable catalog snapshots. This keeps SDKs small, offline-safe, and stable on
old devices while allowing the control plane to manage review and approval.
