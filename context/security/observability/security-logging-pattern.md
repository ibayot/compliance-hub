---
id: SEC-LOG
status: baseline
scope: security
owner: application-maintainer
triggers: ["security log", "request logging", "diagnostic payload"]
---

# Security logging and redaction pattern

## Guidelines

Use structured events with safe reason codes and correlation fields. Log security-relevant failures without dumping whole requests.

## Why

Logs must support investigation without becoming another credential or personal-data store.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
event(name, severity, correlationId, actorRef?, outcome, safeFields); excluded: passwords/tokens/keys/full confidential bodies
```

## Implementation

Sanitize untrusted log fields and bound lengths to prevent injection or log amplification. Limit access, retention, and transport. Align clocks and define alert ownership for actionable signals.

Select safe diagnostics before capture, including tool/terminal output. Parse only the needed configuration keys or compare sensitive values in-process and emit safe presence/type/status results. Do not print complete environment files, secret-bearing Compose/source configuration, browser storage or raw command output first and try to redact it in a later message. Synthetic markers may validate redaction without copying real credentials.

## Rules

- **SEC-LOG-001** — MUST exclude credentials and unnecessarily sensitive payloads from logs and tracing.
- **SEC-LOG-002** — MUST encode or structure untrusted fields so they cannot forge additional log entries.
- **SEC-LOG-003** — MUST document security-log access, retention, and failure behavior for required events.

## Validation

Inject harmless newline and synthetic credential markers into failed requests; confirm one structured safe event and no sensitive values.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [audit-event-pattern](audit-event-pattern.md)
- [redaction-pattern](../data-protection/redaction-pattern.md)
- [incident-response-pattern](incident-response-pattern.md)

Reference: [OWASP Logging](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html).
