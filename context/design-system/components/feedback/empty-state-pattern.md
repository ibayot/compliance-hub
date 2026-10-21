---
id: DS-EMPTY
status: baseline
scope: design-system
triggers:
  - "no data"
  - "empty list"
  - "no results"
---

# Empty State Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Distinguish first use, no matches, unavailable scope, and a successful empty response.

## Why

Different empty causes require different explanations and recovery actions.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
EmptyState(kind: firstUse | noMatches | noRecords, title, explanation, allowedAction?)
```

## Store Implementation

The data/query owner determines emptiness from a successful response; filter state explains no-match emptiness.

## Rules

- **DS-EMPTY-001** — An empty state MUST NOT stand in for loading, fetch failure, or denied access.
- **DS-EMPTY-002** — Recovery actions MUST fit the cause, such as clear filters or create an authorized first record.
- **DS-EMPTY-003** — Empty-state wording MUST avoid claiming that no records exist outside the user's permitted scope.
- **DS-EMPTY-004** — Illustrations SHOULD remain secondary to useful text and actions.

## Accessibility

Use a clear heading, logical focus, and an accessible recovery action without decorative noise.

## Security and Permissions

Do not disclose restricted record existence or suggest unauthorized creation.

## Validation

Test first use, no matches, zero permitted records, cleared filters, and changing permissions.

## Related Patterns

- [error-state-pattern ](error-state-pattern.md)
- [search-and-filter-pattern ](../../interaction-patterns/search-and-filter-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
