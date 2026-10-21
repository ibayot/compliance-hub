---
id: CORE-INFRASTRUCTURE-DISASTER-RECOVERY
status: baseline
scope: infrastructure
owner: application-maintainers
---

# Disaster Recovery

## Guidelines
INFRA-DR-001 MUST define failure scenarios, accountable owner, recovery dependencies, and tested objectives.

## Why
Image availability, database recovery, file recovery, secrets, DNS, and external systems are separate requirements.

## Structure
~~~text
incident decision -> restore infrastructure/config
                  -> restore consistent data/files
                  -> verify security and workflows
                  -> controlled service return
~~~

## Implementation
Keep recovery secrets in approved protected storage, not the runbook. Record actual measured recovery time and data loss. Plan reconciliation for jobs, notifications, and external effects.

## Rules
INFRA-DR-002 MUST verify recovery in an isolated target before relying on a procedure.
INFRA-DR-003 MUST preserve evidence and avoid overwriting the only recoverable copy.
INFRA-DR-004 MUST state uncertainty where backup/recovery has not been tested.

## Validation
Scenario rehearsal, dependencies, representative data/files, permission checks, and post-recovery reconciliation.
