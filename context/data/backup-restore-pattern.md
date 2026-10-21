---
id: CORE-DATA-BACKUP-RESTORE
status: baseline
scope: data
owner: application-maintainers
---

# Backup and Restore

## Guidelines
DATA-BACKUP-001 MUST define protected datasets, file/database consistency, retention, access, encryption, and recovery objectives.

## Why
Backup existence does not prove that a system can be restored.

## Structure
~~~text
consistent snapshot -> protected backup + metadata
                    -> isolated restore
                    -> integrity/application verification
                    -> recorded recovery time and gaps
~~~

## Implementation
Use engine-appropriate tooling and environment-approved storage. Coordinate database and upload versions. Never test restore by overwriting an unverified live target.

## Rules
DATA-BACKUP-002 MUST validate exact source and destination before restoration.
DATA-BACKUP-003 MUST keep backup credentials and sensitive content out of logs and reports.
DATA-BACKUP-004 MUST verify restoration with representative records/files and application flows.
DATA-BACKUP-005 MUST state actual recoverable point/time rather than promise unmeasured targets.

## Validation
Disposable restore, checksum/integrity, cross-file references, permissions, version compatibility, and recovery documentation.
