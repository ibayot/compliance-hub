---
id: SEC-CONTAINER-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["Docker", "Compose", "image", "container"]
---

# Container security context router

## Guidelines

Activate only when containers are in the application profile. Apply container configuration and security context to the same effective workload.

## Why

Image construction and runtime deployment each contribute privileges, secret exposure, network reach, and host access.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
source/build → image/dependencies → runtime identity → mounts/capabilities → network → secrets → limits/health → operations
```

## Implementation

Load the relevant container build/runtime patterns from the application's container pack, plus this security subtree. Treat a configuration review as documentation evidence until runtime behavior is actually tested.

## Rules

- **SEC-CONTAINER-ROUTE-001** — MUST assess build-time and runtime authority when changing container security settings.
- **SEC-CONTAINER-ROUTE-002** — MUST distinguish development-only privileges and exposed services from production deployment requirements.

## Validation

Review effective configuration with secret values suppressed. Select isolated checks for relevant image identity, mounts, networking, and process privileges.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [container-hardening-pattern](infrastructure/container-hardening-pattern.md)
- [dependency-security-pattern](infrastructure/dependency-security-pattern.md)
- [secrets-management-pattern](infrastructure/secrets-management-pattern.md)
- [secure-configuration-pattern](infrastructure/secure-configuration-pattern.md)
- [PROFILE](../application/PROFILE.md)
