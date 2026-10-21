---
id: DS-PAGEQUERY
status: baseline
scope: design-system
triggers:
  - "server pagination"
  - "cursor"
  - "infinite results"
---

# Paginated Query Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Choose page/offset or cursor pagination from the API contract and define ordering, totals, and reset rules.

## Why

Pagination correctness depends on the data contract as well as the visible controls.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
query(criteria, sort, pageOrCursor, size, scope) -> {items, total?, nextCursor?}
criteriaChanged -> resetWindow
response -> reconcileSelectionAndRange
```

## Store Implementation

The query owner holds the current window/cursor chain. Derive visible ranges; selection has an explicit across-pages policy.

## Rules

- **DS-PAGEQUERY-001** — Pagination MUST use a stable documented ordering with tie behavior.
- **DS-PAGEQUERY-002** — Offset/page and cursor models MUST NOT be mixed implicitly.
- **DS-PAGEQUERY-003** — Unknown totals MUST remain unknown in the UI; server caps must remain effective.
- **DS-PAGEQUERY-004** — Filter/sort/scope changes MUST invalidate incompatible cursors or page windows.
- **DS-PAGEQUERY-005** — Infinite loading MUST provide accessible end/loading/failure state and a usable navigation strategy.

## Accessibility

Preserve logical focus and announce newly loaded items or changed ranges appropriately.

## Security and Permissions

Every page/cursor request needs normal scope authorization; cursors must not grant broader access.

## Validation

Test insertion/deletion between pages, duplicate sort keys, expired cursor, last-page shrink, overlapping requests, and refresh.

## Related Patterns

- [pagination-pattern ](../components/navigation/pagination-pattern.md)
- [list-loading-pattern ](list-loading-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
