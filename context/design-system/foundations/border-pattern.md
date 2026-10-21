---
id: DS-BORDER
status: baseline
scope: design-system
triggers:
  - "border"
  - "divider"
  - "input outline"
---

# Border Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use semantic borders for grouping, separation, interaction, and validation.

## Why

An outline conveys state only if its meaning stays stable across components and themes.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
border = token.border[default | interactive | selected | invalid | focus]
```

## Store Implementation

No store is needed. Border selection derives from actual control state and semantic theme tokens.

## Rules

- **DS-BORDER-001** — Validation and selection borders MUST correspond to the control's real state.
- **DS-BORDER-002** — Decorative dividers MUST NOT masquerade as interactive boundaries.
- **DS-BORDER-003** — Focused and invalid treatments MUST remain distinguishable when both apply.
- **DS-BORDER-004** — One-off border styles SHOULD be replaced with semantic tokens or a documented variant.

## Accessibility

Ensure visible boundaries where controls need them and non-color error and selection cues.

## Security and Permissions

An approved/verified border must only represent server-confirmed status.

## Validation

Inspect default, focus, selected, disabled, and invalid combinations in supported themes.

## Related Patterns

- [focus-indicator-pattern ](focus-indicator-pattern.md)
- [field-error-pattern ](../components/feedback/field-error-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
