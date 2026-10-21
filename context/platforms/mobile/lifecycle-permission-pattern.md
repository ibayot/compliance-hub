---
id: PLAT-MOB-LIFE
status: baseline
scope: "Mobile Platform; applicable only when enabled by the application profile"
triggers:
  - "mobile permission"
  - "app resume"
  - "native interruption"
---

# Mobile Lifecycle and Permissions

## Guidelines

Represent launch, pause/resume, process recreation, and permission outcomes in workflow design.

## Why

A mobile process can lose memory or return from system UI at an unexpected point.

## Structure

```text
Pseudocode:
launch/resume -> reconcile session -> restore permitted draft
request capability -> explanation -> system permission
allow/deny/permanently deny/cancel -> defined next state
background -> preserve only approved data -> release resources
```

## Implementation

Use platform-supported lifecycle hooks through the selected framework. Distinguish transient display state from recoverable workflow state. Request permissions when needed, with a useful denied path. Revalidate server session/resource scope after resuming sensitive work.

## Rules

- `PLAT-MOB-LIFE-001` MUST define denied, unavailable, and canceled outcomes for requested device capabilities.
- `PLAT-MOB-LIFE-002` MUST reconcile sensitive workflow state after resume or process recreation.
- `PLAT-MOB-LIFE-003` MUST NOT assume in-memory state survives background termination.

## Validation

Test background/resume, process recreation, permission revocation in settings, repeated denial, and session expiry during system UI.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://developer.android.com/guide/components/activities/activity-lifecycle)
