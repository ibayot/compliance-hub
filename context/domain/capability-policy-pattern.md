---
id: CORE-DOMAIN-CAPABILITY-POLICY
status: baseline
scope: domain
owner: application-maintainers
---

# Capability and Resource Policy

## Guidelines
DOMAIN-POLICY-001 MUST combine coarse capability with resource scope, ownership, current state, and contextual restrictions.

## Why
A person allowed to perform an operation is not necessarily allowed to perform it on every record.

## Structure
~~~text
actor + capability + resource + context -> allow/deny + safe reason
~~~

## Implementation
Centralize repeated predicates in an owned policy module. Frontend helpers mirror discoverability, while the backend evaluates authoritative facts.

## Rules
DOMAIN-POLICY-002 MUST avoid hard-coded display role labels for new capability-controlled actions.
DOMAIN-POLICY-003 MUST test alternate entrypoints such as export, download, batch, and internal calls.
DOMAIN-POLICY-004 MUST not let stale client state override a changed permission.

## Validation
Capability/ownership/unit/status matrix and direct API negatives. Load the relevant [security pattern](../security/authorization-pattern.md).
