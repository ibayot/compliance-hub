---
id: DS-BREADCRUMBS
status: baseline
scope: design-system
triggers:
  - "breadcrumbs"
  - "location hierarchy"
---

# Breadcrumbs Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use breadcrumbs for stable hierarchical location; distinguish them from browsing history.

## Why

Hierarchy helps users return to meaningful parents without implying a false previous-page sequence.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Breadcrumbs([{label, href}, ..., {label: currentTitle, current: true}])
```

## Store Implementation

Derive crumbs from route/domain hierarchy and authorized metadata; no separate global history store is needed.

## Rules

- **DS-BREADCRUMBS-001** — Breadcrumbs MUST represent a real navigational hierarchy.
- **DS-BREADCRUMBS-002** — The current location MUST be distinguishable and SHOULD not be a redundant active link.
- **DS-BREADCRUMBS-003** — Record-derived labels MUST respect access and safe truncation rules.
- **DS-BREADCRUMBS-004** — Narrow layouts MUST retain an understandable path to important parents.

## Accessibility

Use a labelled breadcrumb navigation region, list structure, and current-page indication.

## Security and Permissions

Do not reveal restricted ancestor names or link to unauthorized parent scopes.

## Validation

Test deep routes, long names, missing metadata, direct entry, permissions, and keyboard use.

## Related Patterns

- [application-navigation-pattern ](application-navigation-pattern.md)
- [unsaved-changes-pattern ](../../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
