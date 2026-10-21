---
id: CORE-QUALITY-CONSISTENCY-AUDIT
status: baseline
scope: quality
owner: application-maintainers
---

# Consistency Audit

## Guidelines
QA-AUDIT-001 MUST define target scope, relevant pattern/rule IDs, implementation revision, and evidence before auditing.
QA-AUDIT-002 MUST keep audit-only requests read-only.
QA-AUDIT-003 MUST distinguish confirmed noncompliance, approved variant, exception, candidate standard, and unverified area.

## Why
A documented standard and canonical implementation let an audit compare known contracts instead of rediscovering preferences. This can reduce repeated reads and model cost, but does not remove evidence requirements.

## Structure
~~~text
requested scope -> active profile -> relevant rules
                -> canonical implementation + consumer search
                -> representative checks/full enumeration as justified
                -> findings + coverage + recommended scoped changes
~~~

## Implementation
Start with [implementation map](../inventory/canonical-implementations.md) and [coverage](../inventory/pattern-coverage.md). Search named imports/components and competing native/library controls. Review unique patterns first, then sample or enumerate consumers according to risk. Do not describe sampling as exhaustive.

Use a finding table: rule ID, path/line, observed behavior, expected behavior, consequence, evidence, confidence, proposed fix. Keep the review self-contained.

## Rules
QA-AUDIT-004 MUST not flag an intended higher/lower action weight as inconsistency without checking the documented variant.
QA-AUDIT-005 MUST preserve authorization, data/state semantics, and accessibility when recommending visual changes.
QA-AUDIT-006 MUST invalidate cached findings when relevant code, rule, dependency, or scope changed.
QA-AUDIT-007 MUST report coverage boundaries and adoption gaps.
QA-AUDIT-008 SHOULD batch repeated searches and avoid loading inactive packs or every source file.

## Validation
Trace findings to rule declarations and actual source. Verify exceptions. A consistency edit follows [the edit workflow](../workflows/consistency-edit-workflow.md); an audit result alone grants no change authority.
