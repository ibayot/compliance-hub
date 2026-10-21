---
id: CTR-RECOVERY
status: baseline
scope: "Container Operations; applicable only when enabled by the application profile"
triggers:
  - "backup"
  - "restore"
  - "container rollback"
---

# Container Backup, Restore, and Rollback

## Guidelines

Treat artifact rollback and persistent-data recovery as separate compatibility decisions.

## Why

Reverting an image does not reverse schema mutations or restore lost file data.

## Structure

```text
Before deployment:
record current image digests + configuration + schema/data compatibility
verify recoverable database/files backup
define rollback window and decision point
After failure:
stop unsafe writes -> select compatible recovery path
-> restore/redeploy approved target -> verify integrity and access
```

## Implementation

Use database-consistent backups and coordinate associated file versions when required. A copied live data directory may be invalid. Restore only to explicit reviewed targets. Production destructive recovery requires the task's authorization and existing operational procedure.

## Rules

- `CTR-RECOVERY-001` MUST verify restore viability rather than treating backup creation as sufficient evidence.
- `CTR-RECOVERY-002` MUST assess schema/data compatibility before rolling back an image.
- `CTR-RECOVERY-003` MUST identify exact targets and consequences before destructive recovery operations.

## Validation

Perform recovery drills on disposable representative storage. Verify data integrity, attachment references, authorization, and reapplication/rollback boundaries.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/engine/storage/volumes/#back-up-restore-or-migrate-data-volumes)
