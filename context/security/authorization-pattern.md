---
id: SEC-AUTHZ-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["permission", "scope", "role", "capability"]
---

# Authorization context router

## Guidelines

Load capability and backend enforcement patterns for access changes; add resource scope and frontend presentation when applicable.

## Why

Policy definition, enforcement, and interface presentation must remain aligned while retaining distinct responsibilities.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
capability vocabulary → trusted policy enforcement → object/scope constraints → permission-aware UI → decision matrix
```

## Implementation

Resolve the application's concrete capability/role vocabulary through its profile and domain documents. Use resource and service identity patterns for cross-record and cross-service changes.

## Rules

- **SEC-AUTHZ-ROUTE-001** — MUST evaluate policy, entry-point enforcement, and affected object scope together when changing permissions.
- **SEC-AUTHZ-ROUTE-002** — MUST update the authorization matrix when a permission change alters an allow/deny outcome.

## Validation

Trace each new or changed permission to a trusted decision point and at least one relevant allowed and denied test.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [capability-pattern](authorization/capability-pattern.md)
- [backend-enforcement-pattern](authorization/backend-enforcement-pattern.md)
- [frontend-visibility-pattern](authorization/frontend-visibility-pattern.md)
- [resource-scope-pattern](authorization/resource-scope-pattern.md)
- [authorization-test-matrix](validation/authorization-test-matrix.md)
- [PROFILE](../application/PROFILE.md)
