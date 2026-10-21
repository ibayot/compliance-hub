---
id: DS-LISTPAGE
status: baseline
scope: design-system
triggers:
  - "listing page"
  - "search results page"
  - "management page"
---

# List Page Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a consistent page title, permitted actions, query controls, results region, and pagination or continuation strategy.

## Why

Shared page anatomy makes users' learned filtering, loading, and action behavior transferable.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
PageTitle(title, description?, primaryAction?)
QueryControls(search, filters, sort)
Results(status, records, selectionActions?)
PaginationOrContinuation
```

## Store Implementation

The route/query owner keeps committed criteria and results; local state holds input drafts and temporary selection where appropriate.

## Rules

- **DS-LISTPAGE-001** — Equivalent list pages MUST use the same major region ordering unless a workflow need is documented.
- **DS-LISTPAGE-002** — Create/export/bulk actions MUST use their capability and scope rules.
- **DS-LISTPAGE-003** — Active filters and result freshness MUST remain understandable.
- **DS-LISTPAGE-004** — Query ownership MUST avoid duplicate fetch effects and out-of-order result publication.
- **DS-LISTPAGE-005** — Loading, empty, denied, failed, and stale states MUST have separate treatment.

## Accessibility

Use a meaningful page title/heading, landmarks, labelled query controls, and logical focus through result updates.

## Security and Permissions

List scope, counts, summaries, and export options must all follow authorized data access.

## Validation

Check direct entry, back/refresh, query changes, empty/error/retry, permission variants, selection, and narrow layouts.

## Related Patterns

- [search-and-filter-pattern ](../interaction-patterns/search-and-filter-pattern.md)
- [list-loading-pattern ](../interaction-patterns/list-loading-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
