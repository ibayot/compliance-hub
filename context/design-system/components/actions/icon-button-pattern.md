---
id: DS-ICONBUTTON
status: baseline
scope: design-system
triggers:
  - "icon action"
  - "compact action"
---

# Icon Button Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use an icon button for recognizable compact actions; add visible text when the meaning or consequence is unclear.

## Why

Compact controls save space only when their purpose stays understandable and their targets remain usable.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
IconButton(label: 'Download attachment', icon: download, onActivate: download)
Tooltip(text: 'Download attachment')
```

## Store Implementation

Interaction state stays local; operation status belongs to the action owner.

## Rules

- **DS-ICONBUTTON-001** — Every icon button MUST expose a specific accessible action name.
- **DS-ICONBUTTON-002** — A tooltip MUST NOT be the sole accessible name or sole explanation of a consequential action.
- **DS-ICONBUTTON-003** — Targets MUST meet the active platform's accessibility requirements even when the visual icon is small.
- **DS-ICONBUTTON-004** — Repeated row actions SHOULD include record context in their accessible name when needed for disambiguation.

## Accessibility

Check focus, keyboard activation, touch discovery, and screen-reader distinction between repeated actions.

## Security and Permissions

Protect downloads/deletions at their endpoint regardless of icon visibility.

## Validation

Inspect names in a row list, narrow layouts, tooltip access, and disabled/busy behavior.

## Related Patterns

- [icon-pattern ](../../foundations/icon-pattern.md)
- [tooltip-pattern ](../overlays/tooltip-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
