---
id: DS-DATE
status: baseline
scope: design-system
triggers:
  - "date"
  - "calendar"
  - "date input"
---

# Date Picker Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Distinguish a calendar date from a timestamp; make locale display and persisted format explicit.

## Why

A date-only business value can shift incorrectly when handled as a timezone-dependent instant.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
DateField(label, value: calendarDateOrNull, min, max, displayLocale)
serializeCalendarDate(value) -> agreedDateContract
```

## Store Implementation

The form owns the date and validation; the picker owns open/focused-calendar state. Timezone conversion belongs to the domain contract.

## Rules

- **DS-DATE-001** — Date-only values MUST preserve their calendar meaning across client/server timezones.
- **DS-DATE-002** — Input parsing, display locale, persisted format, and allowed ranges MUST be documented.
- **DS-DATE-003** — Invalid and incomplete typed values MUST remain distinguishable from no selection.
- **DS-DATE-004** — Calendar-only pointer operation MUST NOT be required; provide a usable keyboard/input path.

## Accessibility

Label the field, expose format guidance, support calendar keyboard navigation, and associate range errors.

## Security and Permissions

Revalidate ranges and workflow dates server-side; a disabled day is not a policy boundary.

## Validation

Test timezone boundaries, leap dates, invalid typing, range limits, clearing, locale changes, and keyboard entry.

## Related Patterns

- [time-picker-pattern ](time-picker-pattern.md)
- [date-and-number-format-pattern ](../../content-patterns/date-and-number-format-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
