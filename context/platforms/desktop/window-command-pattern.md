---
id: PLAT-DESK-WINDOW
status: baseline
scope: "Desktop Platform; applicable only when enabled by the application profile"
triggers:
  - "desktop window"
  - "menu command"
  - "keyboard shortcut"
---

# Desktop Windows, Menus, and Commands

## Guidelines

Give each command a canonical action with consistent menu, toolbar, and shortcut behavior.

## Why

Duplicated handlers can bypass validation or act on the wrong window/selection.

## Structure

```text
Pseudocode:
menu/toolbar/shortcut -> canonical command -> active-context check
-> permission + validation -> operation -> shared feedback
window close -> dirty-state policy -> bounded shutdown
```

## Implementation

Respect OS conventions and editable-field shortcut behavior. Define multi-window ownership and selected-record scope. A disabled menu item must agree with other invocations; privileged handlers still enforce access.

## Rules

- `PLAT-DESK-WINDOW-001` MUST route equivalent command entrypoints through the same validation and permission contract.
- `PLAT-DESK-WINDOW-002` MUST define dirty-state handling before window close or application exit.
- `PLAT-DESK-WINDOW-003` SHOULD use platform conventions for shortcuts without stealing standard text-editing keys.

## Validation

Test focused inputs, multiple windows, no selection, stale selection, menu/shortcut equivalence, and close during an unsaved operation.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://learn.microsoft.com/en-us/windows/apps/design/input/keyboard-interactions)
