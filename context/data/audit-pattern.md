---
id: CORE-DATA-AUDIT
status: baseline
scope: data
owner: application-maintainers
---

# Audit Event Pattern

## Guidelines
DATA-AUDIT-001 MUST define who, what, target, when, outcome, and correlation for audited mutations.

## Why
Operational logs explain execution; audit records explain accountable business changes.

## Structure
~~~text
actor + action + resource + timestamp + outcome
+ permitted before/after summary + reason + request correlation
~~~

## Implementation
Prefer stable identifiers and bounded changes over dumping full request bodies. Specify transaction consistency, access controls, retention, tamper resistance, and failure behavior based on the application's requirements.

## Rules
DATA-AUDIT-002 MUST not record passwords, access tokens, or unnecessary sensitive content.
DATA-AUDIT-003 MUST preserve historical file/record provenance required by the domain.
DATA-AUDIT-004 MUST not claim a complete audit trail from the presence of a log table alone.
DATA-AUDIT-005 MUST distinguish actor identity from the subject/requester.

## Validation
Successful/failed mutation, system actor, corrected record, replacement, scoped access, missing audit write, and redaction.
