---
id: SEC-AUTH-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["authentication", "session", "credential"]
---

# Authentication and session context router

## Guidelines

Load the identity documents required by the changed behavior. Optional features such as MFA are activated through the application profile.

## Why

Login, session state, token validation, and account recovery have different ownership and failure contracts.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
login → identity/authentication-pattern.md
lifecycle/logout → identity/session-pattern.md
token verification/storage → identity/token-pattern.md
password/MFA/recovery → matching identity pattern
```

## Implementation

Start from the profile's actual credential transport and identity provider. Add authorization context when authenticated identity affects access decisions. Proposed changes to identity architecture require the application's normal decision process.

## Rules

- **SEC-AUTH-ROUTE-001** — MUST route identity changes to their specific pattern and check all enabled entry points affected by the change.
- **SEC-AUTH-ROUTE-002** — MUST record a proposed transport/provider change explicitly rather than treating the baseline as authorization to migrate existing authentication.

## Validation

Confirm the selected documents cover the complete changed lifecycle, including failure, renewal/revocation, and user-scoped cache cleanup.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [authentication-pattern](identity/authentication-pattern.md)
- [session-pattern](identity/session-pattern.md)
- [token-pattern](identity/token-pattern.md)
- [password-pattern](identity/password-pattern.md)
- [mfa-pattern](identity/mfa-pattern.md)
- [recovery-pattern](identity/recovery-pattern.md)
- [PROFILE](../application/PROFILE.md)
