---
id: SEC-INCIDENT
status: baseline
scope: security
owner: application-maintainer
triggers: ["credential exposure", "security incident", "suspected compromise"]
---

# Security incident and exposure response pattern

## Guidelines

Use the application's named response owner and controlled incident channel. Separate observation, hypothesis, containment, and recovery evidence.

## Why

Uncoordinated cleanup may destroy evidence, spread sensitive details, or leave compromised credentials usable.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
detect → triage → assigned owner → proportionate containment → evidence preservation → recovery verification → lessons/actions
```

## Implementation

Document contact references, severity criteria, credential/session revocation, rollback options, and notification decisions in approved channels. Keep raw secrets, personal records, and exploitable details out of public repository context.

## Rules

- **SEC-INCIDENT-001** — MUST report suspected exposures through the approved channel with the minimum necessary evidence.
- **SEC-INCIDENT-002** — MUST preserve authorized evidence and obtain operational authority before destructive containment or broad production actions.
- **SEC-INCIDENT-003** — MUST verify recovery and track remaining corrective actions with accountable owners.

## Validation

Run a tabletop using synthetic evidence. Confirm owner availability, access to runbooks, authority boundaries, and recovery decision criteria.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [secrets-management-pattern](../infrastructure/secrets-management-pattern.md)
- [security-logging-pattern](security-logging-pattern.md)
