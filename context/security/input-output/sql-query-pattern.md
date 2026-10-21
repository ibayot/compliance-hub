---
id: SEC-SQL
status: baseline
scope: security
owner: application-maintainer
triggers: ["SQL", "query builder", "sort column", "filter"]
---

# Query parameterization and database authority pattern

## Guidelines

Keep values separate from executable query structure. Treat ORM raw fragments as code requiring explicit review.

## Why

Using an ORM does not protect manually concatenated SQL or unlimited data access.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
validated value → bound parameter
requested sort/filter key → explicit allowed identifier map → query builder
query → least-privileged database identity
```

## Implementation

Bind values using the selected driver's API. Map non-parameterizable identifiers and sort direction from allowlists. Enforce resource scope and bound query cost independently of injection prevention.

## Rules

- **SEC-SQL-001** — MUST parameterize caller-controlled data values in database queries.
- **SEC-SQL-002** — MUST allowlist dynamic identifiers/operators rather than concatenate raw request strings.
- **SEC-SQL-003** — MUST give application database identities only the privileges their runtime duties require.

## Validation

Verify query parameter binding, unknown sort rejection, foreign-scope filtering, and database privilege separation using local test fixtures.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [input-validation-pattern](input-validation-pattern.md)
- [resource-scope-pattern](../authorization/resource-scope-pattern.md)

Reference: [OWASP SQL Injection Prevention](https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html).
