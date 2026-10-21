---
id: DS-TIME
status: baseline
scope: design-system
triggers:
  - "time input"
  - "scheduled time"
---

# Time Picker Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define whether a value is a wall-clock time, duration, or timestamp before choosing the control.

## Why

Time values require explicit precision and timezone context to prevent scheduling mistakes.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
TimeField(label, value: localTime, precision, zoneLabel)
combine(date, localTime, zone, ambiguityPolicy) -> scheduledInstant
```

## Store Implementation

The form owns typed time; the scheduling domain owns timezone and ambiguous/nonexistent-time resolution.

## Rules

- **DS-TIME-001** — Wall-clock times and durations MUST use distinct domain types/contracts.
- **DS-TIME-002** — Scheduled instants MUST include a defined timezone and daylight-saving ambiguity policy where relevant.
- **DS-TIME-003** — Precision, increment, min/max, and 12/24-hour display MUST be specified.
- **DS-TIME-004** — Hidden seconds or rounding MUST NOT silently alter material scheduling behavior.

## Accessibility

Provide clear format and timezone instructions; support typing and keyboard selection.

## Security and Permissions

Authoritative scheduling must revalidate allowable times and permissions.

## Validation

Test midnight, range limits, partial typing, locale formats, timezone changes, and ambiguous/nonexistent times where supported.

## Related Patterns

- [date-picker-pattern ](date-picker-pattern.md)
- [date-and-number-format-pattern ](../../content-patterns/date-and-number-format-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
