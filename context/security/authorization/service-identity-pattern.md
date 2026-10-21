---
id: SEC-SERVICE-ID
status: baseline
scope: security
owner: application-maintainer
triggers: ["internal endpoint", "service-to-service", "worker identity"]
---

# Service identity and delegation pattern

## Guidelines

Authenticate workloads independently of the end user. State whether a call uses service authority, delegated user authority, or both.

## Why

A broad service credential must not turn an untrusted actor header into unrestricted user impersonation.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
caller workload proof + optional verified delegation → receiver authentication → allowed operation/audience → resource policy
```

## Implementation

Document credential provisioning, transport, rotation, recipient restrictions, and failure behavior. Derive delegation only from verified context. Make asynchronous messages carry bounded, verifiable authority or re-evaluate permissions.

## Rules

- **SEC-SERVICE-ID-001** — MUST authenticate the service caller and restrict the operations it can invoke.
- **SEC-SERVICE-ID-002** — MUST NOT trust arbitrary forwarded user IDs, roles, or scope headers as delegation proof.
- **SEC-SERVICE-ID-003** — MUST define key rotation and reject missing or invalid workload credentials without anonymous fallback.

## Validation

Test no credential, wrong service, wrong audience, forged delegation, expired credentials, and rotation overlap in an isolated environment.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [service-authentication-pattern](../service-authentication-pattern.md)
- [secrets-pattern](../secrets-pattern.md)
- [trust-boundaries](../foundations/trust-boundaries.md)

Reference: [OWASP Microservices Security](https://cheatsheetseries.owasp.org/cheatsheets/Microservices_Security_Cheat_Sheet.html).
