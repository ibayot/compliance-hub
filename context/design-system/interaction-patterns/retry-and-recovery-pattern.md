---
id: DS-RECOVERY
status: baseline
scope: design-system
triggers:
  - "retry"
  - "timeout"
  - "offline"
  - "reconnect"
---

# Retry and Recovery Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Classify failure and possible side effects before retrying. Preserve useful drafts and offer an appropriate next action.

## Why

Repeating a read and repeating a partially completed mutation have different consequences.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
failure -> classify(transient, validation, forbidden, conflict, unknownOutcome)
read -> safeRetry
mutationUnknown -> reconcileByOperationIdBeforeRetry
```

## Store Implementation

The operation owner keeps attempt/correlation identity and phase; server state resolves persisted outcomes.

## Rules

- **DS-RECOVERY-001** — Automatic retries MUST be bounded and appropriate to the operation's idempotency and failure class.
- **DS-RECOVERY-002** — Validation and authorization failures MUST NOT loop as transient network errors.
- **DS-RECOVERY-003** — Unknown mutation outcomes MUST be reconciled or protected by an idempotency contract before repetition.
- **DS-RECOVERY-004** — Recovery MUST preserve correctable drafts and avoid duplicate side effects.
- **DS-RECOVERY-005** — Retry UI MUST distinguish pending attempt from permanent or user-action-required failure.

## Accessibility

Provide labelled recovery actions and announce outcomes without trapping focus.

## Security and Permissions

Retry must revalidate current session/scope; do not replay sensitive requests after identity change.

## Validation

Test offline/reconnect, timeout after server success, repeated failure, cancellation, session expiry, and manual retry.

## Related Patterns

- [error-state-pattern ](../components/feedback/error-state-pattern.md)
- [form-submission-pattern ](form-submission-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
