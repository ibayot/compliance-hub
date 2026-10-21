---
id: SEC-RETENTION
status: baseline
scope: security
owner: application-maintainer
triggers: ["retention", "data deletion", "backup expiry"]
---

# Retention and deletion pattern

## Guidelines

Determine retention from verified business and legal requirements for each data category. Do not use an arbitrary global number.

## Why

Deleting the main record may leave searchable caches, previews, exports, logs, and backup copies.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
data category → purpose/authority → retention trigger → hold conditions → deletion/anonymization action → residual-copy policy → evidence
```

## Implementation

Record retention owners and approved schedules. Separate soft-delete visibility from actual disposal. Define legal holds, backup expiry, restore suppression/re-deletion, and limitations of physical erasure on the storage medium.

## Rules

- **SEC-RETENTION-001** — MUST define retention and disposal semantics for sensitive categories before enabling automated disposal.
- **SEC-RETENTION-002** — MUST apply approved holds and authorization checks before destructive deletion.
- **SEC-RETENTION-003** — MUST account for derived copies, caches, object versions, and backups without claiming immediate physical erasure unless verified.

## Validation

Use synthetic lifecycle fixtures; verify active holds, eligible records, derived copies, and restored-data handling. Do not run destructive production tests.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [sensitive-data-pattern](sensitive-data-pattern.md)
- [preview-replacement-pattern](../files/preview-replacement-pattern.md)
- [PROFILE](../../application/PROFILE.md)
