---
id: DS-CONFIRM
status: baseline
scope: design-system
triggers:
  - "confirm action"
  - "delete confirmation"
  - "irreversible action"
---

# Confirmation Dialog Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Ask confirmation when consequences justify interruption, and describe the actual action and affected scope.

## Why

Meaningful confirmation reduces mistakes; generic repeated prompts teach users to ignore them.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
ConfirmDialog(title: actionAndObject, consequence, cancelLabel, confirmLabel: specificAction, intent)
```

## Store Implementation

The operation owner keeps the pending target and request state. A confirmation result is temporary consent for that action, not a reusable authorization token.

## Rules

- **DS-CONFIRM-001** — Confirmation text MUST identify the object/scope and material consequence.
- **DS-CONFIRM-002** — Confirm labels MUST name the action rather than ambiguous 'Yes' or 'OK'.
- **DS-CONFIRM-003** — Destructive pending work MUST prevent duplicate effects and handle uncertain outcomes explicitly.
- **DS-CONFIRM-004** — Typed confirmation or additional friction MUST be justified by risk and must have an accessible equivalent.

## Accessibility

Use accessible dialog semantics, logical initial focus, readable consequences, and keyboard cancellation.

## Security and Permissions

The server must recheck authority, record version/state, and irreversible constraints after confirmation.

## Validation

Test cancel, confirm, double activation, target changes, stale record, failure, and focus return.

## Related Patterns

- [destructive-action-pattern ](../../interaction-patterns/destructive-action-pattern.md)
- [button-pattern ](../actions/button-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
