---
id: FND-UI
status: baseline
scope: foundations
triggers:
  - "UI design"
  - "component selection"
  - "consistency review"
---

# UI Consistency Principles

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a small set of reusable components with deliberate variants. Match visual emphasis to the action's purpose within its current scope.

## Why

Consistency reduces relearning; purposeful differences explain priority, risk, and workflow rather than reflecting individual page preferences.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
page -> action scope -> approved component -> semantic variant -> state
```

## Store Implementation

No shared store is required for visual consistency. Keep transient presentation state local; let workflow owners own business state.

## Rules

- **FND-UI-001** — New or touched UI MUST consult the corresponding element and interaction patterns before introducing a new convention.
- **FND-UI-002** — Each material variant MUST have a purpose, permitted scope, and state behavior; a new color alone is insufficient justification.
- **FND-UI-003** — Existing discrepancies MUST be recorded as evidence or migration debt; a documentation change MUST NOT be described as an application fix.
- **FND-UI-004** — A component replacement SHOULD preserve semantics, keyboard behavior, authorized actions, and workflow outcomes.

## Accessibility

Evaluate focus, keyboard interaction, text scaling, and non-color cues alongside visual appearance.

## Security and Permissions

Apply authorization at the data/action boundary; appearance is never an access control.

## Validation

Compare at least two representative usages and their loading, empty, error, disabled, and narrow-layout states.

## Related Patterns

- [INDEX ](../design-system/INDEX.md)
- [accessibility ](accessibility.md)
- [Active application profile](../application/PROFILE.md)
- [Security context](../security/INDEX.md)
