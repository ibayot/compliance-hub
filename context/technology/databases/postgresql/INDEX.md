---
id: TECH-PG-PACK
status: baseline
scope: PostgreSQL; conditional activation
triggers: [postgresql]
---

# PostgreSQL Pack

Apply this pack only when the active [application profile](../../../application/PROFILE.md) selects PostgreSQL for the affected component. Future applications using another database retain the [engine-neutral safeguards](../../../data/engine-safeguards-pattern.md) and select or define their own bounded engine overlay; PostgreSQL syntax and isolation defaults do not become universal rules.

Start with engine/server, driver, migration and backup-tool versions from actual manifests/configuration, then load [engine behavior](engine-behavior-pattern.md) for schema, transaction, query-plan, connection or restore work. The linked PostgreSQL 18 references illustrate the current selected major; verify the version being changed rather than treating a documentation link as permission to upgrade.

No ORM, hosting topology, extension, database role, transaction isolation level, pool size or timeout value is selected merely by this pack's presence. Application-specific values belong to the profile and owned implementation contract.

## Validation

Use the real selected PostgreSQL version in a disposable controlled environment, testing applicable constraints, concurrency, migration and restore assumptions. A planning record or a passing context validator is not database evidence (DATA-ENGINE-006, QA-MATRIX-002).

## Related

- [Technology router](../../INDEX.md)
- [Shared data catalog](../../../data/INDEX.md)
- [Official PostgreSQL documentation](https://www.postgresql.org/docs/)
