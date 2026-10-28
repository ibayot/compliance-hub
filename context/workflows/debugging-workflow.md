---
id: WF-DEBUGGING
status: baseline
scope: routine diagnosis and authorized defect fixes
owner: application-maintainers
triggers: [bug, diagnosis, test failure, unexpected behavior, repeated failed fix]
---

# Evidence-Led Debugging

## Guidelines

Find a supported cause before changing behavior. Separate the observed symptom, working hypothesis, diagnostic experiment, and verified result. Use the smallest useful investigation; this is not a requirement to reopen the architecture for every defect.

## Why

Several speculative changes can hide which one mattered, create new symptoms, and expose private data through improvised diagnostics. A controlled reproduction and a falsifiable hypothesis make a fix explainable and repeatable.

## Structure

~~~text
authorized scope -> observe/reproduce -> isolate failing boundary
  -> one hypothesis -> smallest safe experiment -> inspect evidence
  -> authorized fix + regression proof -> affected checks -> report limits
~~~

## Investigation and implementation

1. **Confirm authority and target.** Distinguish diagnosis, read-only review, and a requested fix. Identify application/component, environment, data ownership, expected behavior, and relevant rule IDs. Existing reproduction tools may themselves mutate state; inspect their effect before running them.
2. **Capture the failure.** Record revision/environment, expected versus actual behavior, minimal inputs, exact steps/command, frequency, and safe error/trace references. Reproduce with controlled data where possible. An intermittent failure needs a documented trigger/observation window, not a claim that one passing attempt disproves it.
3. **Trace the boundary.** Read the error and relevant recent changes; compare a genuinely working path. Trace the bad value/state backward through the smallest affected call or transaction boundary. Check configuration *presence and validated shape*, version compatibility, ordering, and ownership without printing values. Separate an external dependency's confirmed response from an application assumption.
4. **State one hypothesis.** Describe what is believed to fail, why the evidence supports it, and what result would falsify it. Make one bounded experiment that discriminates between plausible causes. Rejected hypotheses remain useful evidence; do not stack unrelated fixes on top of them.
5. **Fix only when authorized.** Add the smallest behavior-level failing test or controlled reproducer, then change the owning boundary. Keep unrelated cleanup/refactors separate. Apply the [targeted red–green protocol](../quality/testing-pattern.md) rather than treating a changed line as proof.
6. **Verify and hand off.** Repeat the original reproduction, exercise affected negative/recovery paths and consumers, inspect the actual output, and report what remains untested. A passing focused check does not establish unrelated system health. Reuse suitable revision/scope-matched evidence under QA-MATRIX-004.

Diagnostic evidence can stay in the task's existing report or approved evidence location; this workflow does not mandate another committed incident/audit document. A repeated operational failure may justify a runbook update through its existing owner.

### Safe diagnostics

Prefer correlation IDs, state names, safe reason codes, type/length/count, elapsed time, version identifiers, and allowlisted configuration-presence flags. Do not dump complete request/response bodies, prompts, uploaded images, extracted proposals, credentials, connection strings, browser storage, or environment variables. Hashing a sensitive low-entropy value does not automatically make it safe to log.

Any newly authorized instrumentation has bounded volume/lifetime, explicit permitted fields, and a removal or continuing-owner decision. Screenshots, snapshots, traces, recordings, and test output are data stores too: use synthetic fixtures, obey the active retention policy, and review before sharing. SEC-LOG-001..003 and SEC-REDACT-001..003 own the logging/redaction controls.

Before printing configuration, inspect the diagnostic command's output contract. A source/Compose file may contain credentials even when the question concerns only a service name or database schema. Extract an allowlisted subset in-process and emit only safe results. Separate the public endpoint checked, original failing request and actual authenticated outcome; fixing a shared configuration read does not by itself prove a successful sign-in.

### Timing, uncertainty, and escalation

Wait for a meaningful condition with an explicit deadline rather than adding arbitrary sleeps. A delay that is the behavior being tested (for example a debounce interval) is different: document the clock and timing assertion. A clean retry can be an experiment, not proof that the cause is fixed.

If evidence points to an environmental, timing-dependent, or provider failure, state the uncertainty and observations. An authorized bounded timeout/retry/recovery change can be appropriate without pretending the unavailable dependency's internals are known. Unknown commit or external-call outcomes still need the relevant data/integration reconciliation contract.

Repeated failed experiments call for a fresh hypothesis/boundary review and possibly another reader; their count does not prove a bad architecture. Ask for direction when the next useful step needs new access, destructive/live changes, private disclosure, or a material architecture/scope change. Do not silently expand authority or abandon useful safe investigation merely because a fixed attempt count was reached.

## Rules

- WF-DEBUG-001 MUST distinguish observed failure, hypothesis, diagnostic result, and confirmed cause in substantive debugging work.
- WF-DEBUG-002 MUST identify the exact target and effect of reproduction/diagnostic actions and keep diagnosis-only work non-mutating unless a change is separately authorized.
- WF-DEBUG-003 MUST establish a controlled reproduction or explicitly document why it is intermittent/unavailable before claiming a fix is verified.
- WF-DEBUG-004 MUST test a specific falsifiable hypothesis with a bounded experiment rather than accumulate unrelated speculative fixes.
- WF-DEBUG-005 MUST constrain diagnostic capture to approved safe fields and the active privacy/retention policy, including temporary instrumentation and browser/test artifacts.
- WF-DEBUG-006 MUST repeat the original failing behavior and relevant regression/recovery checks before reporting it fixed; unavailable proof remains an explicit limitation.
- WF-DEBUG-007 SHOULD use condition-based waits with deadlines when readiness, not elapsed time, is the condition under test.
- WF-DEBUG-008 MUST reevaluate repeated failed hypotheses without treating a numerical failure count as proof of an architecture defect or authority to redesign.
- WF-DEBUG-009 MUST preserve user work and seek direction when further useful investigation requires expanded authority, destructive targets, or a material scope change.

## Validation

Review a representative defect's symptom/reproducer, hypothesis and disconfirming result, safe diagnostic fields, scoped fix, regression evidence, and remaining uncertainty. Check that diagnosis-only tasks do not alter source or live state, privacy markers stay out of captured artifacts, and deadline/retry exhaustion is actionable. No application-specific reproduction or fix is performed merely by adding this workflow.

## Related

- [Feature workflow](feature-change-workflow.md)
- [Testing](../quality/testing-pattern.md)
- [Validation matrix](../quality/validation-matrix.md)
- [Runbooks and diagnostics](../operations/runbook-pattern.md)
- [Incident response](../operations/incident-response-pattern.md)
- [Security logging](../security/observability/security-logging-pattern.md)
- [Diagnostic redaction](../security/data-protection/redaction-pattern.md)
