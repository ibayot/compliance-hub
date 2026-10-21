---
id: SEC-CAPABILITY
status: baseline
scope: security
owner: application-maintainer
triggers: ["permission", "role", "capability"]
---

# Capability policy pattern

## Guidelines

Define operations in domain terms and evaluate them against the authenticated actor and resource context.

## Why

A named role alone cannot express every ownership, unit, tenancy, status, or delegation constraint.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
decision = policy(subject, capability, resource, context)
result = allow | deny; default = deny
```

## Implementation

Map the application's real role/group model to capabilities in its profile or domain records. Keep permission vocabulary canonical; distinguish view, create, edit, approve, export, and administrative actions where behavior differs.

## Rules

- **SEC-CAPABILITY-001** — MUST identify the capability and resource scope needed for each protected operation.
- **SEC-CAPABILITY-002** — MUST deny unknown capabilities and unresolved policy decisions.
- **SEC-CAPABILITY-003** — SHOULD reuse centralized policy evaluation rather than duplicate role-name comparisons across features.

## Validation

Create allowed and denied fixtures for each changed capability, including an actor with similar but insufficient privileges.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [backend-enforcement-pattern](backend-enforcement-pattern.md)
- [resource-scope-pattern](resource-scope-pattern.md)

Reference: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
