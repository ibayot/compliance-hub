---
id: PLAT-API-CONTRACT
status: baseline
scope: "API Platform; applicable only when enabled by the application profile"
triggers:
  - "API endpoint"
  - "client compatibility"
  - "HTTP retry"
---

# API Contracts and Resilience

## Guidelines

Specify request, response, authorization, failure, and retry semantics as one consumer contract.

## Why

A successful handler does not prove compatible errors or safe retries.

## Structure

```text
Pseudocode:
consumer -> transport limits -> authentication -> authorization
-> validated request -> bounded domain operation -> approved response
failure -> stable public category + correlation -> internal diagnostics
```

## Implementation

Bound pagination, body sizes, timeouts, and expensive queries. Distinguish transport retry from domain replay; retry writes only with a defined idempotency contract. Preserve supported clients during field/status changes.

## Rules

- `PLAT-API-CONTRACT-001` MUST document successful and failed response contracts for changed public behavior.
- `PLAT-API-CONTRACT-002` MUST enforce resource authorization independently of client behavior.
- `PLAT-API-CONTRACT-003` MUST define idempotency before automatically retrying operations that can create side effects.

## Validation

Test unsupported inputs, forbidden resources, oversized/slow requests, error redaction, duplicate requests, and an existing consumer against changed responses.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://www.rfc-editor.org/rfc/rfc9110.html)
