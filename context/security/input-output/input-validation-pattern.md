---
id: SEC-INPUT
status: baseline
scope: security
owner: application-maintainer
triggers: ["request body", "validation", "import", "webhook payload"]
---

# Boundary input validation pattern

## Guidelines

Define syntactic shape and domain meaning at every untrusted input boundary. Client validation improves feedback.

## Why

Type annotations and schema shape alone cannot establish resource ownership or a valid business transition.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
raw input → bounded parse → explicit schema → normalized value → semantic/domain checks → authorized action
```

## Implementation

Reject unexpected writable properties where feasible. Allow only approved enums, ranges, formats, lengths, and relationships. Specify Unicode, timezone, whitespace, and numeric precision semantics; normalize once rather than repeatedly transforming values.

## Rules

- **SEC-INPUT-001** — MUST validate untrusted input on the receiving trusted side before use.
- **SEC-INPUT-002** — MUST separate schema validity from authorization and domain-transition checks.
- **SEC-INPUT-003** — MUST bound parsing size, depth, list counts, and expensive validation work according to the active profile.

## Validation

Exercise missing, extra, malformed, boundary, deeply nested, oversized, and semantically invalid fields. Include queue and import entry points.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [sql-query-pattern](sql-query-pattern.md)
- [encoding-richtext-pattern](encoding-richtext-pattern.md)

Reference: [OWASP Input Validation](https://cheatsheetseries.owasp.org/cheatsheets/Input_Validation_Cheat_Sheet.html).
