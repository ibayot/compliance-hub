# Schema Change Workflow

1. Identify data owner, actual target environment, runtime contract, and existing schema.
2. Read query/transaction/security rules relevant to the change.
3. Specify fresh install, upgrade, backfill/reference data, and rollback behavior.
4. Create the environment-appropriate migration/bootstrap artifacts.
5. Validate against a disposable target, including repeated apply when promised.
6. Verify constraints, grants, runtime reads/writes, and reports.
7. Document deployment order and recovery limits.

WF-SCHEMA-001 MUST inspect destructive statements and exact targets before execution. WF-SCHEMA-002 MUST not run bootstrap/reset scripts against existing data merely to test documentation.
