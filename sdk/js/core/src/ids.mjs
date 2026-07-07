import { randomUUID } from "node:crypto";

export function defaultId() {
  return globalThis.crypto?.randomUUID?.() ?? randomUUID();
}

export function defaultNow() {
  return new Date().toISOString();
}

export function normalizeIsoDate(value, fieldName) {
  const iso = value instanceof Date ? value.toISOString() : value;
  if (typeof iso !== "string" || Number.isNaN(Date.parse(iso))) {
    throw new TypeError(`${fieldName} must be an ISO date-time string or Date`);
  }
  return iso;
}
