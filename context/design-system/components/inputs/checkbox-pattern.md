---
id: DS-CHECKBOX
status: baseline
scope: design-system
triggers:
  - "checkbox"
  - "multiple choice"
  - "select all"
---

# Checkbox Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use checkboxes for independent selections or boolean form values; use a mixed state for partial group selection.

## Why

Independent options differ from mutually exclusive choice and immediate settings.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Checkbox(label, checked: selection.has(id), mixed: partiallySelected, onChange)
Group(legend, options)
```

## Store Implementation

The form or selection owner keeps selected IDs. Derive aggregate selected/mixed state instead of storing a second count/list.

## Rules

- **DS-CHECKBOX-001** — Checkbox labels MUST describe what selecting the option means.
- **DS-CHECKBOX-002** — A select-all control MUST define whether it affects visible, loaded, filtered, or all matching records.
- **DS-CHECKBOX-003** — Mixed state MUST reflect the real subset, not a manually toggled flag.
- **DS-CHECKBOX-004** — Disabled options MUST have a meaningful rationale where users need it.

## Accessibility

Associate labels, expose checked/mixed state, and group related controls under a meaningful legend.

## Security and Permissions

Changing selection does not authorize bulk actions; recheck each affected resource at execution.

## Validation

Test none/some/all selections, filter changes, disabled members, keyboard use, and server-denied records.

## Related Patterns

- [radio-pattern ](radio-pattern.md)
- [bulk-action-pattern ](../../interaction-patterns/bulk-action-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
