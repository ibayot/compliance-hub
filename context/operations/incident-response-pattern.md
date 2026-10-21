---
id: CORE-OPERATIONS-INCIDENT-RESPONSE
status: baseline
scope: operations
owner: application-maintainers
---

# Operational Incident Response

## Guidelines
OPS-INCIDENT-001 MUST define impact, owner, timeline, containment, restoration, communication authority, and evidence preservation.

## Why
Fast restoration and accurate diagnosis both require a controlled record of actions.

## Structure
~~~text
detect -> assess -> contain -> restore -> verify -> learn
~~~

## Implementation
Escalate security/privacy concerns through the application-approved private process. Keep public context free of exploit details, personal data, and credentials.

## Rules
OPS-INCIDENT-002 MUST distinguish confirmed cause from hypothesis.
OPS-INCIDENT-003 MUST track corrective changes and any temporary exceptions.
OPS-INCIDENT-004 MUST verify user workflows and data integrity before declaring restoration.

## Validation
Use a safe tabletop exercise or an authorized incident review; measure gaps and owners without claiming an unperformed rehearsal.
