---
id: SEC-CSRF-CORS
status: baseline
scope: security
owner: application-maintainer
triggers: ["cookie authentication", "CORS", "cross-origin", "CSRF"]
---

# CSRF and cross-origin request pattern

## Guidelines

Assess CSRF from actual credential transport. Declare trusted origins separately from the identity and authorization policy.

## Why

CORS governs browser response access; it does not authorize callers or reliably prevent forged state changes.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
state-changing browser request → credential model → CSRF/origin validation → authentication → authorization
cross-origin response → explicit allowed origin/method/header/credential policy
```

## Implementation

Use the framework's supported CSRF defense when ambient cookies authenticate mutations. Configure SameSite deliberately as an additional layer. For bearer-only flows, document why credentials are not ambient and reassess if cookies are introduced.

## Rules

- **SEC-CSRF-CORS-001** — MUST implement the approved CSRF defense for state-changing requests authenticated by ambient browser credentials.
- **SEC-CSRF-CORS-002** — MUST configure credentialed CORS with explicit trusted origins and required methods/headers.
- **SEC-CSRF-CORS-003** — MUST NOT mutate application state through safe HTTP methods or treat CORS as authentication.

## Validation

Test trusted/untrusted/missing origins, preflights, forged mutation requests, and legitimate cross-site sign-in/navigation flows.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [session-pattern](../identity/session-pattern.md)
- [backend-enforcement-pattern](../authorization/backend-enforcement-pattern.md)

Reference: [OWASP Cross-Site Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Cross-Site_Request_Forgery_Prevention_Cheat_Sheet.html).
