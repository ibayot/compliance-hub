# Definition of Done

For setup and multi-step workflows, apply [workflow completeness](../application/workflow-completeness.md). An owner-reported blocked essential journey reopens its affected acceptance even when earlier automated checks passed. Record the defect and repair/retest scope without discarding unrelated verified work or treating a documentation change as code remediation (APP-COMPLETE-004..008).

A substantive change is complete when:

1. Authorized acceptance criteria are met.
2. Applicable rule IDs and affected consumers were considered.
3. Evidence matches the risk and scope.
4. Failures and untested boundaries are reported accurately.
5. Reusable convention changes are reflected in owned context.
6. Exceptions, migration debt, and follow-up work are explicit.
7. Only in-scope files changed and user work is preserved.
8. Release artifacts and audience-specific notes are included when an application release is in scope.

QA-DONE-001 MUST not claim legacy-wide conformance from checking only a changed file. QA-DONE-002 MUST not mark a scoped audit incomplete merely because unrelated areas remain unreviewed; state its actual coverage.

QA-DONE-003 MUST not report a requested runnable application or essential feature as complete/working while a required install, startup, route, runtime dependency, or primary-flow check is failed or unexecuted. Report implemented/unverified or incomplete with the specific blocker and remaining acceptance criteria; a generic caveat after a blanket success claim is insufficient.

QA-DONE-004 MUST distinguish implemented source, tested fixtures, disposable engine, running local application, staging/production and owner observations in a runnable handoff. Required runtime/schema prerequisites must be applied within existing authority or remain an explicit blocker; neither a generic healthy service nor a successful adjacent request proves the requested user journey. Context-only completion needs context validation, not a deployment.

## Acceptance check before reporting completion

For a small fix, keep a few lines in the task notes. For broader work, use the [task-to-test map](../templates/execution-map-template.md). Start from the user's request, corrections, exclusions and approved references. A useful row reads: requested behavior | user or capability, entry and surface | expected visible or durable outcome | actual observation and status. For an approved reference, record the specific traits the user asked to reproduce and the traits they excluded. For a broad change, inventory the requested page families or workflows before selecting representative routes; name the families or variants left unverified.

- QA-DONE-005 MUST give every material requirement and preservation constraint an observable acceptance check before implementation. Re-read the request and relevant clarifications before handoff, independently of the diff or implementation plan, and reconcile every row with the delivered result. If the user reports a mismatch, reopen that row, reproduce the reported conditions when feasible and retest affected shared consumers after the repair.
- QA-DONE-006 MUST verify changed UI in the running application at the requested entry and affected surface. Inspect the rendered result for visual criteria. Exercise the normal user entry, actions and final visible outcome for behavior criteria. For a state change, verify the durable result through reload, reopening or the affected downstream consumer when applicable.
- QA-DONE-007 MUST label each material result as verified, implemented but unverified, failed, blocked or outstanding. Qualify every claim by its observed scope and give the actual obstacle when runtime evidence is unavailable. Compilation, type checks, code inspection, a screenshot or an API response each support only the boundary they exercised. Fix and retest recoverable failures within scope before reporting.

For example, “build passed” can accompany “detail action implemented; authorized browser flow unverified.” A screenshot can establish a visible placement in that state; it cannot establish the action works or stays visible after scrolling. A requested image of the actual app requires capturing and inspecting the running app in the stated mode.

For initial builds, use the [application build and handoff workflow](../workflows/application-build-workflow.md). Completion includes the accepted owner operating workflow, such as content editing/publication, alongside the public reader experience. [Intake](../application/intake.md) resolves that scope; this is not an instruction to add an unrequested authentication system. Context validation, a production build, API documentation research, mocks, and actual browser/provider results are separate evidence categories.
