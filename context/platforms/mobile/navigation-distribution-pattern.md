---
id: PLAT-MOB-DIST
status: baseline
scope: "Mobile Platform; applicable only when enabled by the application profile"
triggers:
  - "mobile deep link"
  - "notification tap"
  - "mobile release"
---

# Mobile Navigation and Distribution

## Guidelines

Treat launch links and notifications as untrusted navigation inputs and validate the installed artifact.

## Why

An application may be built successfully while links, signing, or production endpoints differ from the web environment.

## Structure

```text
Pseudocode:
deep link/notification -> validate route -> authenticate -> authorize -> fetch
build environment -> signed artifact -> install -> cold start
upgrade -> preserve compatible approved data -> verify workflows
```

## Implementation

Use platform link-association configuration and installed framework/router contracts. Keep signing material external. Define minimum supported OS and data upgrade behavior. A notification payload should carry minimal identifiers rather than confidential content.

## Rules

- `PLAT-MOB-DIST-001` MUST apply normal authorization to records opened by links or notifications.
- `PLAT-MOB-DIST-002` MUST verify signing, target environment, and installed-artifact behavior before distribution.
- `PLAT-MOB-DIST-003` MUST define upgrade behavior for persisted app data affected by a release.

## Validation

Test cold/warm links, malicious route parameters, account mismatch, notification after logout, clean install, upgrade, and denied notification permission.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://developer.android.com/training/app-links)
