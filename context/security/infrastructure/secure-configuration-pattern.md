---
id: SEC-CONFIG
status: baseline
scope: security
owner: application-maintainer
triggers: ["environment variable", "debug setting", "production config"]
---

# Secure configuration pattern

## Guidelines

Declare required variables, allowed values, sensitivity, defaults, and environment scope without embedding operational secrets.

## Why

Silent insecure defaults can change security behavior during deployment or partial configuration.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
configuration schema → typed parse → required-value validation → safe effective settings → startup or explicit degraded mode
```

## Implementation

Separate local and production settings. Define trusted proxy handling, origins, public URLs, internal endpoints, debug output, and secret references. Reject placeholder credentials in environments where real credentials are required.

## Rules

- **SEC-CONFIG-001** — MUST validate security-sensitive configuration before accepting protected traffic.
- **SEC-CONFIG-002** — MUST NOT default production authentication, signature verification, or authorization to disabled when configuration is missing.
- **SEC-CONFIG-003** — MUST keep debug diagnostics and example credentials confined to explicitly declared development workflows.

## Validation

Test missing, malformed, contradictory, and placeholder settings with synthetic values; inspect startup failure messages for secret disclosure.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [secrets-management-pattern](secrets-management-pattern.md)
- [csrf-cors-pattern](../input-output/csrf-cors-pattern.md)
