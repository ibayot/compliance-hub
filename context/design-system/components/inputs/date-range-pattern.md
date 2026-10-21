---
id: DS-DATERANGE
status: baseline
scope: design-system
triggers:
  - "date range"
  - "from and to"
  - "period filter"
---

# Date Range Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Present start and end as one concept and define whether endpoints are inclusive.

## Why

Unspecified endpoint and timezone semantics produce incorrect filters and reports.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
DateRange(label, start, end, allowOpenStart, allowOpenEnd)
validate(start <= end)
serialize(range, boundaryPolicy)
```

## Store Implementation

The form/filter owner keeps the pair; derive validity and query boundaries rather than keeping duplicate range objects.

## Rules

- **DS-DATERANGE-001** — Endpoint inclusion, date/timestamp interpretation, and open-ended behavior MUST be explicit.
- **DS-DATERANGE-002** — An end earlier than the start MUST receive actionable validation without silently swapping values.
- **DS-DATERANGE-003** — Presets such as 'This month' MUST use a documented calendar and timezone.
- **DS-DATERANGE-004** — Changing one endpoint MUST preserve the other unless a clearly communicated workflow rule requires adjustment.

## Accessibility

Label both endpoints and their group; associate pair-level errors and ensure calendar keyboard access.

## Security and Permissions

Apply server-side range and scope limits for reports or sensitive queries.

## Validation

Test same-day ranges, missing endpoints, reversed range, timezone boundaries, presets, and clear/reset.

## Related Patterns

- [date-picker-pattern ](date-picker-pattern.md)
- [search-and-filter-pattern ](../../interaction-patterns/search-and-filter-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
