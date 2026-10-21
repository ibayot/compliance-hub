---
id: SEC-AUTHN
status: baseline
scope: security
owner: application-maintainer
triggers: ["login", "identity provider", "reauthentication"]
---

# Authentication pattern

## Guidelines

Use the application's selected, maintained authentication mechanism. Separate proof of identity from permission to perform an operation.

## Why

Consistent authentication boundaries prevent alternate login paths from bypassing protections.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
credentials/assertion → verifier → account status → required factors → session → authorization
```

## Implementation

Route web, mobile, API, and recovery entry points through the same account policy. Define reauthentication for sensitive changes in the profile. Give useful generic failure feedback without confirming account existence.

## Rules

- **SEC-AUTHN-001** — MUST verify identity and account status through a trusted server-side mechanism.
- **SEC-AUTHN-002** — MUST apply the same required factors and abuse controls to alternate authentication entry points.
- **SEC-AUTHN-003** — MUST NOT log credentials or expose account existence through different public authentication errors.

## Validation

Check valid, invalid, disabled, and alternate-path login; verify failure responses and operational diagnostics contain no credentials.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [session-pattern](session-pattern.md)
- [mfa-pattern](mfa-pattern.md)
- [recovery-pattern](recovery-pattern.md)

Reference: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
