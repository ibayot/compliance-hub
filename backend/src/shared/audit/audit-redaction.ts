const SENSITIVE_FIELD_NAMES = new Set([
  'password',
  'passwordHash',
  'password_hash',
  'defaultPassword',
  'default_password',
  'mfaCode',
  'mfa_code',
  'mfaExpiresAt',
  'mfa_expires_at',
  'mfaLastVerifiedAt',
  'mfa_last_verified_at',
  'mfaAttempts',
  'mfa_attempts',
  'mfaChallengeAttempts',
  'mfa_challenge_attempts',
  'mfaLockedUntil',
  'mfa_locked_until',
  'token',
  'tokenHash',
  'token_hash',
  'refreshToken',
  'refresh_token',
  'accessToken',
  'access_token',
  'secret',
  'smtpPassword',
  'smtp_password',
  'googleSub',
  'google_sub',
]);

/** Recursively redact secrets from audit data before it is stored or returned. */
export function redactAuditValue(value: any): any {
  if (Array.isArray(value)) return value.map(redactAuditValue);
  if (value instanceof Date) return value.toISOString();
  if (!value || typeof value !== 'object') return value;

  return Object.fromEntries(
    Object.entries(value).map(([key, child]) => [
      key,
      SENSITIVE_FIELD_NAMES.has(key) ? '[REDACTED]' : redactAuditValue(child),
    ]),
  );
}

/** Redact a JSON payload while preserving the string format expected by the API/UI. */
export function redactAuditJson(value: unknown): string | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== 'string') return JSON.stringify(redactAuditValue(value));

  try {
    return JSON.stringify(redactAuditValue(JSON.parse(value)));
  } catch {
    return value;
  }
}
