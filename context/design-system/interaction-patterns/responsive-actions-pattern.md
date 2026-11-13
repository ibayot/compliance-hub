---
id: DS-RESPACTIONS
status: baseline
scope: design-system
triggers:
  - "mobile actions"
  - "stacked buttons"
  - "overflow actions"
---

# Responsive Action Layout Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Adapt action placement and grouping to available space while keeping hierarchy, labels, and permitted actions intact.

## Why

Shrinking screens should change presentation without changing what the workflow means.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
wide -> inline(primary, supporting, overflow)
narrow -> stackOrOverflow(sameAuthorizedActions, preservedPriority)
```

## Store Implementation

The action owner keeps operation state; responsive presentation derives from layout conditions without resetting work.

## Rules

- **DS-RESPACTIONS-001** — The dominant action MUST remain recognizable when actions stack or move into overflow.
- **DS-RESPACTIONS-002** — Responsive changes MUST NOT silently remove required actions or their explanatory text.
- **DS-RESPACTIONS-003** — Visual order, keyboard order, and reading order MUST remain coherent.
- **DS-RESPACTIONS-004** — Sticky action regions MUST NOT obscure focused controls, errors, or mobile keyboard content.
- **DS-RESPACTIONS-005** — Icon-only substitution MUST preserve a discoverable meaningful label.
- **DS-RESPACTIONS-006** — A mobile floating primary action MUST call the page's existing authorized handler so permission, disabled, confirmation, and pending-state behavior stay the same.
- **DS-RESPACTIONS-007** — A mobile floating shortcut MUST appear only while its original control is outside the usable viewport. Use a labelled plus for create/add and a labelled pencil for update; keep elevation local to the button. Keep Back as one persistent arrow where the shell provides it.

## Accessibility

Check touch targets, keyboard sequence, enlarged text, safe areas, and virtual keyboard overlap where relevant.

## Security and Permissions

Moving a control does not alter its permission, confirmation, or server validation requirements.

## Validation

Test narrow widths, long translations, zoom, dialog footers, sticky bars, orientation change, and pending operations. Check the original action entering and leaving the viewport in both scroll directions and verify that only one action is visible.

For tasks split into responsive panels, switch panels with an in-progress draft and verify that the selection, inputs, errors and permitted actions persist.

## Related Patterns

- [button-pattern ](../components/actions/button-pattern.md)
- [responsive-breakpoint-pattern ](../foundations/responsive-breakpoint-pattern.md)
- [Application navigation pattern](../components/navigation/application-navigation-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
