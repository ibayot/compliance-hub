---
id: DS-ALERT
status: baseline
scope: design-system
triggers:
  - "inline alert"
  - "persistent notice"
  - "warning"
---

# Alert Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use an inline alert for context that affects the current task; match tone to severity and provide recovery when available.

## Why

Persistent context belongs near the affected workflow rather than only in a temporary toast.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Alert(severity, title, message, recoveryAction?, dismissible?)
```

## Store Implementation

The workflow owns the alert condition. Dismissal may be local; critical conditions must remain discoverable until resolved.

## Rules

- **DS-ALERT-001** — Severity MUST describe the real condition and must not be chosen for visual decoration.
- **DS-ALERT-002** — Actionable alerts MUST explain what happened and what the user can do next.
- **DS-ALERT-003** — Critical task-blocking information MUST remain available after transient feedback disappears.
- **DS-ALERT-004** — Repeated alerts SHOULD be deduplicated without suppressing distinct failures.

## Accessibility

Use announcement urgency appropriate to the event; avoid repeatedly interrupting assistive technology during render.

## Security and Permissions

Messages must disclose only permitted information and provide a safe support reference when useful.

## Validation

Check long text, multiple alerts, dismiss/reappear behavior, recovery failure, themes, and announcement timing.

## Related Patterns

- [toast-pattern ](toast-pattern.md)
- [error-state-pattern ](error-state-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
