---
id: SEC-TOKEN
status: baseline
scope: security
owner: application-maintainer
triggers: ["JWT", "bearer token", "refresh token"]
---

# Token verification and storage pattern

## Guidelines

Select token format, issuer, intended audience, transport, lifetime, renewal, and compromise response explicitly.

## Why

Decoding a credential does not establish trust; signing also does not conceal its payload.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
received token → fixed verifier policy → signature/integrity → issuer/audience/time → token purpose → account/session policy
```

## Implementation

Use a maintained verifier. Constrain accepted algorithms and trusted keys in server configuration; enforce required claims from the chosen token profile. Store long-lived credentials only in the profile-approved facility.

## Rules

- **SEC-TOKEN-001** — MUST verify token integrity, intended recipient, validity window, issuer, and purpose before trusting claims.
- **SEC-TOKEN-002** — MUST NOT treat a decoded payload or caller-selected verification algorithm as trusted authority.
- **SEC-TOKEN-003** — MUST exclude bearer and refresh credentials from URLs, logs, examples, and client-visible diagnostics.

## Validation

Reject altered signatures, wrong audience/issuer, expired tokens, unexpected algorithms, and a refresh token used as an access token.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [session-pattern](session-pattern.md)
- [secrets-pattern](../secrets-pattern.md)

Reference: [OWASP REST Security: JWT](https://cheatsheetseries.owasp.org/cheatsheets/REST_Security_Cheat_Sheet.html).
