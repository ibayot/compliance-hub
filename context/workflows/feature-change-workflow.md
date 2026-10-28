# Feature or Bug-Fix Workflow

1. Classify the task and confirm request/acceptance scope from available evidence.
2. Read MASTER/profile and exact patterns; add domain/security/accessibility overlays.
3. Inspect existing consumers and user changes.
4. Produce the smallest sufficient plan, with rule IDs and validation; name affected high-consequence invariants and the checks that prove them.
5. For a defect, use [evidence-led debugging](debugging-workflow.md) and establish a controlled reproduction. Implement only the authorized behavior and focused checks, including [targeted red–green proof](../quality/testing-pattern.md) where applicable.
6. Update reusable context only when a standard or contract changes.
7. Validate and report delivered behavior, evidence, and limitations against the [completion gate](../quality/definition-of-done.md).

WF-FEATURE-001 MUST separate observed defects from proposed architecture changes. WF-FEATURE-002 MUST avoid broad refactors or release/deployment actions without corresponding scope.

For a new interface or material UI change, add [measured interface quality](../quality/ui-quality-pattern.md) rather than equating a successful build or attractive screenshot with usable behavior. Routine changes reuse established design decisions; this route does not restart product discovery or authorize telemetry/research collection.

For a substantive build slice, instantiate the [task-to-test map](../templates/execution-map-template.md) in the local application overlay: acceptance/risk -> owning files/interfaces -> meaningful test/check -> observed result. A generic template is portable; its application-specific instance and evidence are not.

For a new runnable application, follow the [application build workflow](application-build-workflow.md), including safe setup, startup, essential task execution, and an accurate preview/handoff. For content features, add [content authoring](../architecture/content-authoring-pattern.md) to resolve initial data, file paths, owner editing, persistence, and publication.
