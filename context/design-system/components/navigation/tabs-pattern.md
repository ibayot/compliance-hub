---
id: DS-TABS
status: baseline
scope: design-system
triggers:
  - "tabs"
  - "section navigation"
---

# Tabs Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use tabs for related panels within one context; use route links when destinations need independent navigation semantics.

## Why

Clear ownership of selection prevents refresh, deep links, and keyboard behavior from diverging.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Tabs(selectedId, tabs: allowedPanels)
TabPanel(id: selectedId, content)
```

## Store Implementation

The route owns selection when shareable/deep-linked; otherwise the parent owns selected ID. Panels own their form drafts only under explicit retention rules.

## Rules

- **DS-TABS-001** — Tab identity MUST remain stable when permissions or tab order changes.
- **DS-TABS-002** — Tab changes MUST define draft retention, loading, and unsaved-change behavior.
- **DS-TABS-003** — Tabs MUST use consistent activation and keyboard behavior for their chosen navigation model.
- **DS-TABS-004** — An unavailable selected tab MUST fall back to a valid permitted location without exposing restricted content.

## Accessibility

Associate tabs with panels and support appropriate keyboard navigation; do not imitate tabs with unlabeled clickable text.

## Security and Permissions

Each panel's data and actions require authorization independent of tab visibility.

## Validation

Test keyboard switching, refresh/deep links, permission changes, panel loading, and unsaved values.

## Related Patterns

- [unsaved-changes-pattern ](../../interaction-patterns/unsaved-changes-pattern.md)
- [application-navigation-pattern ](application-navigation-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
