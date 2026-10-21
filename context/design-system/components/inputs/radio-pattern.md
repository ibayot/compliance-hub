---
id: DS-RADIO
status: baseline
scope: design-system
triggers:
  - "radio"
  - "exclusive choice"
---

# Radio Group Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a radio group when users choose one visible option from a manageable set.

## Why

Showing alternatives helps comparison while enforcing one coherent selection.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
RadioGroup(legend: 'Delivery method', value: form.method, options: methods)
```

## Store Implementation

The form owns one stable option ID or an explicitly unset value; derive option state from that value.

## Rules

- **DS-RADIO-001** — A radio group MUST have a meaningful group label and uniquely identified options.
- **DS-RADIO-002** — The domain MUST define whether an initial selection is valid or explicit choice is required.
- **DS-RADIO-003** — Selection MUST NOT unexpectedly navigate or submit unless clearly announced by the workflow.
- **DS-RADIO-004** — Unsupported saved values MUST receive defined recovery behavior rather than silently selecting another option.

## Accessibility

Use grouped radio semantics and the platform's established keyboard interaction.

## Security and Permissions

Validate the submitted option and its permission/scope on the server.

## Validation

Check unset/default, changed options, keyboard traversal, errors, and restored saved values.

## Related Patterns

- [select-pattern ](select-pattern.md)
- [checkbox-pattern ](checkbox-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
