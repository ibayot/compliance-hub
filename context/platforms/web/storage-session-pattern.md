---
id: PLAT-WEB-STORAGE
status: baseline
scope: "Web Platform; applicable only when enabled by the application profile"
triggers:
  - "localStorage"
  - "cookie"
  - "browser cache"
---

# Browser Storage and Session State

## Guidelines

Classify data before persisting it and keep browser persistence separate from server authorization.

## Why

Browser-held state is user-controlled, and stale private state can survive identity changes.

## Structure

```text
Pseudocode:
server session -> authoritative identity and authorization
client cache -> scoped remote data -> clear/partition on identity change
preferences -> approved low-sensitivity persistence
logout -> revoke/clear according to session policy
```

## Store Implementation

Use the application's established token/cookie model; changing it is an architecture/security decision. Define persistence lifetime, cross-tab behavior, expiry, and cache partitioning. Do not store secrets merely because a browser storage API is convenient.

## Rules

- `PLAT-WEB-STORAGE-001` MUST NOT treat browser storage values as authoritative permissions or trusted input.
- `PLAT-WEB-STORAGE-002` MUST clear or partition private cached data across account/scope transitions.
- `PLAT-WEB-STORAGE-003` MUST document persistence lifetime and sensitivity for newly stored values.

## Validation

Test logout/login as another user, multiple tabs, expired sessions, reload, unavailable storage, and corrupted persisted values.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://html.spec.whatwg.org/multipage/webstorage.html)
