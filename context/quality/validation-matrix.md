# Validation Matrix

Choose checks by changed behavior and risk. This matrix defines evidence selection; it does not authorize mutations to a live environment.

| Change | Minimum relevant evidence | Expand when |
| --- | --- | --- |
| Context/docs only | Links, rule IDs, catalog reachability, routing scenarios, diff/ignore check | Code examples or semantic rules changed |
| UI style/layout | Build/types, affected consumer review, representative screenshots, keyboard/responsive states | Interaction, scope, form, native behavior changed |
| Shared component | Props/types, representative consumers and state variants | Broad rollout or visual regression risk |
| Form/list behavior | Validation, loading/error/empty, duplicate submit, stale results/pagination | Shared state or backend contract changed |
| Permissions | Capability + resource/unit/owner/status matrix, direct API negatives | Download/export/internal entrypoints affected |
| Backend/API | Build, relevant unit/integration/contract tests, negative inputs | Transactions, security, concurrency, integrations |
| Data/SQL | Target review, safe fresh/upgrade/repeatability tests, constraints/runtime compatibility | Destruction, backfill, engine/version change |
| Docker/config | Explicit file-set validation, image/build evidence, health/storage/network checks | Deployment or restart/data risk |
| Release | Acceptance evidence, version/artifact alignment, migration/notes/rollback review | Public/native distribution, production rollout |

- QA-MATRIX-001 MUST report actual commands, environment, outcome, and untested boundaries.
- QA-MATRIX-002 MUST distinguish a passing structural/documentation check from behavioral/security assurance.
- QA-MATRIX-003 MUST avoid running a mutating formatter/linter or live workflow as a read-only audit step.
- QA-MATRIX-004 SHOULD reuse valid existing evidence only when its revision, scope, and assumptions still match.

No application build is required merely because a Markdown index changed. Example code must be checked against the active implementation before it is copied into production.
