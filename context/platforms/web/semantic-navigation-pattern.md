---
id: PLAT-WEB-NAV
status: baseline
scope: "Web Platform; applicable only when enabled by the application profile"
triggers:
  - "web button/link"
  - "route"
  - "keyboard"
---

# Web Semantics and Navigation

## Guidelines

Use platform semantics for actions and navigation, with consistent history and focus behavior.

## Why

A visually identical control can behave differently for keyboard users, assistive technology, and browser navigation.

## Structure

```text
Pseudocode:
navigation -> link with meaningful destination
local action -> button with accessible name
route change -> preserve expected history -> focus page destination
back -> meaningful prior location and filter context
```

## Implementation

Use the application's canonical components while preserving their rendered semantics. Ensure SPA routing supports direct URLs, reload, back/forward, and authorization checks. Make focus movement intentional after route transitions and dialog closure.

## Rules

- `PLAT-WEB-NAV-001` MUST use action and navigation controls with appropriate native semantics.
- `PLAT-WEB-NAV-002` MUST preserve keyboard operation and a visible focus indicator.
- `PLAT-WEB-NAV-003` MUST verify direct navigation, reload, and browser back/forward for changed routes.

## Validation

Use keyboard-only navigation and supported browsers. Test deep links, scroll/focus restoration, disabled actions, and unsaved form navigation.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://html.spec.whatwg.org/multipage/interaction.html)
