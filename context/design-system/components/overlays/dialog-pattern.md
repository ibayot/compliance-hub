---
id: DS-DIALOG
status: baseline
scope: design-system
triggers:
  - "modal"
  - "dialog"
  - "form dialog"
---

# Dialog Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a dialog for a focused task with clear title, main action, cancellation, and explicit dismissal behavior.

## Why

A consistent modal scope prevents hidden decisions and confusing focus transitions.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Dialog(open, title, dismissalPolicy)
  Content(formOrMessage)
  Actions(cancel, primary)

```

## Store Implementation

The parent owns open/selected record state; the contained form owns drafts. Define reset on close, reopen, record change, and successful submission.

## Rules

- **DS-DIALOG-001** — Every dialog MUST have an accessible title and an intentional initial-focus target.
- **DS-DIALOG-002** — Escape, backdrop, cancel, and close controls MUST follow one documented dismissal policy, including during pending work.
- **DS-DIALOG-003** — Closing or switching records MUST define draft retention/reset and unsaved-change handling.
- **DS-DIALOG-004** — Successful submission MUST close only after confirmed success when the workflow requires persistence.
- **DS-DIALOG-005** — Nested dialogs SHOULD be avoided; necessary nesting requires explicit focus and dismissal behavior.

## Accessibility

Contain focus while modal, make background interaction unavailable appropriately, and return focus after dismissal.

## Security and Permissions

Authorize data before rendering and actions before execution; do not retain private record drafts across identity/scope changes.

## Validation

Test keyboard open/close, validation, pending failure, reopen, record switching, narrow layout, and focus restoration.

## Related Patterns

- [confirmation-dialog-pattern ](confirmation-dialog-pattern.md)
- [unsaved-changes-pattern ](../../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
