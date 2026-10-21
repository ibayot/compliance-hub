---
id: SEC-SENSITIVE
status: baseline
scope: security
owner: application-maintainer
triggers: ["PII", "personal data", "sensitive response"]
---

# Sensitive and personal data pattern

## Guidelines

Define a legitimate application purpose, minimum fields, permitted audiences, and copy destinations before collecting or exposing personal data.

## Why

An authorized user may still receive more information than the workflow requires.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
purpose → minimal collection schema → permitted processing → explicit response fields → controlled export → retention
```

## Implementation

Use explicit request and response contracts rather than serializing whole entities. Review telemetry, analytics, email, AI prompts, attachments, and support diagnostics as distinct disclosure channels.

## Rules

- **SEC-SENSITIVE-001** — MUST limit sensitive fields to the current actor's permitted purpose and scope.
- **SEC-SENSITIVE-002** — MUST NOT use real personal records in examples or ordinary test fixtures.
- **SEC-SENSITIVE-003** — MUST record new third-party disclosures and required owner decisions in the application profile or approved domain context.

## Validation

Inspect actual response, export, notification, log, and diagnostic shapes using synthetic records with distinctive sensitive values.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [data-classification](../foundations/data-classification.md)
- [redaction-pattern](redaction-pattern.md)
- [retention-deletion-pattern](retention-deletion-pattern.md)

Reference: [OWASP User Privacy Protection](https://cheatsheetseries.owasp.org/cheatsheets/User_Privacy_Protection_Cheat_Sheet.html).
