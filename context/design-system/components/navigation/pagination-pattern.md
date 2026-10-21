---
id: DS-PAGINATION
status: baseline
scope: design-system
triggers:
  - "page navigation"
  - "page size"
  - "table pagination"
---

# Pagination Controls Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use pagination controls that accurately describe the current result window and available movement.

## Why

Stable indexing and count semantics prevent skipped, duplicated, or misleading result navigation.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Pagination(pageIndex, pageSize, totalCount?, hasNext, loading)
onChange -> queryOwner.setPage(next)
```

## Store Implementation

The query/list owner keeps pagination state; controls emit intent. Derive displayed range from returned data and the API contract.

## Rules

- **DS-PAGINATION-001** — Zero-based and one-based indexing MUST be converted at a documented boundary.
- **DS-PAGINATION-002** — Page-size changes and narrowing filters MUST define page reset/clamping behavior.
- **DS-PAGINATION-003** — Unknown totals MUST NOT be presented as exact counts.
- **DS-PAGINATION-004** — Rapid page changes MUST not allow stale responses to replace the latest requested page.

## Accessibility

Name previous/next/page controls, indicate the current page, and preserve usable focus after data changes.

## Security and Permissions

Counts and pages must respect authorized scope; client controls cannot lift server limits.

## Validation

Test first/last/empty page, count shrinkage, changed size/filter, unknown totals, and out-of-order responses.

## Related Patterns

- [pagination-pattern ](../../interaction-patterns/pagination-pattern.md)
- [table-pattern ](../data-display/table-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
