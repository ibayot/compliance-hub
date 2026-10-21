---
id: SEC-BACKEND-AUTHZ
status: baseline
scope: security
owner: application-maintainer
triggers: ["endpoint", "protected mutation", "export endpoint"]
---

# Server-side authorization enforcement pattern

## Guidelines

Enforce operation and object access at the trusted service boundary before data disclosure or mutation.

## Why

Clients can omit interface constraints, tamper with identifiers, and call endpoints directly.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
authenticate → validate request → capability check → scoped resource lookup → transition check → transaction → safe response
```

## Implementation

Use the framework's approved guards/policies and domain service checks. Cover direct, bulk, export, background, realtime, and internal-call paths. Check field-level mutations when some writable fields require stronger authority.

## Rules

- **SEC-BACKEND-AUTHZ-001** — MUST enforce authorization on every protected server entry point and relevant resource.
- **SEC-BACKEND-AUTHZ-002** — MUST ensure alternate and bulk paths apply the same effective policy as single-resource paths.
- **SEC-BACKEND-AUTHZ-003** — MUST NOT accept role, owner, unit, or permission claims from editable request fields as authority.

## Validation

Call the API without using the UI. Attempt foreign-resource IDs, forbidden fields, mixed-authority bulk inputs, and direct download/export access.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [capability-pattern](capability-pattern.md)
- [resource-scope-pattern](resource-scope-pattern.md)
- [authorization-test-matrix](../validation/authorization-test-matrix.md)

Reference: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
