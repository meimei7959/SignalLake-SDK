const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validateSchema(schema, value, options = {}) {
  const schemas = options.schemas ?? new Map();
  return validateNode(schema, value, "$", schemas);
}

function validateNode(schema, value, location, schemas) {
  if (schema.oneOf) {
    const matches = schema.oneOf
      .map((candidate) => validateNode(candidate, value, location, schemas))
      .filter((candidateErrors) => candidateErrors.length === 0);
    if (matches.length !== 1) {
      return [`${location}: expected exactly one oneOf schema to match`];
    }
    return [];
  }

  const errors = [];

  if (schema.allOf) {
    for (const candidate of schema.allOf) {
      errors.push(...validateNode(candidate, value, location, schemas));
    }
  }

  if (schema.$ref) {
    const ref = schemas.get(schema.$ref);
    if (!ref) {
      return [`${location}: unresolved schema ref ${schema.$ref}`];
    }
    return validateNode(ref, value, location, schemas);
  }

  errors.push(...validateType(schema, value, location));

  if (errors.length) {
    return errors;
  }

  if (Object.hasOwn(schema, "const") && value !== schema.const) {
    errors.push(`${location}: expected const ${JSON.stringify(schema.const)}`);
  }

  if (schema.enum && !schema.enum.includes(value)) {
    errors.push(`${location}: expected one of ${schema.enum.join(", ")}`);
  }

  if (typeof value === "string") {
    if (schema.minLength !== undefined && value.length < schema.minLength) {
      errors.push(`${location}: string shorter than ${schema.minLength}`);
    }
    if (schema.maxLength !== undefined && value.length > schema.maxLength) {
      errors.push(`${location}: string longer than ${schema.maxLength}`);
    }
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) {
      errors.push(`${location}: string does not match /${schema.pattern}/`);
    }
    if (schema.format === "uuid" && !uuidPattern.test(value)) {
      errors.push(`${location}: invalid uuid`);
    }
    if (schema.format === "date-time" && Number.isNaN(Date.parse(value))) {
      errors.push(`${location}: invalid date-time`);
    }
  }

  if (typeof value === "number") {
    if (schema.minimum !== undefined && value < schema.minimum) {
      errors.push(`${location}: number below ${schema.minimum}`);
    }
    if (schema.maximum !== undefined && value > schema.maximum) {
      errors.push(`${location}: number above ${schema.maximum}`);
    }
  }

  if (Array.isArray(value)) {
    if (schema.minItems !== undefined && value.length < schema.minItems) {
      errors.push(`${location}: array shorter than ${schema.minItems}`);
    }
    if (schema.maxItems !== undefined && value.length > schema.maxItems) {
      errors.push(`${location}: array longer than ${schema.maxItems}`);
    }
    if (schema.items) {
      value.forEach((item, index) => {
        errors.push(
          ...validateNode(schema.items, item, `${location}[${index}]`, schemas)
        );
      });
    }
  }

  if (isPlainObject(value)) {
    const properties = schema.properties ?? {};
    for (const name of schema.required ?? []) {
      if (!Object.hasOwn(value, name)) {
        errors.push(`${location}: missing required property ${name}`);
      }
    }

    if (schema.propertyNames?.pattern) {
      const pattern = new RegExp(schema.propertyNames.pattern);
      for (const name of Object.keys(value)) {
        if (!pattern.test(name)) {
          errors.push(
            `${location}: property name ${name} does not match /${schema.propertyNames.pattern}/`
          );
        }
      }
    }

    for (const [name, child] of Object.entries(value)) {
      if (Object.hasOwn(properties, name)) {
        errors.push(
          ...validateNode(properties[name], child, `${location}.${name}`, schemas)
        );
      } else if (schema.additionalProperties === false) {
        errors.push(`${location}: unexpected property ${name}`);
      } else if (isPlainObject(schema.additionalProperties)) {
        errors.push(
          ...validateNode(
            schema.additionalProperties,
            child,
            `${location}.${name}`,
            schemas
          )
        );
      }
    }

    if (
      schema.maxProperties !== undefined &&
      Object.keys(value).length > schema.maxProperties
    ) {
      errors.push(`${location}: too many properties`);
    }
  }

  return errors;
}

function validateType(schema, value, location) {
  if (!schema.type) {
    return [];
  }

  const allowed = Array.isArray(schema.type) ? schema.type : [schema.type];
  if (allowed.some((type) => matchesType(type, value))) {
    return [];
  }

  return [`${location}: expected type ${allowed.join(" | ")}`];
}

function matchesType(type, value) {
  if (type === "array") return Array.isArray(value);
  if (type === "integer") return Number.isInteger(value);
  if (type === "null") return value === null;
  if (type === "number") return typeof value === "number" && !Number.isNaN(value);
  if (type === "object") return isPlainObject(value);
  return typeof value === type;
}

function isPlainObject(value) {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
