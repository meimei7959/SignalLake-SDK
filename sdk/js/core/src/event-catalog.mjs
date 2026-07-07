export class EventCatalogValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "EventCatalogValidationError";
  }
}

export function normalizeEventCatalog(catalog) {
  if (!catalog || typeof catalog !== "object" || Array.isArray(catalog)) {
    throw new TypeError("event catalog must be an object");
  }
  requireString(catalog.catalogVersion, "catalog.catalogVersion");
  requireString(catalog.product, "catalog.product");
  requireString(catalog.appId, "catalog.appId");
  if (!Array.isArray(catalog.events) || catalog.events.length === 0) {
    throw new TypeError("catalog.events must be a non-empty array");
  }

  const events = new Map();
  for (const event of catalog.events) {
    requireString(event.name, "catalog.event.name");
    if (events.has(event.name)) {
      throw new TypeError(`catalog event ${event.name} is duplicated`);
    }
    events.set(event.name, {
      ...event,
      propertiesByName: indexProperties(event.name, event.properties ?? [])
    });
  }

  return Object.freeze({
    catalogVersion: catalog.catalogVersion,
    product: catalog.product,
    appId: catalog.appId,
    events
  });
}

export function assertCatalogMatchesSource(catalog, source) {
  if (catalog.product !== source.product) {
    throw new TypeError(`catalog.product ${catalog.product} does not match source.product ${source.product}`);
  }
  if (catalog.appId !== source.appId) {
    throw new TypeError(`catalog.appId ${catalog.appId} does not match source.appId ${source.appId}`);
  }
}

export function validateRegisteredEvent(catalog, input) {
  const event = catalog.events.get(input.name);
  if (!event) {
    throw new EventCatalogValidationError(`event ${input.name} is not registered in ${catalog.catalogVersion}`);
  }
  if (event.status === "planned" || event.status === "removed") {
    throw new EventCatalogValidationError(`event ${input.name} is not active`);
  }
  if (input.category !== event.category) {
    throw new EventCatalogValidationError(`event ${input.name} category must be ${event.category}`);
  }
  if (input.privacyClass && input.privacyClass !== event.privacyClass) {
    throw new EventCatalogValidationError(`event ${input.name} privacyClass must be ${event.privacyClass}`);
  }

  const properties = input.properties ?? {};
  for (const definition of event.propertiesByName.values()) {
    if (definition.required && !Object.hasOwn(properties, definition.name)) {
      throw new EventCatalogValidationError(`event ${input.name} missing required property ${definition.name}`);
    }
    if (definition.required && properties[definition.name] == null) {
      throw new EventCatalogValidationError(`event ${input.name} required property ${definition.name} is null`);
    }
  }

  for (const [name, value] of Object.entries(properties)) {
    const definition = event.propertiesByName.get(name);
    if (!definition) {
      throw new EventCatalogValidationError(`event ${input.name} property ${name} is not declared in catalog`);
    }
    validateCatalogProperty(input.name, definition, value);
  }

  return event;
}

function indexProperties(eventName, properties) {
  const out = new Map();
  for (const property of properties) {
    requireString(property.name, `${eventName}.property.name`);
    if (out.has(property.name)) {
      throw new TypeError(`${eventName}.${property.name} is duplicated`);
    }
    out.set(property.name, property);
  }
  return out;
}

function validateCatalogProperty(eventName, definition, value) {
  if (value == null) return;
  if (definition.type === "string" && typeof value !== "string") {
    throw new EventCatalogValidationError(`${eventName}.${definition.name} must be a string`);
  }
  if (definition.type === "number" && (typeof value !== "number" || Number.isNaN(value))) {
    throw new EventCatalogValidationError(`${eventName}.${definition.name} must be a number`);
  }
  if (definition.type === "integer" && !Number.isInteger(value)) {
    throw new EventCatalogValidationError(`${eventName}.${definition.name} must be an integer`);
  }
  if (definition.type === "boolean" && typeof value !== "boolean") {
    throw new EventCatalogValidationError(`${eventName}.${definition.name} must be a boolean`);
  }
  if (definition.enum && !definition.enum.includes(value)) {
    throw new EventCatalogValidationError(`${eventName}.${definition.name} has unsupported enum value`);
  }
}

function requireString(value, fieldName) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${fieldName} must be a non-empty string`);
  }
}
