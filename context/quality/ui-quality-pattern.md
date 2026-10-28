---
id: QA-UI-QUALITY
status: baseline
scope: substantive interface design, usability, and UI performance changes
owner: application-maintainers
triggers: [new UI, visual direction, usability, UI performance, interface acceptance]
---

# Measured Interface Quality

## Guidelines

Evaluate what people can understand and accomplish, not just whether controls respond or a screenshot looks polished. Use a proportionate combination of visual critique, task observation, accessibility checks, and representative performance evidence. This pattern does not select a framework, component library, palette, telemetry service, or universal numeric benchmark.

## Why

An attractive demo can conceal an undiscoverable action, inaccessible recovery path, unbounded list, or slow edit interaction. Explicit tasks, fixtures, and measurement definitions make improvements testable while separating human evidence from designer or AI inference.

## Structure

~~~text
user/job + constraints -> focused visual/interaction direction
  -> representative states and content -> build/prototype
  -> task + accessibility + visual + performance checks
  -> observed result/limitations -> scoped revision -> comparable retest
~~~

## Implementation and evidence

### Visual direction and critique

For an initial interface or material redesign, write a compact direction covering the primary task, information hierarchy, density, palette/type roles, layout, and purposeful distinguishing feature if one is useful. Reuse active tokens and components; propose a new variant only through its existing owner. A small wireframe or two alternatives is useful when it resolves a real choice, not as a required ceremony for a routine control change.

Before choosing an unspecified visual direction, follow the preference/reference question and delegation rules in [application intake](../application/intake.md). Record the user's theme/palette/reference or delegation in the local profile. Do not restart that question when approved design guidance or an explicit instruction to choose already resolves it.

Review the direction against the brief before implementing. After a prototype/build exists, inspect representative screenshots or the actual surface with realistic short, average, and long content. Include empty/loading/validation/error/disabled/stale/recovery states where applicable, not only a successful populated screen. Critique alignment, hierarchy, readable density, copy clarity, and whether decoration earns its place. Novelty is not a reason to replace established workflows or weaken semantics. FND-UI-001..004 and DS-CATALOG-001..004 remain authoritative.

### Task-based usability

Apply [workflow completeness](../application/workflow-completeness.md) to multi-step forms and generated drafts: carry changed values to their consumer, identify stage-specific blockers, provide correction links and keep the default synthetic journey traversable. Incomplete scenarios must be explicit. Compare counters and allowed actions with the field/transition contract rather than accepting hard-coded success or incompleteness labels (APP-COMPLETE-003..007).

Use a short goal-oriented scenario with a known starting state, permitted data, expected committed outcome, and observable success/failure conditions. “Find a record needing attention and open the most urgent one” evaluates discovery; “click the red filter” teaches the answer. Keep instructions neutral and record assistance, confusion, recovery attempts, and stop conditions.

For a single-owner application, an owner walkthrough can be a sufficient first qualitative round. Do not invent participants, require recruitment infrastructure, or call an AI persona a user study. Label expert walkthroughs, automated checks, owner observations, and simulated feedback separately. Preserve sample/context limitations; a successful run with one person/device does not establish population-wide usability or accessibility conformance.

Capture only the minimal safe result needed for a finding. Observation notes can name the task, affected state, consequence, observed evidence, uncertainty, proposed remedy, and retest condition without storing confidential content or a recording. User contact, recording, external research uploads, or tracking integration needs its own task authority and privacy policy.

### Measurements and representative workloads

Choose measurements that inform a decision. A small local prototype may use completion/error/recovery observations and elapsed task time; a performance change may use production bundle/chunk sizes, request waterfalls, interaction/render duration, layout stability, memory growth, or a long-list workload. Select the applicable subset rather than require every measure everywhere.

Before interpreting a rate or claiming improvement, identify the metric, eligible attempts/denominator, success event, observation window, fixture/data volume, device/browser/build revision, cold/warm condition, exclusions, and comparison baseline. A click or optimistic UI is not a committed server outcome. Baseline/target values may initially be unknown; record that instead of inventing precision or importing a third party's universal threshold.

