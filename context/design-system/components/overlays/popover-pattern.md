---
id: DS-POPOVER
status: baseline
scope: design-system
triggers:
  - "popover"
  - "anchored panel"
  - "floating content"
---

# Popover Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a popover for short anchored content or a small interaction; give complex tasks a dialog or dedicated region.

## Why

Anchored context is useful only when positioning and dismissal remain predictable.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Popover(anchor, open, role, initialFocus?)
  Content
onDismiss -> restoreAppropriateFocus
```

## Store Implementation

Anchor/open state is local to the trigger; business values belong to the contained workflow.

## Rules

- **DS-POPOVER-001** — Popover semantics MUST match its content; menus, dialogs, and informational regions are not interchangeable.
- **DS-POPOVER-002** — Positioning MUST keep required content and controls reachable at viewport edges and enlarged text.
- **DS-POPOVER-003** — Dismissal behavior MUST cover keyboard, outside interaction, trigger removal, and nested overlays.
- **DS-POPOVER-004** — Hover MUST NOT be the sole way to access interactive popover content.

## Accessibility

Provide meaningful focus entry/exit for interactive content and a clear relationship to the trigger.

## Security and Permissions

Do not fetch or display restricted content merely because an anchor is visible.

## Validation

Test edges, scrolling, zoom, trigger unmount, Escape, touch, and focus return.

## Related Patterns

- [action-menu-pattern ](../actions/action-menu-pattern.md)
- [tooltip-pattern ](tooltip-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
