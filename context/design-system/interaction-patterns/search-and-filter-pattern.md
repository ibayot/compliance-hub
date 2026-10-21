---
id: DS-SEARCHFILTER
status: baseline
scope: design-system
triggers:
  - "search"
  - "filter"
  - "sort"
  - "query state"
---

# Search, Filter, and Sort Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define committed query state, input drafts, clearing behavior, filter scope, and server/client execution.

## Why

Predictable query state prevents mismatched counts, stale rows, and filters that disappear on navigation.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
draftQuery -> debounceOrExplicitApply -> committedQuery
queryKey = scope + search + filters + sort + page
result -> acceptOnlyCurrentQuery
```

## Store Implementation

Local state owns unfinished search input; a query/router owner owns committed filters/sort/page. Remote cache keys include scope.

## Rules

- **DS-SEARCHFILTER-001** — Filtering and sorting MUST define whether they apply globally or only to locally loaded data.
- **DS-SEARCHFILTER-002** — Changed query criteria MUST reset or reconcile pagination according to the API contract.
- **DS-SEARCHFILTER-003** — Outdated responses MUST NOT replace results for newer committed criteria.
- **DS-SEARCHFILTER-004** — Clear/reset MUST restore documented defaults and reveal active-filter state.
- **DS-SEARCHFILTER-005** — Persistence in URL/storage MUST avoid confidential values and must respect supported deep-link behavior.

## Accessibility

Label controls, expose active filters, announce result changes without stealing focus, and support keyboard clearing.

## Security and Permissions

Server queries must enforce authorized scope and safe query constraints; client filters cannot authorize data.

## Validation

Test rapid typing, combined filters, reset, sort ties, back/refresh, no matches, permission changes, and stale responses.

## Related Patterns

- [searchable-select-pattern ](../components/inputs/searchable-select-pattern.md)
- [pagination-pattern ](pagination-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
