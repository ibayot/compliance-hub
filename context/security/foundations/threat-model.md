---
id: SEC-THREAT
status: baseline
scope: security
owner: application-maintainer
triggers: ["new service", "new integration", "data flow change"]
---

# Threat modeling pattern

## Guidelines

Model the changed feature proportionately before choosing controls. Cover actors, assets, abuse cases, controls, and remaining risks.

## Why

A feature can be internally consistent while trusting the wrong party or exposing a new attack path.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
flow_id | source | destination | asset | boundary | abuse case | control | owner | evidence | residual risk
```

## Implementation

Draw only relevant flows. Consider impersonation, tampering, unauthorized disclosure, resource exhaustion, and unsafe business transitions. Keep exploitable operational details in an access-controlled issue, linked by a safe reference.

## Rules

- **SEC-THREAT-001** — MUST update the relevant threat assessment when a trust boundary or sensitive data flow changes.
- **SEC-THREAT-002** — MUST distinguish verified controls, proposed controls, and unresolved assumptions.
- **SEC-THREAT-003** — SHOULD convert material abuse cases into acceptance criteria or negative tests.

## Validation

Walk the happy path and one misuse path with the proposed trust assumptions removed. Confirm each material risk has an owner and disposition.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [trust-boundaries](trust-boundaries.md)
- [security-review-pattern](../validation/security-review-pattern.md)

Reference: [OWASP Threat Modeling](https://cheatsheetseries.owasp.org/cheatsheets/Threat_Modeling_Cheat_Sheet.html).
