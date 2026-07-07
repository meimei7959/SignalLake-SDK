export const COMMON_FIELDS_VERSION = "signallake.common-fields.v1";
export const COMMON_FIELDS_NAMING = "camelCase";

export const SignalLakeEnvelopeFields = Object.freeze({
  SCHEMA_VERSION: "schemaVersion",
  CATALOG_VERSION: "catalogVersion",
  EVENT_ID: "eventId",
  OCCURRED_AT: "occurredAt",
  COLLECTED_AT: "collectedAt",
  SOURCE_APP_ID: "source.appId",
  SOURCE_PRODUCT: "source.product",
  SOURCE_SDK_NAME: "source.sdkName",
  SOURCE_SDK_VERSION: "source.sdkVersion",
  SOURCE_PLATFORM: "source.platform",
  SOURCE_APP_VERSION: "source.appVersion",
  SOURCE_ENVIRONMENT: "source.environment",
  IDENTITY_ANONYMOUS_ID: "identity.anonymousId",
  IDENTITY_DEVICE_ID: "identity.deviceId",
  IDENTITY_USER_ID: "identity.userId",
  SESSION_ID: "session.sessionId",
  SESSION_STARTED_AT: "session.startedAt",
  SESSION_SEQUENCE: "session.sequence",
  EVENT_NAME: "event.name",
  EVENT_CATEGORY: "event.category",
  EVENT_PROPERTIES: "event.properties",
  PRIVACY_CLASS: "privacy.privacyClass",
  PRIVACY_CONSENT: "privacy.consent",
  PRIVACY_REDACTED_FIELDS: "privacy.redactedFields",
  ENCRYPTION_KEY_ID: "encryption.keyId"
});

export const SignalLakeCommonFields = Object.freeze({
  APP_ID: "appId",
  PRODUCT: "product",
  SDK_NAME: "sdkName",
  SDK_VERSION: "sdkVersion",
  PLATFORM: "platform",
  APP_VERSION: "appVersion",
  ENVIRONMENT: "environment",
  ANONYMOUS_ID: "anonymousId",
  DEVICE_ID: "deviceId",
  USER_ID: "userId",
  SESSION_ID: "sessionId",
  EVENT_ID: "eventId",
  EVENT_TIME: "occurredAt",
  SCHEMA_VERSION: "schemaVersion",
  CATALOG_VERSION: "catalogVersion",
  KEY_ID: "keyId",
  CHANNEL_ID: "channelId",
  CHANNEL_NAME: "channelName",
  BUILD_ID: "buildId",
  VERSION_CODE: "versionCode",
  DISTRIBUTION: "distribution",
  LOCALE: "locale",
  TIMEZONE: "timezone",
  NETWORK_TYPE: "networkType",
  DEVICE_TIER: "deviceTier",
  OS_VERSION: "osVersion",
  APP_FOREGROUND: "appForeground",
  SESSION_DURATION_BUCKET: "sessionDurationBucket",
  DURATION_BUCKET: "durationBucket",
  OUTCOME: "outcome",
  ERROR_CODE: "errorCode",
  SCREEN_ID: "screenId",
  COMMAND_ID: "commandId",
  PROTOCOL: "protocol",
  PLAYER_BACKEND: "playerBackend",
  MEDIA_KIND: "mediaKind"
});

export const SignalLakeCommonValues = Object.freeze({
  DISTRIBUTION: Object.freeze({
    OFFICIAL: "official",
    APP_STORE: "app-store",
    ENTERPRISE: "enterprise",
    INTERNAL: "internal",
    TEST: "test",
    UNKNOWN: "unknown"
  }),
  NETWORK_TYPE: Object.freeze({
    WIFI: "wifi",
    ETHERNET: "ethernet",
    CELLULAR: "cellular",
    OFFLINE: "offline",
    UNKNOWN: "unknown"
  }),
  DEVICE_TIER: Object.freeze({
    LOW: "low",
    MID: "mid",
    HIGH: "high",
    UNKNOWN: "unknown"
  }),
  SESSION_DURATION_BUCKET: Object.freeze({
    UNDER_10S: "0_10s",
    S10_TO_30S: "10_30s",
    S30_TO_60S: "30_60s",
    M1_TO_5M: "1_5m",
    M5_TO_30M: "5_30m",
    M30_PLUS: "30m_plus",
    UNKNOWN: "unknown"
  }),
  DURATION_BUCKET: Object.freeze({
    UNDER_1S: "0_1s",
    S1_TO_3S: "1_3s",
    S3_TO_10S: "3_10s",
    S10_TO_30S: "10_30s",
    S30_TO_60S: "30_60s",
    M1_TO_5M: "1_5m",
    M5_PLUS: "5m_plus",
    UNKNOWN: "unknown"
  }),
  OUTCOME: Object.freeze({
    SUCCESS: "success",
    FAILURE: "failure",
    CANCELLED: "cancelled",
    SKIPPED: "skipped",
    UNKNOWN: "unknown"
  }),
  PROTOCOL: Object.freeze({
    DLNA: "dlna",
    AIRPLAY: "airplay",
    MIRACAST: "miracast",
    CHROMECAST: "chromecast",
    LOCAL: "local",
    UNKNOWN: "unknown"
  }),
  MEDIA_KIND: Object.freeze({
    IMAGE: "image",
    VIDEO: "video",
    AUDIO: "audio",
    LIVE: "live",
    DOCUMENT: "document",
    UNKNOWN: "unknown"
  })
});

