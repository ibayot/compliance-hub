---
id: DS-APPNAV
status: baseline
scope: design-system
triggers:
  - "sidebar"
  - "app navigation"
  - "navigation shell"
---

# Application Navigation Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Keep stable destinations and labels; show the current location and adapt layout without changing information architecture.

## Why

Navigation consistency helps users form a reliable map of the application.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Navigation(items: allowedDestinations, currentRoute, layoutMode)
MainRegion(routeContent)
```

## Store Implementation

The router owns location and in-app history; shell-local state owns expanded groups/drawer visibility; capabilities determine allowed destinations. A route-aware Back control uses known in-app history first and a valid parent destination when a nested route is opened directly.

## Rules

- **DS-APPNAV-001** — Navigation items MUST have stable labels, grouping, destination semantics, and current-location treatment.
- **DS-APPNAV-002** — Visibility MUST follow current capabilities without acting as backend authorization.
- **DS-APPNAV-003** — Responsive navigation MUST preserve access to the same permitted destinations.
- **DS-APPNAV-004** — Route changes SHOULD close temporary navigation and establish meaningful page focus/title.
- **DS-APPNAV-005** — A persistent Back control MUST stay within the authenticated application; use known in-app history when available and a valid parent route for direct entry.
- **DS-APPNAV-006** — Nested authenticated views MUST retain an available Back action on narrow screens even when breadcrumbs are collapsed or hidden.

## Accessibility

Provide navigation landmarks, current-page state, keyboard access, and an appropriate skip mechanism.

## Security and Permissions

Recheck destination authorization on route/data access, including direct URLs.

## Validation

Test direct deep links, refresh, known in-app history, parent-route fallback, capability changes, nested routes, and narrow navigation.

Check separate recovery paths for a missing route, denied access and service failure without disclosing whether a protected record exists.

## Related Patterns

- [breadcrumbs-pattern ](breadcrumbs-pattern.md)
- [responsive-breakpoint-pattern ](../../foundations/responsive-breakpoint-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
