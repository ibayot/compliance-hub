---
id: DS-TOAST
status: baseline
scope: design-system
triggers:
  - "snackbar"
  - "toast"
  - "transient feedback"
---

# Toast Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use transient feedback for brief non-blocking outcomes; place essential errors and required actions in persistent context.

## Why

Toasts confirm work without disrupting it, but users may miss or outlive a temporary message.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
notify({ key: operationId, tone: success, message: 'Changes saved' })
```

## Store Implementation

A bounded application notification queue may own toasts; operation owners produce outcomes. Toast presence is not authoritative business state.

## Rules

- **DS-TOAST-001** — Success toasts MUST follow confirmed success rather than request dispatch.
- **DS-TOAST-002** — Required recovery instructions MUST have a persistent path outside an expiring toast.
- **DS-TOAST-003** — Repeated messages MUST be deduplicated or bounded to prevent a notification flood.
- **DS-TOAST-004** — Toast content MUST avoid sensitive details inappropriate for a global screen region.

## Accessibility

Announce politely when appropriate; provide accessible dismissal and sufficient reading/pause behavior under the selected target.

## Security and Permissions

Do not display confidential record names globally when the current audience or scope is uncertain.

## Validation

Test bursts, long messages, action links, dismissal, route changes, and screen-reader announcements.

## Related Patterns

- [alert-pattern ](alert-pattern.md)
- [confirmation-message-pattern ](../../content-patterns/confirmation-message-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
