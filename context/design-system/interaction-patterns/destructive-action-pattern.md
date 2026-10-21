---
id: DS-DESTRUCTIVE
status: baseline
scope: design-system
triggers:
  - "delete"
  - "irreversible action"
  - "revoke access"
---

# Destructive Action Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Classify reversibility, scope, and consequence before selecting confirmation, undo, or additional friction.

## Why

Consistent risk treatment prevents accidental loss without training users to dismiss meaningless prompts.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
prepareAuthorizedTarget -> explainConsequence -> confirmIfRequired -> mutate
result -> reconcileListsAndDetails -> reportOutcomeOrRecovery
```

## Store Implementation

The action owner keeps target identity/version and pending state; the server owns deletion/revocation outcomes.

## Rules

- **DS-DESTRUCTIVE-001** — The workflow MUST define whether the action deletes, archives, detaches, revokes, or can be undone.
- **DS-DESTRUCTIVE-002** — High-consequence actions MUST identify affected scope and dependencies before execution.
- **DS-DESTRUCTIVE-003** — Undo MUST be offered only when its authoritative semantics and time window are implemented.
- **DS-DESTRUCTIVE-004** — Partial bulk failure MUST report affected results without claiming complete success.
- **DS-DESTRUCTIVE-005** — Stale-target and uncertain-result handling MUST avoid accidental deletion of another or newer record.

## Accessibility

Provide clear text, intentional focus, keyboard cancellation, and usable recovery actions.

## Security and Permissions

Recheck authorization, dependencies, and concurrency constraints at execution; confirmation is not permission.

## Validation

Test cancellation, stale state, dependency block, partial failure, duplicate request, undo boundaries, and list reconciliation.

## Related Patterns

- [confirmation-dialog-pattern ](../components/overlays/confirmation-dialog-pattern.md)
- [bulk-action-pattern ](bulk-action-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
