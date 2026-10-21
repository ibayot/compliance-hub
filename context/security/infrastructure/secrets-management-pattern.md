---
id: SEC-SECRET-LIFECYCLE
status: baseline
scope: security
owner: application-maintainer
triggers: ["secret", "API key", "credential rotation"]
---

# Secret provisioning and rotation pattern

## Guidelines

Use the environment's approved secret facility and limit each credential to its purpose and consumers.

## Why

A secret requires secure creation, delivery, access, rotation, revocation, and incident response.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
secret reference → authorized provisioner → runtime injection → bounded consumer → rotation/revocation → verified cleanup
```

## Implementation

Document secret names, purposes, owners, consumers, and rotation procedure without recording values. Prefer runtime-mounted files or managed retrieval when supported; document the operational constraints of environment injection. Build-time access uses ephemeral secret mounts.

## Rules

- **SEC-SECRET-LIFECYCLE-001** — MUST keep secret values out of source, examples, context documents, image layers, build arguments, and logs.
- **SEC-SECRET-LIFECYCLE-002** — MUST restrict secret access by workload and environment and define a rotation/revocation owner.
- **SEC-SECRET-LIFECYCLE-003** — MUST treat a discovered committed or logged credential as an exposure requiring containment and rotation, not merely deletion.

## Validation

Review synthetic placeholders, build instructions, runtime delivery, and an isolated rotation rehearsal. Avoid printing live secret values during verification.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [secrets-pattern](../secrets-pattern.md)
- [incident-response-pattern](../observability/incident-response-pattern.md)

Reference: [OWASP Secrets Management](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html).
