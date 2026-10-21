---
id: CTR-USER
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "USER"
  - "container permission"
  - "upload directory"
---

# Container Identity and Writable Paths

## Guidelines

Define runtime identity and the smallest set of writable paths the service needs.

## Why

Changing USER without ownership planning can break uploads, caches, sockets, or mounted volumes.

## Structure

```text
Identity contract:
runtime UID/GID -> allowed writable paths
read-only application artifacts -> writable uploads/cache/tmp
volume ownership -> startup check -> bounded permissions
```

## Implementation

Prefer a non-root runtime identity where compatible. Align filesystem ownership with bind mounts/named volumes; never fix a failure by making an entire application tree world-writable. A read-only root filesystem requires explicit temporary and persistent write paths.

## Rules

- `CTR-USER-001` MUST document the runtime identity and required writable paths for changed services.
- `CTR-USER-002` SHOULD run application code without root privileges where the supported runtime permits it.
- `CTR-USER-003` MUST NOT resolve permission errors through blanket world-writable permissions.

## Validation

Run with the intended identity and mounted storage. Test upload, preview/temp file creation, restart, and ownership after backup/restore.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/reference/dockerfile/#user)
