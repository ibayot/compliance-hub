---
id: CTR-VOLUME
status: baseline
scope: "Docker Compose; applicable only when enabled by the application profile"
triggers:
  - "volume"
  - "bind mount"
  - "database initialization"
---

# Volumes, Persistence, and Initialization

## Guidelines

Define durable data ownership and separate initial creation from upgrades.

## Why

A container rebuild preserves volumes, while many initialization hooks run only on a new data directory.

## Structure

```text
Storage record:
named volume/bind mount -> data owner -> backup owner
empty volume -> initialization workflow
existing volume -> explicit upgrade workflow
replacement container -> same compatible data -> verified recovery
```

## Implementation

Document read-only versus writable mounts, host permissions, project-name effects, and restore requirements. Keep database initialization scripts aligned with their image's actual contract. Do not assume bootstrap scripts rerun on existing volumes. Avoid running the same destructive migration from competing replicas.

## Rules

- `CTR-VOLUME-001` MUST identify persistent data and its backup/restore ownership.
- `CTR-VOLUME-002` MUST distinguish empty-volume initialization from existing-data upgrades.
- `CTR-VOLUME-003` MUST NOT delete or recreate production volumes as an ordinary container-rebuild step.

## Validation

Test empty and populated storage separately, container replacement, version upgrade, permissions, and restore to a disposable environment.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/engine/storage/volumes/)
