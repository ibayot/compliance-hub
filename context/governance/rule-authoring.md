---
id: GOV-AUTHOR
status: active
scope: context documentation
triggers: [new rule, pattern revision, context maintenance]
---
# Rule Authoring

## Guidelines

- GOV-AUTHOR-001 MUST give normative declarations a unique stable ID and MUST/MUST NOT/SHOULD/MAY strength.
- GOV-AUTHOR-002 MUST distinguish observed implementation, intended baseline, draft proposal, exception, and verified compliance.
- GOV-AUTHOR-003 MUST give each pattern a scope, rationale, structure, implementation/state guidance, and validation method.
- GOV-AUTHOR-004 MUST retain a single owner document for each rule; other documents link or reference it.
- GOV-AUTHOR-005 MUST NOT declare legal obligations or compliance certifications without supplied authoritative requirements and evidence.

## Why

A large library fails when documents contradict one another or become disconnected from code. IDs and traceability let audits identify exactly what was checked.

## Lifecycle and ownership

Candidate -> draft -> approved -> active -> deprecated -> archived. Baseline means an adopted starting standard for applicable future work; it is not an assurance that legacy code complies. Technology packs can be baseline and remain inactive in a particular profile.

Each pattern uses its pack/project maintainers as owner unless a named owner is supplied. Review when its implementation, dependency version, accessibility requirement, threat model, or domain rule changes. Add last-reviewed metadata when an actual review occurred.

## Structure

Use [pattern](../templates/pattern-template.md) or [element](../templates/element-pattern-template.md) templates. Keep Guidelines -> Why -> Structure -> Store Implementation -> Rules for UI elements. For a container, schema, or workflow, name the implementation section after its real subject.

Examples must be minimal and either match a verified implementation or clearly say illustrative/pseudocode. A suggested component must not be described as an existing export.

## Enforcement

Document actual enforcement: component API, types, lint, test, runtime guard, or review. Proposed automation is a gap until it exists. New rules apply to authorized changes; bulk migration requires its own scope.

## Validation

Run the context validator, check examples against the active dependency version when used, review rule overlap, and update the nearest index and coverage map.
