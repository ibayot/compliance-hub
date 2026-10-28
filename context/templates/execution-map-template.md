# Scoped Task-to-Test Execution Map

Template only; replace placeholders with scoped decisions. Keep application-specific instances in its local overlay, not in exported shared context.

## Outcome and evidence status

Goal, non-goals, authorized scope, adopted profile/contracts, prerequisites, and ordering. Distinguish planned commands/files from existing verified ones. No blanket Git/install/deployment authority comes from a task list.

## Task: independently testable result

- Acceptance/risk IDs and owning rules.
- Exact files to create/modify and relevant consumers.
- Interfaces consumed/produced, with names, argument/result shape and owner.
- Named behavior tests with independently derived assertions, negative/recovery/race cases where relevant.
- Failing-before/passing-after proof for changed high-consequence invariants, or an explicit safe-evidence limitation.
- Commands and expected observable outcome, distinguishing offline fixtures from opt-in live checks.
- Privacy/environment/cleanup boundaries, dependency ordering and rollback/recovery limits.
- Current state: pending, blocked with reason, implemented/unverified, or verified with scoped evidence.

## Completion map

Include the [workflow completeness matrix](workflow-completeness-template.md) for multi-step tasks. Map upstream collection, carried values, downstream requirements and corrective paths to both UI and engineering checks. A populated fixture at a final route does not establish a traversable creation path. Record owner feedback that reopens acceptance separately from historical passing commands.

Map each acceptance criterion to its owning task, test/check, actual result and unresolved gap. A plan is not a passing test. Use [testing](../quality/testing-pattern.md), [debugging](../workflows/debugging-workflow.md), and [validation](../quality/validation-matrix.md) without repeating their rule declarations.

For a new runnable application, instantiate these applicable rows before handoff:

| Acceptance boundary | Expected observation | Actual evidence / remaining gap |
| --- | --- | --- |
| First run | Correct application directory; dependency install and lockfile; safe local environment; responding preview URL | Pending until executed |
| Essential routes | Each required list/tool/detail route renders, including direct load | Pending until executed |
| Tool input changes | Initial result, parameter edits under accepted refresh model, second input, clear/invalid/retry | Pending until executed |
| Database/runtime readiness | Verified environment and service-selected schema; required authorized increments applied or precise pending operator step; affected actual application path | Pending until observed |
| Report/export output | Cohort/denominator/coverage examples; all-options long-content preview and full export; optional-field scope and byte limits | Pending when applicable |
| Runtime dependency | Actual installed import and known synthetic result, including lazy loading | Pending until executed |
| External provider | Fixture results, browser/server policy and local/hosted behavior, permitted live-check status | Pending until executed |
| Content operations | Seed/empty/missing/invalid content and accepted editing/publication/persistence path | Pending until executed |
| Build and handoff | Build/types outcome, preview process status, owner actions, truthful completion state | Pending until executed |

Use [application build](../workflows/application-build-workflow.md) and the [completion gate](../quality/definition-of-done.md). Mark inapplicable rows with a reason; do not label pending or blocked rows passed, and keep actual credentials or confidential inputs out of evidence.
