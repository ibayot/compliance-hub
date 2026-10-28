---
id: CORE-QUALITY-TESTING
status: baseline
scope: quality
owner: application-maintainers
---

# Testing Pattern

## Guidelines
QA-TEST-001 MUST test the behavior and invariant that could fail, rather than mirror implementation details.

## Why
Focused tests provide evidence with less maintenance and execution cost than a broad suite disconnected from the request.

## Structure
~~~text
acceptance criterion -> failure risk -> smallest useful check
                    -> controlled fixture -> assertion -> evidence
~~~

## Implementation
Use unit tests for pure rules, integration tests for persistence/contracts, and E2E for critical user flows. Add visual/accessibility checks for appropriate UI changes. Isolate data, clocks, actors, external dependencies, and cleanup.

### Targeted red–green evidence

For a changed high-consequence invariant or a defect regression, establish a behavior-level test or controlled reproducer before applying the fix where feasible. Relevant invariants include authorization/approval gates, destructive operations, uniqueness/idempotency, money or quota accounting, concurrent state transitions, privacy/retention boundaries, and restart/restore recovery. The application profile and task determine the actual risk set; this is not a requirement for a test per function or test-first prose/configuration edits.

1. Name the behavior that would be wrong and the observable outcome that should expose it. Derive expected results independently of the implementation under test, using hand-checked fixtures or literal outcomes rather than computing both sides with the same helper.
2. Run the focused test against the missing/broken behavior. Confirm failure is for the intended reason, not a bad fixture, syntax/import failure, unrelated outage, or accidental live-provider call. Record that observation.
3. Implement the smallest authorized change, run the same test to observe success, and then run the relevant consumer/negative/recovery checks. Widen scope for affected dependencies or unresolved risk, not automatically for every unrelated package.
4. If the code already exists, a controlled isolated removal/mutation of the fix can demonstrate that the test catches the failure. Never delete user-owned work, weaken assertions, or mutate a live environment merely to manufacture a red result.

An unavailable harness, unsafe reproduction, or external-only failure is an explicit evidence gap. Use a safe narrower test or documented manual reproduction when appropriate and report exactly what it proves; a passing test written afterward is not falsely described as observed red–green evidence. Avoid real secrets/personal records, unapproved provider spend, external publication, or destructive cleanup in tests. A mocked external boundary is appropriate when needed to control such effects; assertions still exercise the application's behavior rather than only the mock's configuration.

### Fixture validity, lifecycle and integrated observations

Before treating a failure as regression proof, establish that the fixture reaches the intended boundary: use existing schema columns, exact related record/destination/version identities and a valid external-adapter result shape. A permission test against a nonexistent column or an intake lacking its required fact is a fixture failure, not the intended red. Preserve and report those corrections separately (QA-TEST-006/007/009).

Make disposable resources belong to the parent invocation where child startup failure, timeout or forced termination can bypass child cleanup. Confine paths, database/container labels and shutdown identities to that invocation; verify ownership immediately before cleanup. Do not kill whatever owns a port, scan ordinary secrets, or broadly delete generated-looking resources. Test failed startup as well as normal teardown, and preserve independent test isolation across files (QA-TEST-004/005).

Wait for the actual record/dependency state before measuring an integrated screen. Take layout diagnostics and the asserted measurement from a consistent observation; a heading may render before data. Exercise representative populated/long-content states as well as isolated empty ones. Preserve valid assertions while distinguishing test races from real overflow or state bugs. For a final aggregate, record the artifact/source identity, executed commands and outcomes, retain failed-run logs, and invalidate or deliberately rerun affected evidence when implementation bytes change. Scoped passing evidence is not feature, live-provider or owner acceptance (QA-TEST-002/003/009).

## Rules
QA-TEST-002 MUST cover negative and recovery paths when changed behavior depends on them.
QA-TEST-003 MUST not claim skipped, unrun, flaky, or environment-blocked tests passed.
QA-TEST-004 SHOULD keep fixtures representative without real personal data/secrets.
QA-TEST-005 MUST not perform destructive cleanup against an unverified environment.
QA-TEST-006 MUST identify changed high-consequence invariants and defect regressions for targeted failing-before/passing-after proof, or record why that proof cannot safely be established and the resulting limitation.
QA-TEST-007 MUST derive expected outcomes independently of the production logic under test and verify that an observed failure exposes the intended missing/broken behavior.
QA-TEST-008 MUST preserve user work and valid assertions when establishing regression evidence; test-first guidance does not authorize deleting existing implementation, weakening acceptance criteria, or causing live external effects.
QA-TEST-009 MUST report observed red–green evidence distinctly from a passing-after-only test, manual reproduction, reused evidence, or an unrun check.

## Validation
Run targeted checks first. Broaden only for affected dependencies, new failures, or unresolved risk. Preserve useful failure artifacts with safe data and record limitations.

For targeted regression proof, inspect the meaningful red result, green result, independent expectation, test environment, and affected-path checks. Apply the [debugging workflow](../workflows/debugging-workflow.md) for investigation and [measured UI quality](ui-quality-pattern.md) for substantive interface evidence. Existing evidence reuse remains governed by QA-MATRIX-004; a reused valid check is not represented as a new execution.
