---
id: SEC-CLASSIFY
status: baseline
scope: security
owner: application-maintainer
triggers: ["new data field", "export", "sensitive data"]
---

# Data classification pattern

## Guidelines

Classify data by the harm of disclosure, alteration, and loss. Use provisional public, internal, confidential, and restricted labels only until application owners confirm the actual scheme.

## Why

Field-level decisions are easier to review when storage, response, log, export, and retention expectations are explicit.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
field/group | classification | purpose | allowed actors | stores | outputs | retention owner | deletion constraints
```

## Implementation

Classify identifiers, attachments, derived previews, logs, telemetry, caches, backups, and test fixtures. Record applicable legal requirements as confirmed profile inputs; do not infer a jurisdiction or retention period.

## Rules

- **SEC-CLASSIFY-001** — MUST document purpose and permitted audiences before adding sensitive data to a new flow.
- **SEC-CLASSIFY-002** — MUST propagate protection requirements to derived copies and exports.
- **SEC-CLASSIFY-003** — MUST record unknown legal or retention obligations for owner resolution rather than inventing compliance claims.

## Validation

Follow one sensitive field from collection to deletion and inspect all copies. Confirm classification has an accountable application owner.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [sensitive-data-pattern](../data-protection/sensitive-data-pattern.md)
- [retention-deletion-pattern](../data-protection/retention-deletion-pattern.md)
- [PROFILE](../../application/PROFILE.md)
