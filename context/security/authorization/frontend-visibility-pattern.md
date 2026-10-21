---
id: SEC-FRONTEND-AUTHZ
status: baseline
scope: security
owner: application-maintainer
triggers: ["hidden action", "disabled control", "restricted selector"]
---

# Permission-aware interface pattern

## Guidelines

Use the approved capability selector to present available actions. Define hidden, read-only, disabled, and denied states deliberately.

## Why

Consistent visibility avoids misleading controls while the server remains responsible for actual enforcement.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
capability snapshot + resource state → visible/enabled action; server denial → safe message + stale-state refresh
```

## Implementation

Limit selector/search options to the authorized scope. Clear user-scoped state on identity change. Define behavior for existing values that become inaccessible; avoid revealing their labels through cached options.

## Rules

- **SEC-FRONTEND-AUTHZ-001** — MUST use canonical capability checks for protected interface actions.
- **SEC-FRONTEND-AUTHZ-002** — MUST handle a server denial even when the interface previously allowed the action.
- **SEC-FRONTEND-AUTHZ-003** — MUST NOT load restricted data merely to hide it with CSS or filter it after delivery to the client.

## Validation

Check denied actors, stale permissions, deep links, unauthorized selector searches, and user changes with populated caches.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [backend-enforcement-pattern](backend-enforcement-pattern.md)
- [resource-scope-pattern](resource-scope-pattern.md)
