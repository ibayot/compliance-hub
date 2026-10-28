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
Use engine-appropriate tooling and environment-approved storage. Coordinate database and upload versions. Never test restore by overwriting an unverified live target. Resolve prerequisites through [engine safeguards](engine-safeguards-pattern.md): an export may omit catalog/role/ownership/extension metadata, encryption keys, logs or external files needed for recovery. Record inapplicable dependencies with a reason; never export plaintext credentials merely to make a recovery artifact appear self-contained. A logical export/snapshot is not automatically a point-in-time recovery system.

When an archive omits access-control metadata, reconstruct effective permissions from the supported schema's reviewed policy before promotion. Check restored runtime table and column grants against a fresh installation, including append-only evidence and narrowly mutable status columns. A broad write grant followed by a historical denylist can silently give newer tables excess authority. Treat unknown objects or unsupported versions as a review boundary rather than guessing permissions. Preserve the previous target and restored-work holds until explicit reconciliation. These checks instantiate DATA-BACKUP-002/004/006; successful data reads alone do not prove safe recovery.

## Rules
DATA-BACKUP-002 MUST validate exact source and destination before restoration.
DATA-BACKUP-003 MUST keep backup credentials and sensitive content out of logs and reports.
DATA-BACKUP-004 MUST verify restoration with representative records/files and application flows.
DATA-BACKUP-005 MUST state actual recoverable point/time rather than promise unmeasured targets.
DATA-BACKUP-006 MUST declare backup scope and required target/tool/catalog/role/extension/key/external-data prerequisites as applicable, provision them through approved mechanisms, and verify intended recovery rather than assuming one artifact contains the whole system.

## Validation
Disposable restore, checksum/integrity, cross-file references, permissions, version compatibility, and recovery documentation.
