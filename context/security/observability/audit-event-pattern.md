---
id: SEC-AUDIT
status: baseline
scope: security
owner: application-maintainer
triggers: ["permission change", "sensitive mutation", "audit event"]
---

# Security audit event pattern

## Guidelines

Record security-significant decisions and changes with enough context to reconstruct actor, action, target, and outcome.

## Why

Operational logs alone may omit the authoritative identity or transition required to review a sensitive event.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
{eventId, timestamp, actorId/type, action, targetRef, outcome, safeReasonCode, correlationId}; append-only or equivalently controlled sink
```

## Implementation

Choose required events from domain workflows. Define consistency with mutations, delivery failure policy, duplicate handling, access, retention, and tamper protections. Reference sensitive targets rather than copying full records.

## Rules

- **SEC-AUDIT-001** — MUST define audit expectations when adding sensitive operations or permission changes.
- **SEC-AUDIT-002** — MUST derive actor identity from verified context and distinguish service identity from delegated user identity.
- **SEC-AUDIT-003** — MUST protect audit records against unauthorized reading, alteration, and deletion while excluding credential values.

## Validation

Check successful/denied/failed operations, missing actor context, retries, audit-sink failure, and permitted audit readers using synthetic records.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [security-logging-pattern](security-logging-pattern.md)
- [retention-deletion-pattern](../data-protection/retention-deletion-pattern.md)
