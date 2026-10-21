---
id: SEC-SCOPE
status: baseline
scope: security
owner: application-maintainer
triggers: ["record ID", "unit scope", "tenant", "owner"]
---

# Resource ownership and scope pattern

## Guidelines

Treat identifiers as lookup values, never as proof of access. Combine operation authority with ownership and organizational scope.

## Why

A valid ID can still identify a record the actor must not see or change.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
authorizedRecords = records constrained by subject scope
resource = authorizedRecords.find(requestedId)
then validate operation and current lifecycle state
```

## Implementation

Apply scope to counts, lists, search, detail, relationships, exports, and attachments. Validate both sides of a cross-record relationship. Choose public not-found versus forbidden semantics to match disclosure policy.

## Rules

- **SEC-SCOPE-001** — MUST validate access to every requested object and linked parent/child resource.
- **SEC-SCOPE-002** — MUST keep list, count, search, detail, and mutation scope semantically consistent.
- **SEC-SCOPE-003** — MUST prevent reassignment of ownership or scope through mass-assigned fields without the required permission.

## Validation

Swap IDs across owners/units, manipulate parent-child references, compare counts, and attempt unauthorized scope changes.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [capability-pattern](capability-pattern.md)
- [backend-enforcement-pattern](backend-enforcement-pattern.md)
- [download-access-pattern](../files/download-access-pattern.md)

Reference: [OWASP Insecure Direct Object Reference Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Insecure_Direct_Object_Reference_Prevention_Cheat_Sheet.html).
