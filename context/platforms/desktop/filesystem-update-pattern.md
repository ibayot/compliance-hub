---
id: PLAT-DESK-FILE
status: baseline
scope: "Desktop Platform; applicable only when enabled by the application profile"
triggers:
  - "desktop file access"
  - "local database"
  - "desktop upgrade"
---

# Desktop Filesystem and Local Data

## Guidelines

Constrain file access to a user-selected or explicitly owned scope and define local-data lifecycle.

## Why

A desktop application has access to valuable user files outside its own data directory.

## Structure

```text
Pseudocode:
picker -> selected target -> canonical path -> scope validation
write -> supported atomic replacement -> result
local-data upgrade -> backup/recovery policy -> compatible launch
```

## Implementation

Handle symlinks, permissions, locked files, interrupted writes, and path differences. Use approved credential storage for secrets. Separate user-owned documents from application caches and uninstallable data; define retention and export policies.

## Rules

- `PLAT-DESK-FILE-001` MUST validate resolved targets before recursive or destructive file operations.
- `PLAT-DESK-FILE-002` MUST preserve user-owned documents across updates/uninstall unless explicit deletion is requested.
- `PLAT-DESK-FILE-003` MUST define recovery before incompatible persistent-data changes.

## Validation

Test spaces/Unicode, traversal and symlink cases, permission denial, disk full, locked files, interrupted write, and upgrade recovery.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://learn.microsoft.com/en-us/windows/win32/fileio/naming-a-file)
