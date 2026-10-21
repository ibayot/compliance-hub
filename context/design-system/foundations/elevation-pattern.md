---
id: DS-ELEVATION
status: baseline
scope: design-system
triggers:
  - "shadow"
  - "z-index"
  - "overlay stacking"
---

# Elevation and Layering Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a documented layering order and semantic elevation tokens for surfaces and overlays.

## Why

Predictable stacking prevents menus, dialogs, tooltips, and focus indicators from obscuring each other.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
layers = [base, stickyRegion, drawer, dialog, nestedPopover, transientFeedback]
surface.elevation = token.elevation[role]
```

## Store Implementation

Overlay managers may own stacking coordination. Individual surfaces should not invent global layer counters.

## Rules

- **DS-ELEVATION-001** — Layering MUST follow the active design-system order; arbitrary high z-index values require a recorded reason.
- **DS-ELEVATION-002** — Nested overlays MUST retain a clear active focus scope and an accessible dismissal path.
- **DS-ELEVATION-003** — Shadows MUST NOT be the only boundary for a control or required region.
- **DS-ELEVATION-004** — Persistent or transient surfaces MUST NOT cover the focused action or essential feedback without an alternative.

## Accessibility

Check keyboard focus, high-contrast modes, zoom, and screen-reader reading order.

## Security and Permissions

Security or confirmation prompts must not be hidden by lower-priority surfaces.

## Validation

Open supported nested menu/dialog/drawer combinations and verify order, dismissal, and focus return.

## Related Patterns

- [dialog-pattern ](../components/overlays/dialog-pattern.md)
- [popover-pattern ](../components/overlays/popover-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
