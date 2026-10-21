---
id: DS-ERRORSTATE
status: baseline
scope: design-system
triggers:
  - "fetch failure"
  - "page error"
  - "unavailable service"
---

# Error State Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Explain the failed scope and provide safe recovery while preserving trustworthy data where possible.

## Why

A coherent error state prevents stale or absent data from looking like success.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
ErrorState(scope, safeMessage, retry?, supportReference?)
RetainedData(stale: true) if policyPermits
```

## Store Implementation

The failed operation/query owns error and retry state. Keep stale data provenance distinct from current success.

## Rules

- **DS-ERRORSTATE-001** — Failures MUST remain distinguishable from successful empty responses.
- **DS-ERRORSTATE-002** — Retry MUST be offered only when safe for the failed operation and its possible partial effects.
- **DS-ERRORSTATE-003** — Retained data MUST be marked when its freshness matters.
- **DS-ERRORSTATE-004** — User-facing errors MUST describe a useful next step without exposing internals.

## Accessibility

Use a perceivable heading and recovery control; move or announce focus only when the workflow requires it.

## Security and Permissions

Distinguish unavailable, forbidden, and missing responses without leaking restricted existence contrary to security policy.

## Validation

Test offline, timeout, permission loss, not found, partial data, repeated failure, and successful retry.

## Related Patterns

- [retry-and-recovery-pattern ](../../interaction-patterns/retry-and-recovery-pattern.md)
- [error-message-pattern ](../../content-patterns/error-message-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
