---
id: TECH-SQL-QUERY
status: baseline
scope: "SQL; applicable only when enabled by the application profile"
triggers:
  - "SQL query"
  - "search"
  - "dynamic sorting"
---

# Parameterized Queries

## Guidelines

Bind data values through the approved driver/ORM and allowlist structural choices.

## Why

Values and SQL identifiers require different handling; escaping a field name as a value cannot secure arbitrary SQL structure.

## Structure

```text
Pseudocode:
columns = { "created": knownCreatedColumn, "name": knownNameColumn }
orderColumn = columns[validatedSortKey]
execute("SELECT id, name FROM items WHERE unit_id = ?", [authorizedUnitId])
// Compose ordering only from known columns and allowed directions.
```

## Implementation

Apply resource scope in the database query where feasible. Bound pagination and search terms; use query-builder APIs for structural clauses. An authenticated user-supplied unit ID still requires authorization.

## Rules

- `TECH-SQL-QUERY-001` MUST bind externally influenced SQL data values through the approved parameter interface.
- `TECH-SQL-QUERY-002` MUST allowlist externally selected columns, operators, and sort directions.
- `TECH-SQL-QUERY-003` MUST preserve authorization predicates in count, search, export, and detail queries.

## Validation

Inspect generated SQL with synthetic data and test injection-shaped values, forbidden scope, negative limits, and count/data parity.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://dev.mysql.com/doc/refman/8.4/en/sql-prepared-statements.html)
