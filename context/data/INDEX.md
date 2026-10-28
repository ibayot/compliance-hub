# Data Context
- [Model and database](database-pattern.md)
- [Engine-neutral safeguards](engine-safeguards-pattern.md)
- [Queries](query-pattern.md)
- [Transactions](transaction-pattern.md)
- [Schema/bootstrap](schema-bootstrap-pattern.md)
- [Cache](cache-pattern.md)
- [Audit](audit-pattern.md)
- [Backup and restore](backup-restore-pattern.md)

Database engine and environment specifics come from the active profile. Shared safeguards apply to every selected engine; concrete capability/syntax behavior comes from its conditional technology pack, currently [PostgreSQL](../technology/databases/postgresql/INDEX.md), or an explicitly assessed engine contract. An available pack is not automatic adoption.
