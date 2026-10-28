# Validation Matrix

Choose checks by changed behavior and risk. This matrix defines evidence selection; it does not authorize mutations to a live environment.

| Change | Minimum relevant evidence | Expand when |
| --- | --- | --- |
| Context/docs only | Links, rule IDs, catalog reachability, routing scenarios, diff/ignore check | Code examples or semantic rules changed |
| New runnable application | Actual install/lockfile, safe local configuration, responding startup URL, build/types, each essential UI task, and accurate preview status | Authored content, runtime libraries, external providers, privileged operations |
| UI style/layout | Build/types, affected consumer review, representative screenshots, keyboard/responsive states | Interaction, scope, form, native behavior changed |
| Shared component | Props/types, representative consumers and state variants | Broad rollout or visual regression risk |
| Form/list behavior | Validation, loading/error/empty, duplicate submit, stale results/pagination | Shared state or backend contract changed |
| Setup/multi-step/generated draft | Field-to-consumer map, changed-input entry-to-outcome journey, missing requirement corrected at its owning stage, explicit none/default/override semantics | Preview/production contracts differ, activation and request readiness are distinct, owner feedback reopens acceptance |
| Permissions | Capability + resource/unit/owner/status matrix, direct API negatives | Download/export/internal entrypoints affected |
| Backend/API | Build, relevant unit/integration/contract tests, negative inputs | Transactions, security, concurrency, integrations |
| Runtime library/provider | Resolved-version API and actual import; deterministic success/error fixtures; intended browser/server request and permitted live check status | CSP/CORS, lazy loading, deployment-only headers, free quota, response schema drift |
| Repository content/editor | Seed or accepted empty state, list/detail routes, missing/invalid files, working-directory and packaging checks; selected editing/publication/persistence path | Authenticated admin, durable remote writes, build/redeploy visibility |
| Data/SQL | Verified target/owner, safe fresh/upgrade/repeatability checks, profile-authorized application update or explicit pending operator step, affected runtime path | Destruction, backfill, engine/version change, ignored migration delivery |
| Configurable reports | Period/cohort/denominator/coverage examples, current authorization, optional-field payload limits, all-options populated/narrow/print layout, complete preview/export reconciliation | Historical corrections, missing intervals, saved templates, narrative fields |
| Client update detection | Public metadata/credential boundary, controlled visible/hidden interval checks, dependency readiness, loop/sign-out/dirty-work behavior | Multiple tabs, stale cache, packaged/native delivery |
| Docker/config | Explicit file-set validation, image/build evidence, health/storage/network checks | Deployment or restart/data risk |
| Release | Acceptance evidence, version/artifact alignment, migration/notes/rollback review | Public/native distribution, production rollout |

- QA-MATRIX-001 MUST report actual commands, environment, outcome, and untested boundaries.
- QA-MATRIX-002 MUST distinguish a passing structural/documentation check from behavioral/security assurance.
- QA-MATRIX-003 MUST avoid running a mutating formatter/linter or live workflow as a read-only audit step.
- QA-MATRIX-004 SHOULD reuse valid existing evidence only when its revision, scope, and assumptions still match.

- QA-MATRIX-005 MUST label each observation by actual environment, source/build identity and tested boundary; mocks and disposable databases do not establish the running application's schema or user-facing readiness.
- QA-MATRIX-006 MUST not equate public configuration/health, rejected synthetic credentials or a domain-service read with a successful real sign-in or protected journey. Use authorized synthetic identities/fixtures or an owner walkthrough and state any remaining boundary without borrowing credentials or bypassing authentication.

No application build is required merely because a Markdown index changed. Example code must be checked against the active implementation before it is copied into production.

Use the [application build workflow](../workflows/application-build-workflow.md) and [definition of done](definition-of-done.md) for runnable handoffs. A documented setup recipe is not observed first-run evidence, and a successful compile is not a functional tool, integration, or editor check.
