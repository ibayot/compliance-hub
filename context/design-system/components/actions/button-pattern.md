---
id: DS-BUTTON
status: baseline
scope: design-system
triggers:
  - "button"
  - "primary action"
  - "action hierarchy"
---

# Button Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Select primary, secondary, tertiary, or destructive treatment by intent and the action's current scope.

## Why

Consistent action hierarchy guides attention while controlled variants accommodate genuine differences in importance and risk.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Button(label: 'Save changes', intent: primary, loading: submitting, disabled: !canSubmit, onActivate: submit)
```

## Store Implementation

Busy state comes from the owning operation; hover and focus remain local. Avoid a second global boolean for the same request.

## Rules

- **DS-BUTTON-001** — A form, dialog, or clearly bounded action scope SHOULD expose one dominant primary action.
- **DS-BUTTON-002** — Buttons MUST use action semantics; navigation to a destination uses a link.
- **DS-BUTTON-003** — Pending actions MUST prevent duplicate effects, retain a meaningful label, and preserve usable layout.
- **DS-BUTTON-004** — Destructive treatment MUST reflect consequences and the destructive-action pattern; importance alone does not justify danger styling.
- **DS-BUTTON-005** — Disabled and permission-hidden behavior MUST be chosen deliberately; a disabled control does not enforce authorization.

## Accessibility

Use a real button or platform equivalent; expose name, busy/disabled state, keyboard activation, and visible focus.

## Security and Permissions

Recheck permission and input on the server for protected operations; prevent repeated effects at the authoritative boundary.

## Validation

Check all variants plus loading, disabled, long label, narrow layout, double activation, and keyboard operation.

## Related Patterns

- [form-submission-pattern ](../../interaction-patterns/form-submission-pattern.md)
- [destructive-action-pattern ](../../interaction-patterns/destructive-action-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
