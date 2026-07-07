import { defaultId, defaultNow, normalizeIsoDate } from "./ids.mjs";
import { assertPrivacySafe, defaultPrivacyPolicy } from "./privacy-filter.mjs";
import { validateCommonProperties } from "./common-fields.mjs";
import {
  assertCatalogMatchesSource,
  normalizeEventCatalog,
  validateRegisteredEvent
} from "./event-catalog.mjs";

const DEFAULT_CONSENT = Object.freeze({
  analytics: true,
  diagnostics: true
});

export function createEventBuilder(options) {
  const source = requireObject(options?.source, "source");
  const identity = requireObject(options?.identity, "identity");
  const session = requireObject(options?.session, "session");
  const id = options.id ?? defaultId;
  const now = options.now ?? defaultNow;
  const policy = options.policy ?? defaultPrivacyPolicy;
  const catalog = normalizeEventCatalog(options?.catalog);
  let sequence = Number.isInteger(session.sequenceStart) ? session.sequenceStart : 0;

  requireString(source.appId, "source.appId");
  requireString(source.product, "source.product");
  requireString(source.sdkName, "source.sdkName");
  requireString(source.sdkVersion, "source.sdkVersion");
  requireString(source.platform, "source.platform");
  requireString(source.environment, "source.environment");
  requireString(identity.anonymousId, "identity.anonymousId");
  requireString(identity.deviceId, "identity.deviceId");
  requireString(session.sessionId, "session.sessionId");
  requireString(session.startedAt, "session.startedAt");
  assertCatalogMatchesSource(catalog, source);

  return {
    buildEvent(input) {
      const properties = assertPrivacySafe(input.properties ?? {}, policy);
      validateCommonProperties(properties);
      const registeredEvent = validateRegisteredEvent(catalog, {
        name: input.name,
        category: input.category,
        privacyClass: input.privacyClass,
        properties
      });
      sequence += 1;

      return {
        schemaVersion: "signallake.event-envelope.v1",
        catalogVersion: catalog.catalogVersion,
        eventId: input.eventId ?? id(),
        occurredAt: normalizeIsoDate(input.occurredAt ?? now(), "occurredAt"),
        collectedAt: normalizeIsoDate(input.collectedAt ?? now(), "collectedAt"),
        source: {
          appId: source.appId,
          product: source.product,
          sdkName: source.sdkName,
          sdkVersion: source.sdkVersion,
          platform: source.platform,
          appVersion: source.appVersion,
          environment: source.environment
        },
        identity: {
          anonymousId: identity.anonymousId,
          deviceId: identity.deviceId,
          ...(identity.userId ? { userId: identity.userId } : {})
        },
        session: {
          sessionId: session.sessionId,
          startedAt: normalizeIsoDate(session.startedAt, "session.startedAt"),
          sequence
        },
        event: {
          name: requireString(input.name, "event.name"),
          category: requireString(input.category, "event.category"),
          properties
        },
        privacy: {
          privacyClass: input.privacyClass ?? registeredEvent.privacyClass ?? defaultPrivacyClass(input.category),
          consent: input.consent ?? DEFAULT_CONSENT,
          redactedFields: input.redactedFields ?? []
        }
      };
    },
    getSequence() {
      return sequence;
    }
  };
}

function defaultPrivacyClass(category) {
  if (category === "error") return "diagnostic";
  if (category === "system") return "operational";
  return "behavioral";
}

function requireObject(value, fieldName) {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new TypeError(`${fieldName} must be an object`);
  }
  return value;
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
  return value;
}
