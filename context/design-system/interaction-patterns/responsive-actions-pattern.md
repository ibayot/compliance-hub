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

## Accessibility

Check touch targets, keyboard sequence, enlarged text, safe areas, and virtual keyboard overlap where relevant.

## Security and Permissions

Moving a control does not alter its permission, confirmation, or server validation requirements.

## Validation

Test narrow widths, long translations, zoom, dialog footers, sticky bars, orientation change, and pending operations.

## Related Patterns

- [button-pattern ](../components/actions/button-pattern.md)
- [responsive-breakpoint-pattern ](../foundations/responsive-breakpoint-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
