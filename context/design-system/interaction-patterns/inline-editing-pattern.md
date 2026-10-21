---
id: DS-INLINEEDIT
status: baseline
scope: design-system
triggers:
  - "inline edit"
  - "editable cell"
  - "quick change"
---

# Inline Editing Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Keep viewing and editing distinct and define save, cancel, blur, and navigation behavior.

## Why

Small edits still need validation, conflict handling, and reliable persistence.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
view -> beginEdit(snapshotVersion) -> draft
save -> validate -> mutate -> confirmedView
cancel -> restoreSnapshot
```

## Store Implementation

The editor owns its draft and validation; the query owns confirmed data; the server owns concurrency/version decisions.

## Rules

- **DS-INLINEEDIT-001** — Entering edit MUST preserve the original value for explicit cancellation.
- **DS-INLINEEDIT-002** — Save-on-blur behavior MUST be declared and MUST NOT make errors or cancellation unreachable.
- **DS-INLINEEDIT-003** — Failed saves MUST preserve the editable draft and explain recovery.
- **DS-INLINEEDIT-004** — Concurrent changes MUST follow a documented conflict policy rather than silently overwrite.
- **DS-INLINEEDIT-005** — Keyboard interaction MUST provide clear save/cancel behavior suitable for the field.

## Accessibility

Expose edit controls and mode changes; retain focus after save/cancel and associate errors.

## Security and Permissions

Authorize each mutation and avoid placing restricted values in editable hidden controls.

## Validation

Test Enter/Escape/Tab, blur, invalid input, slow save, permission loss, conflict, and virtualized-row unmount.

## Related Patterns

- [form-submission-pattern ](form-submission-pattern.md)
- [table-pattern ](../components/data-display/table-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
