---
id: PLAT-WEB-RESP
status: baseline
scope: "Web Platform; applicable only when enabled by the application profile"
triggers:
  - "responsive"
  - "asset caching"
  - "web layout"
---

# Responsive Layout and Web Assets

## Guidelines

Preserve task order and action hierarchy across supported viewports, zoom, and content lengths.

## Why

A layout that fits a desktop screenshot can lose actions, labels, and overflow content on smaller screens.

## Structure

```text
Pseudocode:
content -> semantic order -> responsive layout
critical actions -> stable hierarchy -> wrap/stack when necessary
versioned assets -> cache policy
entry document/version metadata -> deployment-compatible freshness
```

## Implementation

Use shared breakpoints, spacing, and components. Define tables' horizontal overflow or alternate presentation; do not silently drop critical columns. Align cache behavior with asset fingerprinting and release rollback. Test long/localized labels even when translation is not yet enabled.

## Rules

- `PLAT-WEB-RESP-001` MUST keep critical content and actions reachable at supported widths and zoom levels.
- `PLAT-WEB-RESP-002` MUST preserve semantic reading/focus order when layout changes.
- `PLAT-WEB-RESP-003` SHOULD validate asset-cache behavior when deployment or bundle routing changes.

## Validation

Test narrow/wide viewports, keyboard focus inside overflow areas, long labels, text zoom, direct asset reload, and an upgrade from a cached prior bundle.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://www.w3.org/WAI/WCAG22/Understanding/reflow.html)
