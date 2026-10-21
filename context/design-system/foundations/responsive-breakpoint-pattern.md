---
id: DS-RESPONSIVE
status: baseline
scope: design-system
triggers:
  - "responsive UI"
  - "mobile layout"
  - "breakpoint"
---

# Responsive Breakpoint Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use the active application profile's supported layout modes and theme breakpoints. Choose changes based on content and workflow needs.

## Why

Shared breakpoints and explicit adaptations preserve coherent navigation and action hierarchy across screen sizes.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
layout = chooseAvailableSpaceMode(container, profile.breakpoints)
renderSameWorkflow(layout, permissions, state)
```

## Store Implementation

Viewport/container observation is layout state. Keep workflow values stable when layout mode changes.

## Rules

- **DS-RESPONSIVE-001** — Responsive changes MUST preserve required information, authorized actions, and the user's in-progress values.
- **DS-RESPONSIVE-002** — Breakpoints MUST reference the active theme or profile; do not assume generic library defaults are the deployed values.
- **DS-RESPONSIVE-003** — Pointer hover MUST NOT be required to discover a primary action.
- **DS-RESPONSIVE-004** — A mobile browser layout MUST NOT be treated as proof of native mobile support.

## Accessibility

Check text scaling, zoom, orientation changes, touch targets, keyboard access, and logical reading order.

## Security and Permissions

Sensitive fields hidden for density still need correct server authorization and safe response filtering.

## Validation

Review the actual profile-supported web/mobile modes and resize during an in-progress task.

## Related Patterns

- [responsive-actions-pattern ](../interaction-patterns/responsive-actions-pattern.md)
- [table-pattern ](../components/data-display/table-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
