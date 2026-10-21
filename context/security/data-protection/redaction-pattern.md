---
id: SEC-REDACT
status: baseline
scope: security
owner: application-maintainer
triggers: ["redaction", "logging payload", "entity serialization"]
---

# Response and diagnostic redaction pattern

## Guidelines

Choose allowed output fields at the boundary. Apply masking only when the remaining value still has a justified purpose.

## Why

A blacklist misses new sensitive fields and accidental nested serialization.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
internal model → explicit output schema → audience policy → redacted safe view
```

## Implementation

Use separate public, authorized detail, export, and operational diagnostic views when their audiences differ. Preserve enough non-sensitive correlation data for support. Treat reversible masking and stable pseudonyms as potentially sensitive.

## Rules

- **SEC-REDACT-001** — MUST build sensitive responses and logs from explicit approved fields.
- **SEC-REDACT-002** — MUST NOT expose credentials, signing material, connection strings, or internal stack details in ordinary client output.
- **SEC-REDACT-003** — MUST test nested and newly added fields against the intended output audience.

## Validation

Add synthetic secret markers in nested objects; assert their absence from response/log snapshots and expected errors.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [sensitive-data-pattern](sensitive-data-pattern.md)
- [security-logging-pattern](../observability/security-logging-pattern.md)
