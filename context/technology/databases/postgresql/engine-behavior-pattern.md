---
id: TECH-PG-ENGINE
status: baseline
scope: PostgreSQL; only for profile-selected PostgreSQL work
owner: application-maintainers
triggers: [postgresql schema, postgresql transaction, postgresql query plan, postgresql migration, postgresql recovery]
---

# PostgreSQL Engine Behavior

## Guidelines

Resolve the portable [engine contract](../../../data/engine-safeguards-pattern.md) using supported PostgreSQL features and the actual driver/tool versions. This conditional overlay supplies PostgreSQL-specific checks; it does not activate PostgreSQL for unrelated applications or prescribe application data models.

## Why

Constraint, snapshot, connection, DDL and dump behavior can differ from an ORM's generic examples and from another database with similar SQL. Those differences matter to race safety and recovery.

## Implementation

| Boundary | PostgreSQL-specific review |
| --- | --- |
| Constraints/types | Resolve null behavior for checks and uniqueness, including whether nulls should compare distinct; choose supported constraint deferrability deliberately. Bind comparison/collation, exact numeric units, and instant versus civil-time representations. Validate structured JSON content separately from merely accepting JSONB. [Constraints](https://www.postgresql.org/docs/18/ddl-constraints.html) |
| Transactions | Read Committed uses statement snapshots; do not infer a stable multi-statement view without the chosen isolation/protocol. Retry declared serialization/deadlock failures at the whole-transaction boundary only when safe. Sequence increments are not rolled back with the surrounding transaction. [Isolation](https://www.postgresql.org/docs/18/transaction-iso.html), [serialization retries](https://www.postgresql.org/docs/18/mvcc-serialization-failure-handling.html) |
| Connections | Budget the total application/worker/maintenance connections. Bind acquisition, statement, lock and idle-transaction bounds in supported driver/server configuration; verify cancellation and transaction/session cleanup before a pooled connection is reused. [Client defaults](https://www.postgresql.org/docs/18/runtime-config-client.html) |
| Query plans | `EXPLAIN ANALYZE` actually executes the statement. Rollback is not a universal shield for sequence advancement or external effects. Use a representative disposable target for execution-based analysis, not arbitrary production mutations. [EXPLAIN](https://www.postgresql.org/docs/18/using-explain.html) |
| DDL/indexes | A normal index build and `CREATE INDEX CONCURRENTLY` have different lock/build costs. Concurrent builds cannot run inside a transaction block and can leave invalid indexes after failure. Choose an operation appropriate to the real workload and test cleanup instead of automatically using concurrent builds everywhere. [CREATE INDEX](https://www.postgresql.org/docs/18/sql-createindex.html) |
| Restore | A single-database logical dump does not include every cluster-global object or provide point-in-time recovery. Provision approved roles/ownership/extensions and other required dependencies separately, without exporting plaintext credentials. Match dump/restore client/server compatibility and validate a disposable restoration. [SQL dump](https://www.postgresql.org/docs/18/backup-dump.html), [pg_dump scope](https://www.postgresql.org/docs/18/app-pgdump.html) |

## Rules

- TECH-PG-001 MUST resolve relevant PostgreSQL constraint/null/deferrability, type/time/precision and comparison semantics with supported schema choices and direct negative tests, rather than assuming a generic ORM or another engine behaves identically.
- TECH-PG-002 MUST declare the PostgreSQL isolation/concurrency strategy and supported conflict signals for safe whole-transaction retry; an unknown commit outcome is reconciled under DATA-TXN-005 before non-idempotent replay.
- TECH-PG-003 MUST assess PostgreSQL DDL/index transaction restrictions, locking and failure artifacts before material changes, including an explicit compatible migration-runner mode for operations that cannot run in its normal transaction wrapper.
- TECH-PG-004 MUST verify logical-dump scope, target compatibility and role/ownership/extension prerequisites for the selected recovery procedure; a dump file alone does not establish point-in-time recovery or restored application correctness.

Connection/resource limits, execution-aware diagnostics, safe session cleanup and real-engine verification remain owned by DATA-ENGINE-003 through DATA-ENGINE-006. Schema/backfill and recovery duties remain owned by DATA-SCHEMA-007/008 and DATA-BACKUP-006; do not copy their declarations here.

## Validation

Exercise duplicate/null/reference cases, competing commands, serialization/deadlock retry exhaustion, unknown completion, acquisition/lock/statement limits, canceled pooled sessions, normal and non-transactional index migrations where applicable, interruption artifacts and isolated populated restore. Record PostgreSQL/driver/tool versions and actual outcomes; plan estimates are not runtime results.

## Related

- [Pack activation](INDEX.md)
- [Data model ownership](../../../data/database-pattern.md)
- [Transactions](../../../data/transaction-pattern.md)
- [Schema evolution](../../../data/schema-bootstrap-pattern.md)
- [Backup and restore](../../../data/backup-restore-pattern.md)
- [SQL authority](../../../security/input-output/sql-query-pattern.md)
