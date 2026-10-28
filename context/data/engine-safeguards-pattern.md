---
id: CORE-DATA-ENGINE-SAFEGUARDS
status: baseline
scope: data
owner: application-maintainers
triggers: [database adoption, database engine change, connection pool, query plan, migration, recovery]
---

# Database Engine Safeguards

## Guidelines

Apply this portable contract to every adopted database engine, including embedded and non-relational stores where the concern exists. Resolve concrete syntax and guarantees through the active profile, actual engine/driver versions, and the smallest applicable engine overlay. A shared requirement to assess a capability does not imply that every engine implements the same capability.

## Why

An ORM, familiar SQL spelling, successful empty-database test, or copied connection default does not establish storage semantics, operational safety, or recovery. Engine-specific details are part of the application contract, not an excuse to make the reusable baseline PostgreSQL-only.

## Structure

~~~text
application invariant and workload
  -> engine/version/driver/deployment contract
  -> supported capability or explicit alternative
  -> bounded operation and failure/recovery policy
  -> representative engine-backed evidence
~~~

## Implementation

Record the following with the application profile, owned data design, or implementation/configuration contract; do not duplicate them into every query:

| Concern | Information to resolve for the selected engine |
| --- | --- |
| Identity and compatibility | Engine/server, client/driver/ORM/migration/backup-tool versions; required extensions/features; storage/replica topology only where adopted |
| Representation | Null/missing/empty behavior, identifier and uniqueness rules, time/date/timezone, numeric precision/units, comparison/collation/case behavior, structured-value validation |
| Concurrency and integrity | Enforceable constraints, transaction/isolation boundaries, lock/conflict behavior, consistency/visibility expectations, and unsupported guarantees |
| Resource envelope | Connection/session limits where applicable; pool acquisition, operation/statement, lock wait, transaction lifetime, cancellation and retry budgets; shared web/worker/maintenance demand |
| Schema evolution | DDL transaction/implicit-commit behavior, lock/rewrite/index-build effects, partial failure artifacts, backfill progress, mixed-version compatibility and recovery limits |
| Diagnostics | Whether plan/profile tools execute statements, capture restricted values, or add load; safe target, representative workload, measurement units and redacted output |
| Recovery | Snapshot/export scope, consistency, engine/client compatibility, catalog/role/extension/key prerequisites where relevant, external dependencies and verified restore procedure |

For an embedded store, a single-writer queue or busy timeout may replace server-pool settings. For a store without a required transaction/constraint capability, document an explicit supported protocol or an unmet requirement; do not claim SQL-like guarantees or silently weaken the invariant. Mark genuinely inapplicable concerns with a reason. A future engine is not active merely because this library contains its pack.

The existing owners remain [data model](database-pattern.md), [transactions](transaction-pattern.md), [queries](query-pattern.md), [schema changes](schema-bootstrap-pattern.md), and [backup/restore](backup-restore-pattern.md). This pattern owns engine binding, capability assessment, operational budgets, and execution-aware diagnostics—not another copy of those invariants.

## Rules

- DATA-ENGINE-001 MUST bind the actual engine and relevant server/client/driver/migration/backup versions and required capabilities before relying on engine-specific behavior; planned choices remain labelled planned until manifests/runtime evidence exist.
- DATA-ENGINE-002 MUST assess relevant representation, concurrency, integrity, schema-change and recovery capabilities against the selected engine; unsupported or unverified guarantees require an explicit alternative, gap, or bounded exception rather than an assumption of cross-engine equivalence.
- DATA-ENGINE-003 MUST define finite resource, wait, lifetime, cancellation and retry budgets for database work according to the application's workload, including aggregate callers; document applicability and recovery on exhaustion rather than copying one engine's values globally.
- DATA-ENGINE-004 MUST treat execution-based plan/profile analysis as execution of the underlying work, inspect its possible mutations/external effects and sensitive output, and use only an authorized safe target; a diagnostic command name is not read-only authority.
- DATA-ENGINE-005 MUST release or recover owned connections/sessions/cursors/transactions on success, failure and cancellation, including reset or disposal of unsafe pooled state before reuse.
- DATA-ENGINE-006 MUST validate material assumptions with the adopted engine and representative controlled data; a substitute engine, schema parse or in-memory mock alone cannot prove production-engine semantics.

## Security

Use least-privileged runtime identities under SEC-SQL-003 and safe diagnostic fields under SEC-LOG-001 and SEC-REDACT-001. Driver exceptions, SQL traces, bind values, plans and connection strings can expose restricted data. Engine investigation does not authorize load against a provider/production instance or destructive resets.

## Validation

Select relevant tests for null/missing/precision/time boundaries, concurrent invariants, wait/connection exhaustion, cancellation cleanup, declared conflict retries, ambiguous completion, migration interruption, plan side effects, and isolated restore. Record the actual engine/version, environment, workload, command, result and limitations under QA-MATRIX-001/002. No runtime compliance is established by this document.

## Related

- [Data catalog](INDEX.md)
- [Technology selection](../technology/INDEX.md)
- [PostgreSQL overlay](../technology/databases/postgresql/INDEX.md)
- [Schema workflow](../workflows/schema-change-workflow.md)
- [SQL security](../security/input-output/sql-query-pattern.md)
- [Diagnostic redaction](../security/data-protection/redaction-pattern.md)
