---
id: FND-ENGINEERING
status: baseline
scope: all active technology packs
triggers: [implementation, architecture, review]
---
# Engineering Principles

## Guidelines

- FND-ENG-001 MUST preserve authorized behavior and security boundaries during consistency edits.
- FND-ENG-002 SHOULD reuse a canonical implementation before adding a competing abstraction.
- FND-ENG-003 MUST keep one authoritative owner for each state value, business rule, and data write.
- FND-ENG-004 MUST validate untrusted data at the receiving boundary.
- FND-ENG-005 SHOULD use the smallest design that satisfies the actual requirement.
- FND-ENG-006 MUST make failures observable and distinguish failure from empty success.
- FND-ENG-007 MUST pair claims of correctness with appropriate implementation evidence.

## Why

Predictable boundaries, explicit ownership, and shared primitives reduce divergence. Extra layers and copies create more places to keep synchronized.

## Structure

~~~text
boundary validates input
  -> domain decides
  -> owner persists
  -> contract returns result
  -> UI renders controlled states
  -> evidence verifies outcomes
~~~

## Rules

Do not refactor unrelated code under the label of consistency. Do not infer application-wide rules from one example. Extract shared behavior only after identifying its stable contract and real consumers. Preserve user changes in the worktree.

## Validation

Review affected consumers, negative paths, state ownership, and behavior before/after. Use the [validation matrix](../quality/validation-matrix.md).
