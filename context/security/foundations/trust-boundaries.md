---
id: SEC-TRUST
status: baseline
scope: security
owner: application-maintainer
triggers: ["service boundary", "network ingress", "external data"]
---

# Trust boundary pattern

## Guidelines

Declare the trust level at each crossing: user device, API, worker, storage, third party, and operational tooling.

## Why

Private networks, internal headers, and previously stored records do not establish identity or input safety.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
boundary: {caller, receiver, identity_proof, allowed_actions, validation, transport, failure_mode}
```

## Implementation

Authenticate the caller and validate the contract at the receiving side. Carry user delegation separately from service identity. Inspect derived artifacts, queues, caches, and imports as additional crossings.

## Rules

- **SEC-TRUST-001** — MUST treat external and caller-controlled data as untrusted at a receiving boundary.
- **SEC-TRUST-002** — MUST identify which component owns authentication, authorization, and validation for each protected crossing.
- **SEC-TRUST-003** — MUST NOT grant access solely because a request uses an internal hostname, container network, or claimed actor header.

## Validation

Exercise an unexpected caller and a forged identity claim. Verify rejection occurs before protected data or mutations.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [threat-model](threat-model.md)
- [service-identity-pattern](../authorization/service-identity-pattern.md)
