---
id: DS-FORMAT
status: baseline
scope: design-system
triggers:
  - "date formatting"
  - "timezone display"
  - "currency"
  - "number format"
---

# Date, Time, and Number Format Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define locale, timezone, units, precision, and missing-value behavior independently of stored values.

## Why

Formatted values must remain understandable and comparable without changing business meaning.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
formatDate(value, kind: dateOnly | instant, locale, displayZone)
formatNumber(value, unit, displayPrecision, locale)
copyOrExport -> declaredRawOrFormattedContract
```

## Store Implementation

Store canonical domain values; derive display strings at the rendering boundary. Preferences belong to application settings.

## Rules

- **DS-FORMAT-001** — Calendar dates, timestamps, durations, and numeric identifiers MUST use distinct formatting contracts.
- **DS-FORMAT-002** — Material timezone and unit context MUST be visible or readily available.
- **DS-FORMAT-003** — Display rounding MUST NOT alter canonical calculation/persistence precision.
- **DS-FORMAT-004** — Zero, absent, unknown, and restricted values MUST remain distinguishable.
- **DS-FORMAT-005** — Relative dates SHOULD have an accessible unambiguous absolute-time alternative where decisions depend on timing.

## Accessibility

Use understandable spoken labels/units and avoid ambiguous date forms for the intended audience.

## Security and Permissions

Exports/copy actions must preserve redaction and declared format semantics.

## Validation

Test locale separators, timezones, day boundaries, negative/zero/large values, rounding, and missing data.

## Related Patterns

- [date-picker-pattern ](../components/inputs/date-picker-pattern.md)
- [number-field-pattern ](../components/inputs/number-field-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
