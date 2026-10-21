---
id: DS-NUMBER
status: baseline
scope: design-system
triggers:
  - "numeric input"
  - "quantity"
  - "decimal"
---

# Number Field Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Separate display formatting, edit text, and the domain numeric value. Define precision, units, range, and rounding.

## Why

Naive parsing can corrupt money, identifiers, decimal values, or partially typed input.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
NumberField(label, editText, unit, min, max, step)
parse(editText, locale) -> validNumber | incomplete | invalid
```

## Store Implementation

The form owns edit text and parsed value; domain/service logic owns authoritative precision and rounding.

## Rules

- **DS-NUMBER-001** — Identifiers such as account numbers MUST NOT be converted to numbers merely because they contain digits.
- **DS-NUMBER-002** — Empty, zero, incomplete, and invalid input MUST remain distinguishable.
- **DS-NUMBER-003** — Range, precision, units, and rounding MUST follow the domain contract and server validation.
- **DS-NUMBER-004** — Formatting MUST NOT silently change the persisted value or prevent normal incremental typing.

## Accessibility

Use appropriate input mode and labels; ensure increment/decrement controls remain keyboard and screen-reader usable.

## Security and Permissions

Server-side calculations must reject unsupported numeric forms and bounds; client limits are convenience only.

## Validation

Test zero, negative, decimal separator, large magnitude, pasted content, incomplete input, and rounding boundaries.

## Related Patterns

- [text-field-pattern ](text-field-pattern.md)
- [date-and-number-format-pattern ](../../content-patterns/date-and-number-format-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
