---
id: DS-TABLE
status: baseline
scope: design-system
triggers:
  - "table"
  - "data grid"
  - "row actions"
---

# Data Table Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use tables for comparable structured records; define columns, identity, sorting, selection, loading, and narrow-layout behavior.

## Why

A table is a data interaction surface, not only rows with matching borders.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Table(columns: permittedColumns, rows, rowKey: stableId, sort, selection)
States(initialLoading, refreshing, empty, error)
Pagination(contract)
```

## Store Implementation

The list/query owner manages rows, filters, sort, and pages. Selection owns stable IDs; derive displayed metadata from rows.

## Rules

- **DS-TABLE-001** — Rows MUST use stable identity rather than display index.
- **DS-TABLE-002** — Column labels, alignment, date/status formatting, and action placement MUST be consistent across equivalent tables.
- **DS-TABLE-003** — Sorting MUST identify client/server ownership and must not sort only one page while implying global order.
- **DS-TABLE-004** — Loading, refresh, empty, error, and partial/stale states MUST remain distinguishable.
- **DS-TABLE-005** — Responsive alternatives MUST retain essential values and permitted actions; hidden columns need an intentional priority rule.

## Accessibility

Use correct table/grid semantics, headers, sort state, keyboard selection, and named row actions.

## Security and Permissions

Server queries and returned columns must respect scope; hidden UI columns are not a data-redaction boundary.

## Validation

Test realistic long rows, no rows, failed refresh, pagination, selection across pages, keyboard actions, and narrow mode.

## Related Patterns

- [list-loading-pattern ](../../interaction-patterns/list-loading-pattern.md)
- [bulk-action-pattern ](../../interaction-patterns/bulk-action-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
