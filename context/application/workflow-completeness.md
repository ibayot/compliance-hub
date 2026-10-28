---
id: APP-WORKFLOW-COMPLETENESS
status: baseline
scope: application discovery, multi-step forms, setup and generated drafts
owner: application-maintainers
triggers: [application planning, form workflow, generated draft, usability review]
---

# Workflow Completeness and Discovery

## Purpose

Translate a brief into an explicit, bounded operating workflow before building screens. A populated form is not proof that its output can be used by the next step. This pattern adds domain discovery and field/transition traceability to [intake](intake.md); it does not choose product policy or promise to anticipate every possible requirement.

## Discovery structure

Start with the owner's intended result and work backward through its consumers: who uses the result, what inputs they need, which decisions change behavior, what could prevent completion, and how the owner corrects or recovers it. Inspect the brief, repository and prior decisions first. Record each material area as owner-confirmed, evidenced existing behavior, delegated default, stated assumption, unresolved, or out of scope with a reason.

Consider purpose/users, supported modes, domain inputs and rules, units/formats, valid and invalid outcomes, precision and limits, output use, required dependencies, interaction/refresh, history and persistence, permissions/privacy, external execution, failure/recovery, accessibility/devices, operations and acceptance. Expand only the applicable branches. For a calculator, arithmetic scope, precedence, decimal/rounding policy, division by zero, entry correction and result use are candidate questions; scientific functions, accounts and cloud history are not automatic features.

Ask focused batches of unresolved questions with consequences and reasonable options. Do not ask again when the owner or repository already resolves a choice. Safe reversible details may use recorded delegated defaults. Required factual inputs, commercial claims, approval, security/privacy or spend authority must not be fabricated. Explain what can proceed independently and which dependent task is blocked. Discovery is sufficiently covered when every material area has a disposition and every essential consumer has a reachable path; it is not an infinite questionnaire or a guarantee of perfection.

## Field and transition contract

Instantiate the [workflow completeness template](../templates/workflow-completeness-template.md) in the application's private overlay. For each required consumer input, record:

- Meaning and source authority: owner fact, creative proposal, derived value or system configuration.
- Lifetime and first collection point: reusable configuration, per-request input, output/review or operator setup.
- Requiredness at each transition, including applicability, permitted omission/explicit none, defaults and override precedence.
- Editable control or configuration source, destination schema/storage, consumer/output location and provenance.
- Missing/invalid/contradictory/stale behavior, next action, recovery destination and proving observation.

Separate draft saving, activation/readiness, execution readiness and output approval. A reusable configuration may be complete while an individual request still needs facts. Show that distinction and link to the actual field at the correct stage. Conversely, a fact entered now must not disappear when navigating to a detail page, saving or generating. A valid omission is explicit where its meaning affects behavior; a blank field must not silently become an authorization or a plausible fact.

Completeness comes from applicable required fields and unresolved decisions in that contract. Labels, counters, disabled actions and server validation must agree. An unresolved marker is removed only by an owner decision or contract-defined non-applicability, not merely because a text box is nonempty. A blocker without a reachable correction path is an incomplete workflow.

## Preview and production evidence

A UI-only preview may use deterministic in-memory presentation transitions, without implementing a competing backend/state machine. Its default walkthrough must carry changed synthetic input into the next view and offer a reachable complete sample. Keep incomplete/error fixtures as explicitly selected scenarios. Reload may reset the preview if clearly disclosed. Synthetic labels are necessary but do not excuse a broken walkthrough.

Production owns authoritative contracts and durable transitions. Before integration, compare fixture fields, completeness/action labels and next-step requirements with those contracts; track mismatches as implementation defects or unresolved product decisions. Do not weaken requirements to match a fixture. Use one source for readiness semantics where practicable, with isolated preview data kept out of production.

Exercise an essential journey from its real entry point through its final in-scope outcome, including changed values, a missing requirement and correction, legitimate omission, navigation/back and relevant persistence/conflict/recovery. Directly opening a prefilled final record does not prove the creation path. For split UI/engineering tracks, the handoff maps both sets of checks to the same acceptance rows.

## Rules

- APP-COMPLETE-001 MUST derive and record applicable domain decisions and downstream input dependencies from the owner's outcome before declaring a workflow implementation-ready; distinguish confirmed, delegated, assumed, unresolved and excluded areas.
- APP-COMPLETE-002 MUST ask about unresolved material choices, using prior answers and evidence to avoid repetition; a recorded default must stay within delegated authority and must not invent required facts or approval.
- APP-COMPLETE-003 MUST map each required consumer input to its source, lifetime, collection/edit point, stage-specific validation, consumer/output and proving observation in an application-owned contract.
- APP-COMPLETE-004 MUST distinguish draft completeness, configuration activation, request readiness and result approval, with truthful missing-item reasons and a reachable correction action at the owning stage.
- APP-COMPLETE-005 MUST preserve entered values and decision identity across the intended journey, including omission/default/override meaning; navigation must not silently substitute an unrelated record.
- APP-COMPLETE-006 MUST make a preview's default essential journey traversable with synthetic data, explicitly select incomplete scenarios, and reconcile preview semantics with authoritative contracts before production handoff.
- APP-COMPLETE-007 MUST verify essential entry-to-outcome journeys with changed inputs and missing-to-corrected states; report preview, synthetic-provider, actual-provider and owner observations separately.
- APP-COMPLETE-008 MUST classify owner-reported workflow failures against requirements and implementation, reopen affected acceptance claims, and assign plan/context corrections separately from code remediation and retest evidence.

## Validation and limits

Review a finite discovery ledger and field/transition matrix, then observe the selected journey. A generic checklist cannot prove domain exhaustiveness, usability, real-world factual truth or runtime correctness. Structural/routing tests only show that agents can find this guidance. Track defect escapes and application retests before claiming the guidance improved outcomes. Existing applications need scoped adoption; adding this document does not fix their code.

## Related

- [Application build](../workflows/application-build-workflow.md)
- [Measured interface quality](../quality/ui-quality-pattern.md)
- [Definition of done](../quality/definition-of-done.md)
