---
id: DS-BULK
status: baseline
scope: design-system
triggers:
  - "bulk edit"
  - "select all"
  - "multi-record action"
---

# Bulk Action Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define the exact selected population and report per-record or aggregate results truthfully.

## Why

Visible rows, loaded rows, filtered matches, and all records are different action scopes.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Selection(ids | explicitAllMatchingQuery)
Review(scope, exclusions, consequence)
Execute -> {succeeded, failed, skipped, unknown}
```

## Store Implementation

The selection owner stores stable IDs or a deliberate all-matching model; the server owns execution authorization and results.

## Rules

- **DS-BULK-001** — The UI MUST state which population a selection and select-all action covers.
- **DS-BULK-002** — Filter, scope, page, and permission changes MUST reconcile or reset selection under a documented policy.
- **DS-BULK-003** — The server MUST validate each record or the authorized batch query at execution.
- **DS-BULK-004** — Partial outcomes MUST identify recoverable failures without claiming complete success.
- **DS-BULK-005** — Large operations MUST use an explicit limits/progress/cancellation contract.

## Accessibility

Provide labelled selection controls, mixed states, selected-count feedback, and keyboard-accessible batch actions.

## Security and Permissions

Recheck authorization and transition validity per affected resource; do not trust submitted IDs.

## Validation

Test cross-page selection, exclusions, changed filters, deleted records, partial failure, permission loss, and safe retry.

## Related Patterns

- [checkbox-pattern ](../components/inputs/checkbox-pattern.md)
- [destructive-action-pattern ](destructive-action-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
