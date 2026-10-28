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

Use [engine safeguards](engine-safeguards-pattern.md) to resolve DDL transaction/implicit-commit behavior and index/constraint lock/rewrite costs. A failed migration may leave partially applied work or invalid artifacts; record how to inspect, reconcile and clean up the exact target. Backfills use bounded batches/progress, safe resume and validation where material; schema compatibility includes old/new readers and writers during a staged rollout. An offline small change need not adopt an online migration protocol without a real need.

### Environment ownership and application readiness

Resolve who prepares, applies and verifies each local, preview, staging and production change from the active profile and task authority. Verify the actual engine/context, service-selected connection/schema and running artifact: a database's label or name alone does not identify its environment. Preparing SQL or passing a disposable-engine check does not update an existing application volume. Container initialization hooks may run only for an empty data directory.

When the owner has delegated local application updates, apply the reviewed required increments to that verified local runtime before a runnable handoff and check the affected application path. Otherwise identify the exact pending operator step and readiness limit. Do not extend local authority to staging/production, use schema synchronization as an unreviewed repair, or mutate runtime state during context-only work. Keep snapshots/constraints/settings and preserved-record checks proportionate to the change.

Deliver an ordered prerequisite list and an actual reviewed artifact through the accepted channel. If SQL/configuration is ignored by Git, state that a pull will not deliver it and provide the artifact/location to the responsible operator. Do not silently force-add private/environment-managed files or report a documented filename as an applied migration.

## Rules
DATA-SCHEMA-002 MUST inspect explicit database targets and never infer production names from local defaults.
DATA-SCHEMA-003 MUST not treat every db-init file as safe to rerun.
DATA-SCHEMA-004 MUST make environment-managed repeatable scripts preserve unrelated records.
DATA-SCHEMA-005 MUST address existing and fresh installations.
DATA-SCHEMA-006 MUST explain irreversibility before authorized destructive changes.
DATA-SCHEMA-007 MUST assess selected-engine transaction/commit restrictions, lock/rewrite/build costs, interruption artifacts and recovery for material schema/index changes before execution.
DATA-SCHEMA-008 MUST define bounded progress, safe resumption, conflict handling, compatibility and data validation for material backfills rather than treating a partially applied data rewrite as complete or blindly repeatable.

DATA-SCHEMA-009 MUST identify migration preparation/application/verification ownership and actual environment identity, distinguish disposable tests from authorized application-runtime readiness, and report required unapplied prerequisites before a runnable handoff.
DATA-SCHEMA-010 MUST provide reviewed ordered migration/configuration artifacts through the selected delivery channel, including explicit handling of ignored files; source availability, delivery and successful execution are separate states.

## Validation
Use a disposable target for first apply, repeated apply where promised, fresh bootstrap, upgrade, constraints/indexes, and affected runtime paths.

[TypeORM migration documentation](https://typeorm.io/docs/advanced-topics/migrations/) describes migration-based schema management; use the installed ORM version.
