---
id: DS-TIMELINE
status: baseline
scope: design-system
triggers:
  - "timeline"
  - "activity log"
  - "audit history"
---

# Timeline and Audit Display Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Show events in a documented order with actor, action, object context, and trustworthy timestamps.

## Why

Users need to distinguish an event record from a status summary or editable comment.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Timeline(order: newestFirst | oldestFirst)
Event(id, timestamp, actorDisplay, actionLabel, safeDetails)
```

## Store Implementation

The server owns event history; query state owns paging/freshness. Derive display text and timezone without changing stored events.

## Rules

- **DS-TIMELINE-001** — Event order and timestamp timezone MUST be explicit and consistent.
- **DS-TIMELINE-002** — Audit-origin facts MUST NOT be silently edited or replaced by optimistic UI events.
- **DS-TIMELINE-003** — Pending local activity MUST be visually distinguished from persisted history.
- **DS-TIMELINE-004** — Restricted/redacted events MUST follow the application's audit-access policy.

## Accessibility

Use ordered structure when chronology matters; provide readable timestamps and non-color event distinctions.

## Security and Permissions

Audit metadata may be sensitive; authorize access and redact secrets or unnecessary personal information.

## Validation

Test same-time events, missing actor, timezone display, pagination, refresh, redaction, and long details.

## Related Patterns

- [date-and-number-format-pattern ](../../content-patterns/date-and-number-format-pattern.md)
- [status-language-pattern ](../../content-patterns/status-language-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
