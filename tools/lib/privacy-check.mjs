export function checkEventPrivacy(eventEnvelope, privacyRules) {
  const properties = eventEnvelope?.event?.properties ?? {};
  const policy = privacyRules.eventPropertyPolicy;
  const exactNames = new Set(
    policy.forbiddenPropertyNames.map((name) => name.toLowerCase())
  );
  const namePatterns = policy.forbiddenNamePatterns.map(
    (pattern) => new RegExp(pattern, "i")
  );
  const valuePatterns = policy.forbiddenStringValuePatterns.map((rule) => ({
    id: rule.id,
    pattern: new RegExp(rule.pattern)
  }));

  const findings = [];
  for (const [name, value] of Object.entries(properties)) {
    const normalized = name.toLowerCase();
    if (exactNames.has(normalized)) {
      findings.push(`event.properties.${name}: forbidden property name`);
    }
    if (namePatterns.some((pattern) => pattern.test(name))) {
      findings.push(`event.properties.${name}: forbidden property name pattern`);
    }
    if (typeof value === "string") {
      for (const rule of valuePatterns) {
        if (rule.pattern.test(value)) {
          findings.push(
            `event.properties.${name}: string matches forbidden value pattern ${rule.id}`
          );
        }
      }
    }
  }
  return findings;
}
