# SignalLake Common Fields

## Purpose

SignalLake SDK owns the cross-product event language. Products should design
events from this contract instead of inventing common fields per product.

The SDK owns:

- envelope field names and required shape
- common event property registry
- common enum values
- privacy-forbidden fields
- manifest lint rules for common vs product fields
- field versioning and deprecation policy
- catalog versioning and runtime registry validation

Products own:

- product-specific event triggers
- product-specific fields that are not reusable across products
- product manifest descriptions and privacy review notes

## Naming

Use `camelCase` for event properties and envelope JSON fields.

Do not use aliases for common fields. For example:

- Use `channelId`, not `channel`.
- Use `networkType`, not `network`.
- Use `errorCode`, not raw error message text.

## Envelope Fields

| Field | Owner | Source |
| --- | --- | --- |
| `schemaVersion` | SDK | SDK constant |
| `catalogVersion` | SDK/Catalog | Versioned catalog snapshot |
| `eventId` | SDK | SDK generated |
| `occurredAt` | SDK | SDK generated or host override for tests |
| `collectedAt` | SDK | SDK generated |
| `source.appId` | Product/SDK helper | Host config or Android Context package name |
| `source.product` | Product | Host config |
| `source.sdkName` | SDK | SDK constant |
| `source.sdkVersion` | SDK | SDK release/version constant |
| `source.platform` | Product/SDK helper | Host config |
| `source.appVersion` | Product/SDK helper | Host config or Android Context package info |
| `source.environment` | Product | Host config |
| `identity.anonymousId` | Product after consent | Host runtime identifier |
| `identity.deviceId` | Product after consent | Host runtime identifier, never hardware ID |
| `identity.userId` | Product after consent | Optional, only when product has consent and lawful basis |
| `session.sessionId` | SDK/Product | Host config or SDK session helper |
| `session.startedAt` | SDK/Product | Host config or SDK session helper |
| `session.sequence` | SDK | SDK generated |
| `event.name` | SDK/Product manifest | Base event or product event |
| `event.category` | SDK/Product manifest | Registry enum |
| `event.properties` | SDK/Product manifest | Common registry plus product fields |
| `privacy.privacyClass` | SDK/Product manifest | SDK default or manifest override |
| `privacy.consent` | SDK | SDK consent gate |
| `privacy.redactedFields` | SDK | SDK privacy filter |
| `encryption.keyId` | Product/backend | Runtime key config, never embedded production key |

## Common Event Properties

The canonical registry is `schemas/common-properties.v1.json`.

Event names and product fields are governed by versioned catalogs under
`catalogs/`. SDKs must validate events against the active catalog before
queueing.

| Field | Type | Owner | Source |
| --- | --- | --- | --- |
| `channelId` | string | SDK common | Host |
| `channelName` | string | SDK common | Host |
| `buildId` | string | SDK common | Host |
| `versionCode` | integer | SDK common | Android Context or host |
| `distribution` | enum | SDK common | Host |
| `locale` | string | SDK common | Android Context or host |
| `timezone` | string | SDK common | Android Context or host |
| `networkType` | enum | SDK common | Host, no SSID/BSSID/IP/MAC |
| `deviceTier` | enum | SDK common | Host |
| `osVersion` | string | SDK common | Android Context or host |
| `appForeground` | boolean | SDK common | Host lifecycle |
| `sessionDurationBucket` | enum | SDK common | Host or SDK |
| `durationBucket` | enum | SDK common | Host or SDK |
| `outcome` | enum | SDK common | Host or SDK |
| `errorCode` | string | SDK common | Host or SDK stable code |
| `screenId` | string | SDK common | SDK helper or host |
| `commandId` | string | SDK common | SDK helper or host |
| `protocol` | enum | SDK common | Host |
| `playerBackend` | string | SDK common | Host |
| `mediaKind` | enum | SDK common | Host |

## Product Fields

Product fields are allowed only when all are true:

- They are not already in the common registry.
- They are declared in the product event manifest with `scope: "product"`.
- They pass the SDK privacy guard.
- They do not contain user content, URLs, file paths, file names, local network
  identifiers, tokens, secrets, emails, phone numbers, Android ID, IMEI, SSID,
  BSSID, IP, or MAC.

If a field becomes useful across two or more products, promote it to
`schemas/common-properties.v1.json` and expose it through SDK constants and
builders before products depend on it.

## Manifest Governance

Every product manifest property must declare:

- `scope: "common"` when the field exists in the SDK common registry.
- `scope: "product"` when the field is product-specific.

Manifest lint fails when:

- a product marks a non-registry field as `common`
- a product marks a registry field as `product`
- a common field type or enum diverges from the registry
- a deprecated alias such as `channel` is used instead of `channelId`
- a forbidden privacy field appears

## Versioning

Current common field version: `signallake.common-fields.v1`.

Rules:

- Additive fields are allowed in the same major version.
- Never repurpose a field.
- Do not rename in place. Add the new field, mark the old one deprecated, and
  keep readers compatible for at least one schema version.
- Enum additions are allowed when downstream analytics treats unknown values
  safely.
- Enum removals require a new major version and migration notes.

## Android Usage

```java
Map<String, Object> props = SignalLakeProperties.builder()
    .channel("official")
    .buildId(BuildConfig.BUILD_ID)
    .networkType(SignalLakeCommonValues.NetworkType.ETHERNET)
    .outcome(SignalLakeCommonValues.Outcome.SUCCESS)
    .build();

analytics.trackCommandInvoked("settings.open", props);
```

Safe Android Context-derived fields:

```java
Map<String, Object> props = SignalLakeAndroidContext.commonProperties(context)
    .channel("official")
    .buildId(BuildConfig.BUILD_ID)
    .build();
```

The Android helper does not read network identifiers, hardware identifiers,
SSID/BSSID, IP, MAC, Android ID, IMEI, filenames, URLs, or media metadata.
