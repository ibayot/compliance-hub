---
id: TECH-SQL-TXN
status: baseline
scope: "SQL; applicable only when enabled by the application profile"
triggers:
  - "SQL transaction"
  - "migration"
  - "bootstrap"
---

# Transactions and Schema Scripts

## Guidelines

Treat multi-step mutations and schema evolution as separate operations with explicit ownership.

## Why

An application transaction does not guarantee that DDL is rollback-safe on the chosen engine.

## Structure

```sql
START TRANSACTION;
UPDATE items SET status = 'reviewed' WHERE id = 123;
-- Illustrative DML only: add ownership checks and audit writes as required.
COMMIT;
```

## Implementation

Use a single transaction manager/connection for dependent data changes. Confirm lock behavior, deadlock handling, and idempotency. For schema/bootstrap scripts, check engine-specific DDL commits, existing-data compatibility, and repeat application rather than assuming the DML sample covers migration safety.

## Rules

- `TECH-SQL-TXN-001` MUST state the transaction boundary and failure behavior for dependent mutations.
- `TECH-SQL-TXN-002` MUST verify schema-script behavior on the application's actual database engine.
- `TECH-SQL-TXN-003` MUST NOT treat an initialization script as proof that existing volumes will be upgraded.

## Validation

Apply to a disposable representative database, exercise failure midway, verify rollback of DML, and rerun schema scripts when idempotency is required.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://mariadb.com/docs/server/reference/sql-statements/transactions/sql-statements-that-cause-an-implicit-commit)
