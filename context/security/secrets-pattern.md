---
id: SEC-SECRET-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["credential", "API key", "signing key", "secret"]
---

# Secrets context router

## Guidelines

Use documented secret references and synthetic placeholders throughout context and examples.

## Why

Context may be loaded into AI sessions, copied to other applications, or committed to source control.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
reference name + purpose + owner + consumer + delivery + rotation; value = absent from context
```

## Implementation

Read secret lifecycle guidance for provisioning and rotation, configuration guidance for startup validation, token guidance for verifier usage, and incident guidance for suspected exposure.

## Rules

- **SEC-SECRET-ROUTE-001** — MUST keep context documents and their examples free of actual secret values and recoverable production credentials.
- **SEC-SECRET-ROUTE-002** — MUST route an actual or suspected exposure to the approved response process without reproducing the value in findings.

## Validation

Inspect examples and diffs for accidental values with a secret-aware review that avoids echoing matched credentials.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [secrets-management-pattern](infrastructure/secrets-management-pattern.md)
- [secure-configuration-pattern](infrastructure/secure-configuration-pattern.md)
- [token-pattern](identity/token-pattern.md)
- [incident-response-pattern](observability/incident-response-pattern.md)
