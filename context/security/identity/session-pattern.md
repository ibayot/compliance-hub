---
id: SEC-SESSION
status: baseline
scope: security
owner: application-maintainer
triggers: ["logout", "session expiration", "auth state"]
---

# Session lifecycle and state pattern

## Guidelines

Define creation, renewal, inactivity, absolute expiry, privilege changes, termination, and multi-device behavior.

## Why

Clearing a browser screen is insufficient if a previously issued credential remains effective beyond the declared policy.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
anonymous → authenticated → renewed/reauthenticated → expired/revoked
client state: {status, actorSummary}; server/session mechanism: {subject, expiry, revocationPolicy}
```

## Store Implementation

Keep session truth with the selected server or token mechanism. Use secure platform storage appropriate to the profile; choose browser cookie versus bearer transport explicitly. On logout, clear user-scoped caches and enforce the documented termination behavior.

## Rules

- **SEC-SESSION-001** — MUST define expiry, renewal, revocation, and logout semantics for the selected session model.
- **SEC-SESSION-002** — MUST protect session credentials in transit and avoid URL/query-string transport.
- **SEC-SESSION-003** — MUST configure browser cookies with appropriate Secure, HttpOnly, SameSite, scope, and CSRF protections when cookies carry authentication.

## Validation

Test expired sessions, logout followed by credential reuse, permission change, and switching users with cached data. Record any intentionally bounded token-revocation delay.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [token-pattern](token-pattern.md)
- [csrf-cors-pattern](../input-output/csrf-cors-pattern.md)

Reference: [OWASP Session Management](https://cheatsheetseries.owasp.org/cheatsheets/Session_Management_Cheat_Sheet.html).