Use representative data volume and interaction sequences, including repeated navigation/edit cycles where resource growth is a risk. Separate frontend responsiveness, backend/queue latency, and external-provider delay. Account for retries, background polling, and artifact collection when measuring resource/cost impact. Repeat noisy measurements sufficiently for the claimed comparison and state method/tolerance. Do not load-test a third party, add paid tools, or collect real-user telemetry merely to satisfy this pattern.

### Accessibility and browser review

Apply the active accessibility target with semantic names/roles/states, keyboard operation, visible unobscured focus, non-color feedback, zoom/reflow, contrast, theme changes, and reduced-motion behavior. Check native controls in the supported environment, meaningful input purpose, dirty-draft navigation, long text, image dimensions/layout shifts where images exist, and locale-aware displayed numbers/dates. Preserve pointer/keyboard alternatives and inspect error recovery as a complete task.

Static scans, screenshots, or automated interactions do not alone demonstrate accessibility conformance. FND-A11Y-001..005 owns the foundational requirements. Performance optimizations preserve those semantics: virtualization/code splitting/cache advice is workload- and architecture-dependent, not an automatic requirement at a fixed list size.

### Private data and findings

Use synthetic fixtures for screenshots, traces, videos, DOM snapshots, test reports, and performance runs. Real data capture needs explicit approval and retention/access controls; transient inputs prohibited from persistence remain prohibited in test/debug artifacts. Never serialize confidential form text into URLs merely to make every UI state deep-linkable. Safe navigation/filter identifiers can preserve history without exposing private content.

Classify findings as observed defect, evidence-supported improvement, preference/proposal, or unverified gap. Prioritize consequence, affected task/state, frequency/evidence, and recovery cost rather than visual taste alone. Keep findings in the authorized task/evidence location; this pattern does not mandate a committed audit report. Retest material changes under comparable conditions and identify fixture/task changes that prevent direct comparison.

## Rules

- QA-UI-001 MUST identify the user task, relevant states/content, and existing design/accessibility constraints before a substantive interface change.
- QA-UI-002 SHOULD use a compact visual-direction and critique pass for a new interface or material redesign while preserving approved tokens, semantic variants, and workflow ownership.
- QA-UI-003 MUST define neutral task scenarios, starting conditions, and observable success/recovery criteria before claiming usability results.
- QA-UI-004 MUST distinguish owner/user observation, expert inference, automated checks, and AI simulation, including assistance and sample limitations.
- QA-UI-005 MUST define metric meaning, denominator/window where relevant, workload/environment, and baseline or unknown status before claiming a measured improvement.
- QA-UI-006 MUST choose proportionate measurements and evidence without introducing unrequested tracking, user contact, external load, paid tools, or fabricated thresholds.
- QA-UI-007 MUST verify affected essential flows with keyboard and the active accessibility target; a visual or automated-only pass is not a conformance claim.
- QA-UI-008 MUST apply the active privacy/retention policy to screenshots, traces, DOM snapshots, recordings, URLs, and research/test output; synthetic fixtures are the default.
- QA-UI-009 MUST distinguish observed defects from design preferences and unverified gaps and preserve workflow/security semantics in proposed remedies.
- QA-UI-010 SHOULD retest material fixes with comparable tasks, fixtures, revisions, and conditions, reporting changes that invalidate direct comparison.

## Validation

Inspect the chosen task/fixture, visual/state coverage, accessibility checks, observation source, measurement definitions, safe artifacts, and comparison conditions. Record actual evidence and unresolved gaps through QA-MATRIX-001/002. A context document is not a completed usability session, runtime benchmark, visual review, or accessibility assessment.

## Related

- [UI principles](../foundations/ui-principles.md)
- [Accessibility](../foundations/accessibility.md)
- [Design system](../design-system/INDEX.md)
- [Testing](testing-pattern.md)
- [Validation matrix](validation-matrix.md)
- [Diagnostic redaction](../security/data-protection/redaction-pattern.md)
- [Observability](../infrastructure/observability-pattern.md)

Reference methods: [GOV.UK moderated task testing](https://www.gov.uk/service-manual/user-research/using-moderated-usability-testing) and [W3C user involvement](https://www.w3.org/WAI/planning/involving-users/). Apply the active application's requirements; these references do not authorize data collection or certify conformity.
