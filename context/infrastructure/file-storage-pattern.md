---
id: CORE-INFRASTRUCTURE-FILE-STORAGE
status: baseline
scope: infrastructure
owner: application-maintainers
---

# File Storage

## Guidelines
INFRA-FILE-001 MUST define storage owner, identity, root/container mount, metadata, retrieval policy, history, and cleanup.

## Why
A successful upload response is insufficient if restart, replacement, or failed processing loses the file.

## Structure
~~~text
validated upload -> staged content -> metadata/authorized link
                 -> durable storage -> preview/job
replacement -> new version + retained provenance
cleanup -> permitted orphan/retention policy
~~~

## Store Implementation
Database metadata and filesystem/object storage have separate transaction semantics. Define compensation and reconciliation. Keep unsaved browser File objects out of persistent global state.

## Rules
INFRA-FILE-002 MUST constrain paths to an approved root and use server-generated storage names.
INFRA-FILE-003 MUST authorize original, preview, and historical retrieval.
INFRA-FILE-004 MUST define persistent volume and backup consistency.
INFRA-FILE-005 MUST not delete previous content merely because a replacement selection changed.

## Validation
Restart, orphan, missing content, duplicate name, traversal, denied access, replacement failure, restore. Add [file security](../security/file-handling-pattern.md).
