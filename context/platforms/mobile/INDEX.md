---
id: PLAT-MOB-PACK
status: baseline
scope: "Mobile Platform context pack; conditional activation"
triggers:
  - "mobile"
---

# Mobile Platform Pack

## Guidelines

Read this pack only when [the application profile](../../application/PROFILE.md) enables `mobile` or explicitly maps a task to this pack. A file being present is not activation. This is a portable baseline; application-specific decisions and exceptions refine it.

Enable for the profile's declared native/hybrid targets. Inspect Android/iOS versions, plugin and framework support, device requirements, network assumptions, and store/distribution model. Do not assume iOS readiness from Android scripts.

## Why

Focused platform context avoids importing unrelated language, framework, or runtime assumptions into a task. A framework does not choose a domain workflow or establish the security of an existing implementation.

## Structure

- [Mobile Lifecycle and Permissions](lifecycle-permission-pattern.md) — `PLAT-MOB-LIFE`
- [Mobile Offline and Synchronization](offline-sync-pattern.md) — `PLAT-MOB-SYNC`
- [Mobile Navigation and Distribution](navigation-distribution-pattern.md) — `PLAT-MOB-DIST`

## Implementation

Start with current manifests/lockfiles, build configuration, and the actual entrypoint. Load only patterns matching the change and add security/quality context when triggered. Match official documentation to the installed version; linked current documentation is a reference, not permission to upgrade.

Examples and pseudocode illustrate boundaries. Adapt them to canonical components and APIs actually present in the application. When a required convention is not established, record a candidate decision rather than introducing an architecture silently.

## Rules

- `PLAT-MOB-PACK-001` MUST apply this pack only when the profile enables or explicitly routes the relevant target.
- `PLAT-MOB-PACK-002` MUST confirm installed/runtime versions before relying on version-specific APIs or configuration.
- `PLAT-MOB-PACK-003` MUST identify applicable pattern rule IDs and targeted validation for a substantive change.

## Validation

Confirm activation, selected documents, source/configuration evidence, and version compatibility. Run the existing checks appropriate to changed behavior. Context-only edits require document/link/rule validation; they do not require running application builds.

## Related

- [Application profile](../../application/PROFILE.md)
- [Security](../../security/INDEX.md)
- [Validation matrix](../../quality/validation-matrix.md)
- [Official reference](https://developer.android.com/guide/components/activities/activity-lifecycle)
