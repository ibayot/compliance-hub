---
id: DS-HELP
status: baseline
scope: design-system
triggers:
  - "help text"
  - "input instructions"
  - "format guidance"
---

# Helper Text Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Provide short actionable guidance before users need to fail; put critical constraints near the affected input.

## Why

Predictable help reduces avoidable errors and keeps forms understandable after placeholders disappear.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Field(label, input, help: formatOrConstraint, error?)
```

## Store Implementation

Help is configuration/domain metadata; dynamic guidance derives from current form state without duplicating validation rules.

## Rules

- **DS-HELP-001** — Required format, material limits, and consequences MUST remain available while editing.
- **DS-HELP-002** — Help MUST agree with authoritative validation and allowed option/file contracts.
- **DS-HELP-003** — Changing guidance MUST not obscure an existing validation error.
- **DS-HELP-004** — Long procedural guidance SHOULD link to an accessible approved help location rather than overwhelm the field.

## Accessibility

Associate help with its field and avoid relying on a tooltip or color alone.

## Security and Permissions

Do not include secrets, internal policy details, or unnecessary personal data in help examples.

## Validation

Test typing, error transitions, long text, responsive wrapping, and assistive-technology description order.

## Related Patterns

- [text-field-pattern ](../components/inputs/text-field-pattern.md)
- [validation-message-pattern ](validation-message-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
