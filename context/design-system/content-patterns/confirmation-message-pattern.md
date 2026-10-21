---
id: DS-CONFIRMTEXT
status: baseline
scope: design-system
triggers:
  - "success message"
  - "confirm wording"
  - "completion text"
---

# Confirmation and Outcome Message Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Distinguish a request to confirm consequences from feedback that a task has completed.

## Why

Users should know whether they are deciding, waiting, or observing a confirmed outcome.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
beforeAction -> 'Delete this attachment?' + consequence
afterConfirmedSuccess -> 'Attachment deleted.'
```

## Store Implementation

Messages derive from workflow phase and authoritative result; a pending request must not emit a completed outcome.

## Rules

- **DS-CONFIRMTEXT-001** — Pre-action confirmation MUST describe the object, action, and material consequence.
- **DS-CONFIRMTEXT-002** — Post-action success MUST follow confirmed completion and describe the actual affected scope.
- **DS-CONFIRMTEXT-003** — Partial success MUST name partial outcome and remaining recovery rather than use unconditional completion wording.
- **DS-CONFIRMTEXT-004** — Implementation details SHOULD be omitted unless they help the user take a meaningful next step.

## Accessibility

Use clear action labels and announcement urgency appropriate to the result.

## Security and Permissions

Do not expose confidential details or promise secure deletion/retention without the corresponding implemented policy.

## Validation

Test cancel, pending, complete, partial, failed, and unknown-result messages in their actual UI.

## Related Patterns

- [confirmation-dialog-pattern ](../components/overlays/confirmation-dialog-pattern.md)
- [toast-pattern ](../components/feedback/toast-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
