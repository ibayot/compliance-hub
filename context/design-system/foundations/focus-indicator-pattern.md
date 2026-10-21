---
id: DS-FOCUS
status: baseline
scope: design-system
triggers:
  - "keyboard focus"
  - "focus restoration"
  - "focus ring"
---

# Focus Indicator Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use visible, consistent focus indicators and intentional focus movement after meaningful UI changes.

## Why

Users must be able to locate keyboard position and continue work when controls mount, unmount, or move.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
onOpenOverlay -> focusAppropriateElement()
onCloseOverlay -> focus(triggerIfAvailableElseLogicalSuccessor)
```

## Store Implementation

Focus references are local or overlay-manager state; do not persist DOM focus targets as business data.

## Rules

- **DS-FOCUS-001** — Keyboard focus MUST remain visible on every interactive element.
- **DS-FOCUS-002** — Opening an overlay MUST establish its intended focus behavior; dismissal MUST return focus to a usable location.
- **DS-FOCUS-003** — Removing a focused record or action MUST move focus to a logical successor.
- **DS-FOCUS-004** — Validation focus changes MUST be predictable and MUST NOT repeatedly steal focus during typing.

## Accessibility

Check tab sequence, focus clipping, traps, screen-reader announcements, and sticky header overlap.

## Security and Permissions

Focus changes must not reveal confidential content in unrelated regions or auto-trigger protected actions.

## Validation

Run complete keyboard tasks including opening, validation failure, successful completion, deletion, and dismissal.

## Related Patterns

- [accessibility ](../../foundations/accessibility.md)
- [dialog-pattern ](../components/overlays/dialog-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
