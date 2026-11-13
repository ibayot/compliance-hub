# Schema Change Workflow

1. Identify data owner, actual target environment, runtime contract, and existing schema.
2. Read query/transaction/security rules relevant to the change.
3. Specify fresh install, upgrade, backfill/reference data, and rollback behavior.
4. Create the environment-appropriate migration/bootstrap artifacts.
5. Validate against a disposable target, including repeated apply when promised.
6. Apply required increments to the profile-authorized application environment, or record its responsible operator, exact pending action and incomplete readiness boundary. Do not infer remote authority from local authority.
7. Verify constraints, grants, running-artifact compatibility and the affected application path; a health response alone does not prove a protected workflow. Read the actual database catalog for types, constraint columns and referential actions. An ORM declaration or similarly named index does not establish enforcement.
8. Deliver ordered prerequisites/artifacts, deployment order and recovery limits, explicitly identifying environment-managed files that Git does not deliver.

WF-SCHEMA-001 MUST inspect destructive statements and exact targets before execution. WF-SCHEMA-002 MUST not run bootstrap/reset scripts against existing data merely to test documentation.

WF-SCHEMA-003 MUST distinguish prepared, delivered, disposable-tested and application-applied migrations and verify the selected runtime before claiming it ready; context-only tasks do not authorize database execution.

WF-SCHEMA-004 MUST preflight existing data before tightening integrity constraints. Verify enforcement on the selected database with a bounded negative case and an intended valid write. Stop on unresolved duplicates or orphans and document partial-apply recovery when the engine commits DDL independently. Keep user data and history during reconciliation.
