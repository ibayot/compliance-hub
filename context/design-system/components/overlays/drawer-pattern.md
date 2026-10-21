---
id: DS-DRAWER
status: baseline
scope: design-system
triggers:
  - "drawer"
  - "side panel"
  - "detail panel"
---

# Drawer Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define whether a drawer is navigation, supplemental detail, or a modal editing task.

## Why

Different drawer roles require different focus, history, sizing, and draft behavior.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Drawer(role: navigation | detail | task, modal, open, title)
Content(selection, loading, error)
```

## Store Implementation

The parent/router owns selection/open state; form drafts remain with their workflow owner. Persist width only as a deliberate preference.

## Rules

- **DS-DRAWER-001** — Modal and non-modal drawer behavior MUST be explicit and consistent.
- **DS-DRAWER-002** — A drawer MUST provide an accessible title and dismissal path appropriate to its role.
- **DS-DRAWER-003** — Selection changes MUST define draft/reset and loading behavior.
- **DS-DRAWER-004** — Narrow layouts MUST preserve the task; a drawer may become full-screen under a documented adaptation.

## Accessibility

Manage focus only according to modal role; preserve keyboard access to non-modal surrounding content.

## Security and Permissions

Do not leave restricted details mounted and exposed after selection, capability, or identity changes.

## Validation

Test resize, deep links where supported, close/reopen, record switch, unsaved edits, and keyboard navigation.

## Related Patterns

- [dialog-pattern ](dialog-pattern.md)
- [responsive-breakpoint-pattern ](../../foundations/responsive-breakpoint-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
