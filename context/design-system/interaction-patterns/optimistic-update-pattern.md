---
id: DS-OPTIMISTIC
status: baseline
scope: design-system
triggers:
  - "optimistic UI"
  - "instant update"
  - "rollback"
---

# Optimistic Update Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use optimistic updates only when provisional feedback is safe and failure recovery is well defined.

## Why

Fast feedback becomes misleading when local state pretends an irreversible or authoritative operation already succeeded.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
snapshot -> applyProvisionalChange -> mutate
success -> reconcileServerResult
failure -> rollbackOrMarkConflict -> explainRecovery
```

## Store Implementation

The mutation/query owner coordinates snapshots and request identities. The server remains authoritative; overlapping changes need an explicit reconciliation strategy.

## Rules

- **DS-OPTIMISTIC-001** — Optimistic behavior MUST be chosen per operation rather than globally assumed.
- **DS-OPTIMISTIC-002** — Provisional state MUST NOT imply final approval, deletion, payment, or another high-consequence confirmed outcome.
- **DS-OPTIMISTIC-003** — Rollback MUST preserve later valid edits and distinguish overlapping operations.
- **DS-OPTIMISTIC-004** — Unknown outcomes MUST be reconciled before repeating a possibly completed mutation.
- **DS-OPTIMISTIC-005** — Failure recovery MUST remain visible and usable.

## Accessibility

Communicate meaningful pending/failed state without announcing unconfirmed success.

## Security and Permissions

Optimistic rendering cannot grant capabilities or bypass server transition validation.

## Validation

Test rejection, overlapping edits, out-of-order responses, stale snapshots, reconnect, and unknown outcome.

## Related Patterns

- [switch-pattern ](../components/inputs/switch-pattern.md)
- [retry-and-recovery-pattern ](retry-and-recovery-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
