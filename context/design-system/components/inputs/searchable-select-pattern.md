---
id: DS-SEARCHSELECT
status: baseline
scope: design-system
triggers:
  - "combobox"
  - "searchable dropdown"
  - "autocomplete"
  - "remote options"
---

# Searchable Select and Autocomplete Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Keep query text distinct from selected identity. Decide explicitly whether free text, single choice, or multiple choice is supported.

## Why

Search text, results, and committed selection have different lifecycles and cannot safely share one value.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Combobox(query, selectedIds, options, loading, error)
onQuery -> cancelPrevious -> search(scope, query)
onSelect -> form.set(id)
```

## Store Implementation

The control owns query/open/highlight state; the form owns selected IDs; a query owner manages remote results and request freshness.

## Rules

- **DS-SEARCHSELECT-001** — A later query result MUST NOT be overwritten by an older response.
- **DS-SEARCHSELECT-002** — Selection equality MUST use stable identity; selected labels MUST survive normal result-window changes.
- **DS-SEARCHSELECT-003** — Free-text creation MUST be explicit and must not be inferred from unmatched search text.
- **DS-SEARCHSELECT-004** — Loading, no matches, fetch failure, unavailable selection, clear, and retry MUST be distinguishable.
- **DS-SEARCHSELECT-005** — Remote lookups MUST apply authorized scope and an appropriate search/load strategy.

## Accessibility

Expose combobox/listbox semantics, active option, results status, label, and keyboard selection/cancellation.

## Security and Permissions

Do not leak restricted user or record names through suggestions; validate submitted IDs server-side.

## Validation

Test rapid queries/out-of-order responses, duplicate labels, selected values absent from results, multi-select removal, and keyboard use.

## Related Patterns

- [select-pattern ](select-pattern.md)
- [search-and-filter-pattern ](../../interaction-patterns/search-and-filter-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
