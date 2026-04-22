import * as path from 'path';

const BLOCKED_DYNAMIC_KEYS = new Set(['__proto__', 'prototype', 'constructor']);

export function resolvePathWithinRoot(rootPath: string, relativePath: string): string {
  const rootAbs = path.resolve(rootPath);
  const normalizedRelative = relativePath.replace(/\\/g, '/');
  const resolved = path.resolve(rootAbs, normalizedRelative);
  const rootWithSep = `${rootAbs}${path.sep}`;

  if (resolved !== rootAbs && !resolved.startsWith(rootWithSep)) {
    throw new Error('Path escapes storage root');
  }

  return resolved;
}

export function parseStringArrayJson(input: unknown): string[] {
  if (Array.isArray(input)) {
    return input.filter((entry): entry is string => typeof entry === 'string').map((entry) => entry.trim()).filter(Boolean);
  }

  if (typeof input !== 'string') return [];

  try {
    const parsed = JSON.parse(input) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((entry): entry is string => typeof entry === 'string')
      .map((entry) => entry.trim())
      .filter(Boolean);
  } catch {
    const trimmed = input.trim();
    return trimmed ? [trimmed] : [];
  }
}

export function sanitizeObjectByAllowlist<T extends Record<string, unknown>>(
  payload: Record<string, unknown>,
  allowedKeys: readonly (keyof T & string)[],
): Partial<T> {
  const out: Partial<T> = {};
  allowedKeys.forEach((key) => {
    if (!Object.prototype.hasOwnProperty.call(payload, key)) return;
    if (BLOCKED_DYNAMIC_KEYS.has(key)) return;
    (out as Record<string, unknown>)[key] = payload[key];
  });
  return out;
}
