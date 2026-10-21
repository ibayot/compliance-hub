---
id: DS-SKELETON
status: baseline
scope: design-system
triggers:
  - "skeleton"
  - "initial loading"
  - "layout placeholder"
---

# Skeleton Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a skeleton when predictable content structure improves loading continuity; keep its shape close to actual content.

## Why

Stable placeholders reduce layout shifts without fabricating content or hiding failure.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
DataRegion(status)
  initialLoading -> Skeleton(expectedStructure)
  ready -> Content(data)
  failed -> ErrorState(retry)
```

## Store Implementation

Query state determines initial loading versus background refresh. Skeletons own no domain data.

## Rules

- **DS-SKELETON-001** — Skeletons MUST represent loading, not empty results or fetch failure.
- **DS-SKELETON-002** — Background refresh SHOULD retain valid existing content unless the workflow requires concealment.
- **DS-SKELETON-003** — Loading regions MUST have an accessible status while decorative placeholder fragments remain non-interactive.
- **DS-SKELETON-004** — Animations MUST honor reduced-motion preferences.

## Accessibility

Do not create repeated focus targets or meaningless screen-reader placeholder text.

## Security and Permissions

Do not use private previous-user content as a loading placeholder after a scope/session change.

## Validation

Test initial load, slow load, refresh, error transition, layout stability, and reduced motion.

## Related Patterns

- [list-loading-pattern ](../../interaction-patterns/list-loading-pattern.md)
- [error-state-pattern ](error-state-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
