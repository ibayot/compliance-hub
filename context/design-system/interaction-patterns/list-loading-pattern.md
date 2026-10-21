---
id: DS-LISTLOAD
status: baseline
scope: design-system
triggers:
  - "list fetch"
  - "refresh"
  - "stale rows"
---

# List Loading and Refresh Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Represent initial load, successful content/empty, refresh, stale content, and failure distinctly.

## Why

One coherent query lifecycle prevents redundant lists, loaders that never end, and misleading empty screens.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
ListQuery = { key, data, initialLoading, refreshing, error, updatedAt }
request(key, requestId) -> acceptIfCurrent -> settle
```

## Store Implementation

The query owner holds one authoritative result collection. Derive counts/display state; avoid a parallel presentation list unless documented transformation requires it.

## Rules

- **DS-LISTLOAD-001** — Result publication MUST be restricted to the current authorized query and scope.
- **DS-LISTLOAD-002** — All success, failure, abort, and scope-change paths MUST settle pending state correctly.
- **DS-LISTLOAD-003** — A successful empty response MUST be distinct from initial, denied, failed, or unknown state.
- **DS-LISTLOAD-004** — Background refresh SHOULD preserve valid data while communicating meaningful staleness.
- **DS-LISTLOAD-005** — Identity/scope changes MUST clear or isolate incompatible cached records.

## Accessibility

Expose loading/refresh outcomes and retain useful focus and reading context.

## Security and Permissions

Cached data must be partitioned and invalidated for identity/capability/scope changes.

## Validation

Test overlap, abort, error, empty success, stale refresh, route change, and identity switch.

## Related Patterns

- [skeleton-pattern ](../components/feedback/skeleton-pattern.md)
- [empty-state-pattern ](../components/feedback/empty-state-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
