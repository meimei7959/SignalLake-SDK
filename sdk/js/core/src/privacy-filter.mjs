export class PrivacyViolationError extends Error {
  constructor(findings) {
    super(`SignalLake privacy violation: ${findings.join("; ")}`);
    this.name = "PrivacyViolationError";
    this.findings = findings;
  }
}

export const defaultPrivacyPolicy = {
  forbiddenPropertyNames: [
    "absolutePath",
    "base64",
    "clipboard",
    "clipboardText",
    "content",
    "email",
    "fileName",
    "filePath",
    "folderName",
    "folderPath",
    "imageData",
    "password",
    "phone",
    "rawContent",
    "rawText",
    "secret",
    "token"
  ],
  forbiddenNamePatterns: [
    /(^|_)(file|folder)?path$/i,
    /(^|_)(file|folder)?name$/i,
    /(^|_)clipboard/i,
    /(^|_)raw/i,
    /(^|_)(password|secret|token)$/i,
    /(^|_)(email|phone)$/i
  ],
  forbiddenStringValuePatterns: [
    { id: "unix-absolute-path", pattern: /^\/(Users|home|var|tmp|private|Volumes)\// },
    { id: "windows-absolute-path", pattern: /^[A-Za-z]:\\/ },
    { id: "looks-like-email", pattern: /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/ }
  ]
};

export function inspectEventProperties(properties = {}, policy = defaultPrivacyPolicy) {
  const findings = [];
  const exactNames = new Set(policy.forbiddenPropertyNames.map((name) => name.toLowerCase()));

  for (const [name, value] of Object.entries(properties)) {
    const normalized = name.toLowerCase();
    if (exactNames.has(normalized)) {
      findings.push(`event.properties.${name}: forbidden property name`);
    }
    if (policy.forbiddenNamePatterns.some((pattern) => pattern.test(name))) {
      findings.push(`event.properties.${name}: forbidden property name pattern`);
    }
    if (!isPrimitive(value)) {
      findings.push(`event.properties.${name}: value must be primitive`);
    }
    if (typeof value === "string") {
      for (const rule of policy.forbiddenStringValuePatterns) {
        if (rule.pattern.test(value)) {
          findings.push(`event.properties.${name}: matches ${rule.id}`);
        }
      }
    }
  }

  return findings;
}

export function assertPrivacySafe(properties = {}, policy = defaultPrivacyPolicy) {
  const findings = inspectEventProperties(properties, policy);
  if (findings.length) {
    throw new PrivacyViolationError(findings);
  }
  return { ...properties };
}

function isPrimitive(value) {
  return (
    value === null ||
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  );
}
