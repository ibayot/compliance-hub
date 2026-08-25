import { redactAuditJson, redactAuditValue } from './audit-redaction';

describe('audit redaction', () => {
  it('redacts sensitive fields recursively and preserves dates', () => {
    const date = new Date('2026-08-25T00:00:00.000Z');
    expect(
      redactAuditValue({ passwordHash: 'hash', nested: { mfaCode: '123456' }, date }),
    ).toEqual({
      passwordHash: '[REDACTED]',
      nested: { mfaCode: '[REDACTED]' },
      date: date.toISOString(),
    });
  });

  it('redacts JSON payloads while keeping non-sensitive audit fields', () => {
    expect(redactAuditJson('{"passwordHash":"hash","role":"desktop_jr"}')).toBe(
      '{"passwordHash":"[REDACTED]","role":"desktop_jr"}',
    );
  });
});