const COMMON_FIELD_DEFINITIONS = Object.freeze({
  channelId: stringPattern(/^[a-z][a-z0-9._-]{0,63}$/, "host"),
  channelName: stringMax(64, "host"),
  buildId: stringPattern(/^[A-Za-z0-9._:-]{1,80}$/, "host"),
  versionCode: integerMin(0, "android-context-or-host"),
  distribution: enumField(Object.values(SignalLakeCommonValues.DISTRIBUTION), "host"),
  locale: stringPattern(/^[A-Za-z]{2,8}([_-][A-Za-z0-9]{2,8})*$/, "android-context-or-host"),
  timezone: stringPattern(/^[A-Za-z0-9_+./:-]{1,64}$/, "android-context-or-host"),
  networkType: enumField(Object.values(SignalLakeCommonValues.NETWORK_TYPE), "host"),
  deviceTier: enumField(Object.values(SignalLakeCommonValues.DEVICE_TIER), "host"),
  osVersion: stringPattern(/^[A-Za-z0-9._ -]{1,40}$/, "android-context-or-host"),
  appForeground: { type: "boolean", source: "host" },
  sessionDurationBucket: enumField(Object.values(SignalLakeCommonValues.SESSION_DURATION_BUCKET), "host-or-sdk"),
  durationBucket: enumField(Object.values(SignalLakeCommonValues.DURATION_BUCKET), "host-or-sdk"),
  outcome: enumField(Object.values(SignalLakeCommonValues.OUTCOME), "host-or-sdk"),
  errorCode: stringPattern(/^[A-Z][A-Z0-9_]{1,63}$/, "host-or-sdk"),
  screenId: stringPattern(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, "host-or-sdk"),
  commandId: stringPattern(/^[a-z][a-z0-9]*(\.[a-z][a-z0-9]*)*$/, "host-or-sdk"),
  protocol: enumField(Object.values(SignalLakeCommonValues.PROTOCOL), "host"),
  playerBackend: stringPattern(/^[a-z][a-z0-9._-]{0,63}$/, "host"),
  mediaKind: enumField(Object.values(SignalLakeCommonValues.MEDIA_KIND), "host")
});
const PROPERTY_NAME_PATTERN = /^[a-z][a-zA-Z0-9_]{0,63}$/;

export function getCommonFieldDefinitions() {
  return COMMON_FIELD_DEFINITIONS;
}

export function buildCommonProperties(input = {}) {
  if (!input || typeof input !== "object" || Array.isArray(input)) {
    throw new TypeError("common properties input must be an object");
  }
  const properties = {};
  for (const fieldName of Object.keys(COMMON_FIELD_DEFINITIONS)) {
    if (Object.hasOwn(input, fieldName) && input[fieldName] !== undefined) {
      properties[fieldName] = input[fieldName];
    }
  }
  validateCommonProperties(properties, { allowProductFields: false });
  return properties;
}

export function validateCommonProperties(properties, options = {}) {
  if (properties == null) return;
  if (typeof properties !== "object" || Array.isArray(properties)) {
    throw new TypeError("event.properties must be an object");
  }

  const allowProductFields = options.allowProductFields !== false;
  for (const [fieldName, value] of Object.entries(properties)) {
    if (!PROPERTY_NAME_PATTERN.test(fieldName)) {
      throw new TypeError(`${fieldName} must use camelCase property naming`);
    }
    const definition = COMMON_FIELD_DEFINITIONS[fieldName];
    if (!definition) {
      if (!allowProductFields) {
        throw new TypeError(`unknown common property ${fieldName}`);
      }
      continue;
    }
    validateCommonField(fieldName, value, definition);
  }
}

function validateCommonField(fieldName, value, definition) {
  if (value == null) return;
  if (definition.type === "string") {
    if (typeof value !== "string") {
      throw new TypeError(`${fieldName} must be a string`);
    }
    if (definition.maxLength && value.length > definition.maxLength) {
      throw new TypeError(`${fieldName} must be <= ${definition.maxLength} chars`);
    }
    if (definition.pattern && !definition.pattern.test(value)) {
      throw new TypeError(`${fieldName} has invalid format`);
    }
  } else if (definition.type === "integer") {
    if (!Number.isInteger(value)) {
      throw new TypeError(`${fieldName} must be an integer`);
    }
    if (definition.minimum !== undefined && value < definition.minimum) {
      throw new TypeError(`${fieldName} must be >= ${definition.minimum}`);
    }
  } else if (definition.type === "boolean") {
    if (typeof value !== "boolean") {
      throw new TypeError(`${fieldName} must be a boolean`);
    }
  }

  if (definition.enum && !definition.enum.includes(value)) {
    throw new TypeError(`${fieldName} must be one of ${definition.enum.join(", ")}`);
  }
}

function stringPattern(pattern, source) {
  return { type: "string", pattern, source, owner: "sdk-common-property" };
}

function stringMax(maxLength, source) {
  return { type: "string", maxLength, source, owner: "sdk-common-property" };
}

function integerMin(minimum, source) {
  return { type: "integer", minimum, source, owner: "sdk-common-property" };
}

function enumField(values, source) {
  return { type: "string", enum: Object.freeze([...values]), source, owner: "sdk-common-property" };
}
