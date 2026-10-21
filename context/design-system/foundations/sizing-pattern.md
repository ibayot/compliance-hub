---
id: DS-SIZE
status: baseline
scope: design-system
triggers:
  - "control size"
  - "density"
  - "width"
  - "touch target"
---

# Sizing and Density Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use approved control sizes and page density variants; derive widths from content and layout needs.

## Why

Consistent heights and target areas improve scanning and interaction without forcing every component to have identical dimensions.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Control(size: profile.controlSize, width: available)
DataRegion(density: approvedDensity)
```

## Store Implementation

Size preferences may belong to application settings. Individual component hover, open, and focus state remains local.

## Rules

- **DS-SIZE-001** — Controls sharing an action or input row MUST use compatible sizes unless a documented hierarchy requires otherwise.
- **DS-SIZE-002** — Fixed dimensions MUST NOT clip required labels, errors, translated content, or enlarged text.
- **DS-SIZE-003** — Compact variants MUST retain the active platform's accessibility and target-size requirements.
- **DS-SIZE-004** — Responsive sizing SHOULD preserve semantic priority instead of merely shrinking every control.

## Accessibility

Check touch/pointer targets, keyboard outlines, font enlargement, and large cursor operation.

## Security and Permissions

Never shrink confirmation consequences or permission explanations below readable treatment to fit a layout.

## Validation

Review compact, default, and responsive layouts with long labels and realistic data.

## Related Patterns

- [spacing-pattern ](spacing-pattern.md)
- [responsive-actions-pattern ](../interaction-patterns/responsive-actions-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
