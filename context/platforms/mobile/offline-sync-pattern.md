---
id: PLAT-MOB-SYNC
status: baseline
scope: "Mobile Platform; applicable only when enabled by the application profile"
triggers:
  - "offline"
  - "sync"
  - "background retry"
---

# Mobile Offline and Synchronization

## Guidelines

Decide whether each operation is online-only, cached-read, or safely queueable.

## Why

A network failure after server acceptance creates ambiguous completion and duplicate-submission risk.

## Structure

```text
Pseudocode:
operation -> classify online requirement
queued write -> local intent ID -> retry/idempotency contract
reconnect -> authenticate -> reconcile authoritative result
conflict -> approved resolution path -> visible user status
```

## Store Implementation

No offline store is required until the profile/workflow calls for one. If enabled, define encryption, retention, ownership, retry deadlines, conflict resolution, and cleanup on logout. Keep UI offline status separate from proof that the API is reachable.

## Rules

- `PLAT-MOB-SYNC-001` MUST specify replay/idempotency behavior before queueing writes offline.
- `PLAT-MOB-SYNC-002` MUST define authorization and sensitive-data handling for persisted offline work.
- `PLAT-MOB-SYNC-003` MUST show unresolved or failed synchronization instead of claiming completion.

## Validation

Use intermittent connectivity, request accepted then response lost, duplicate replay, identity switch, stale local data, and server conflict.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://developer.android.com/topic/architecture/data-layer/offline-first)
