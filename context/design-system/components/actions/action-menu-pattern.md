---
id: DS-ACTIONMENU
status: baseline
scope: design-system
triggers:
  - "overflow menu"
  - "row menu"
  - "secondary actions"
---

# Action Menu Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Group lower-priority actions in a menu; keep the workflow's main action discoverable.

## Why

Menus reduce repeated clutter while preserving predictable action grouping and risk separation.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
MenuTrigger(label: 'Actions for record')
Menu(items: authorizedActions, groups: [common, destructive])
```

## Store Implementation

Open/anchor state is local. Build allowed actions from current capabilities and record state; do not cache stale permission outcomes globally.

## Rules

- **DS-ACTIONMENU-001** — Menu contents MUST match current record state and authorized capabilities.
- **DS-ACTIONMENU-002** — Actions MUST use consistent ordering and labels across equivalent records.
- **DS-ACTIONMENU-003** — Destructive actions MUST be visually and structurally separated from routine actions.
- **DS-ACTIONMENU-004** — A menu MUST dismiss predictably after selection or cancellation and restore appropriate focus.

## Accessibility

Use the platform's menu interaction semantics; test keyboard traversal, Escape, disabled items, and return focus.

## Security and Permissions

Backend operations must reject unauthorized or stale transitions even if an item previously appeared.

## Validation

Check no actions, one action, many actions, permission changes, viewport edges, and nested confirmation.

## Related Patterns

- [popover-pattern ](../overlays/popover-pattern.md)
- [destructive-action-pattern ](../../interaction-patterns/destructive-action-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
