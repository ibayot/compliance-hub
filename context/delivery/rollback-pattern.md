---
id: CORE-DELIVERY-ROLLBACK
status: baseline
scope: delivery
owner: application-maintainers
---

# Release Rollback

## Guidelines
DELIVERY-ROLLBACK-001 MUST define trigger, authority, known-good artifact, data compatibility, verification, and limitations.

## Why
Reverting an image does not reverse schema changes, deleted data, sent messages, or external effects.

## Structure
~~~text
detect failed rollout -> decide rollback/forward fix
                     -> restore compatible artifact/config
                     -> reconcile data/effects -> verify
~~~

## Implementation
Prefer reversible rollout steps and compatible migrations when practical. If restoration is required, use a verified target and recovery procedure.

## Rules
DELIVERY-ROLLBACK-002 MUST verify schema/data compatibility before reusing an older artifact.
DELIVERY-ROLLBACK-003 MUST preserve incident evidence and disclose irreversible effects.
DELIVERY-ROLLBACK-004 MUST test critical workflows after recovery.

## Validation
Rehearse proportionately in a safe environment; record untested steps and recovery bounds.
