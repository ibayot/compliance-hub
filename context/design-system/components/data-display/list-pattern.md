---
id: DS-LIST
status: baseline
scope: design-system
triggers:
  - "record list"
  - "result list"
  - "item collection"
---

# List Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use lists for sequential records whose layout is not a column comparison.

## Why

Stable item anatomy and states make collections predictable without table semantics.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
List(items, itemKey: stableId)
  Item(primaryText, secondaryText, status, primaryDestination, secondaryActions)
```

## Store Implementation

The query owner keeps the collection and freshness state; item controls own only local presentation.

## Rules

- **DS-LIST-001** — List items MUST use stable identities and consistent primary/secondary information ordering.
- **DS-LIST-002** — Navigation and secondary action targets MUST have distinct semantics without invalid nested controls.
- **DS-LIST-003** — Loading, empty, and failure MUST use their corresponding states.
- **DS-LIST-004** — Virtualized or incrementally loaded lists MUST retain an accessible navigation and announcement strategy.

## Accessibility

Use list semantics and meaningful item names; maintain reading order and keyboard access.

## Security and Permissions

Do not include restricted metadata in hidden previews or cached item descriptions.

## Validation

Test long labels, repeated item names, loading boundaries, actions, keyboard reading, and narrow layouts.

## Related Patterns

- [card-pattern ](card-pattern.md)
- [list-loading-pattern ](../../interaction-patterns/list-loading-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
