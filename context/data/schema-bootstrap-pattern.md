---
id: CORE-DATA-SCHEMA-BOOTSTRAP
status: baseline
scope: data
owner: application-maintainers
---

# Schema, Bootstrap, and Incremental SQL

## Guidelines
DATA-SCHEMA-001 MUST distinguish fresh initialization, incremental upgrade, seed/reference data, and destructive reset scripts.

## Why
A script safe for an empty database may destroy an existing environment.

## Structure
~~~text
verify target -> inspect current schema/version -> backup if material
              -> apply bounded change -> verify invariants
              -> reapply repeatable update -> compare result
~~~

## Implementation
Profile decides migration mechanism. Document target selection, prerequisites, idempotence, compatibility, expected row effects, rollback limits, and fresh-install equivalence. Disable automatic ORM synchronization in managed deployments unless a specifically approved isolated workflow requires it.

## Rules
DATA-SCHEMA-002 MUST inspect explicit database targets and never infer production names from local defaults.
DATA-SCHEMA-003 MUST not treat every db-init file as safe to rerun.
DATA-SCHEMA-004 MUST make environment-managed repeatable scripts preserve unrelated records.
DATA-SCHEMA-005 MUST address existing and fresh installations.
DATA-SCHEMA-006 MUST explain irreversibility before authorized destructive changes.

## Validation
Use a disposable target for first apply, repeated apply where promised, fresh bootstrap, upgrade, constraints/indexes, and affected runtime paths.

[TypeORM migration documentation](https://typeorm.io/docs/advanced-topics/migrations/) describes migration-based schema management; use the installed ORM version.
