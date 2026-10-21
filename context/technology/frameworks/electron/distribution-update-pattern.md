---
id: TECH-ELECTRON-DIST
status: baseline
scope: "Electron; applicable only when enabled by the application profile"
triggers:
  - "Electron installer"
  - "auto-update"
  - "code signing"
---

# Electron Packaging and Updates

## Guidelines

Define update trust, signing, distribution, and persistent-data compatibility per supported OS.

## Why

A successfully built desktop bundle does not prove a trustworthy install or recoverable update.

## Structure

```text
Pseudocode:
verified build -> OS signing/notarization as required
-> trusted publication -> authenticated update metadata/artifact
-> user-safe install/restart -> data-compatible launch -> recovery path
```

## Implementation

Use the application's selected packaging/updater stack. Separate signing credentials from source and build logs. Plan compatibility of local data and updater failures, including interrupted downloads and unavailable update endpoints.

## Rules

- `TECH-ELECTRON-DIST-001` MUST verify artifact provenance and required OS signing before distribution.
- `TECH-ELECTRON-DIST-002` MUST keep signing keys and updater credentials outside committed configuration.
- `TECH-ELECTRON-DIST-003` MUST define recovery for interrupted updates and incompatible local-data changes.

## Validation

Test clean install, upgrade with representative local data, signature validation, unavailable update source, interrupted update, and uninstall data policy.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.electronjs.org/docs/latest/tutorial/updates)
