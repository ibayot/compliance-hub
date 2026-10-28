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

For a profile/password-reset workflow that retains an established account identifier, distinguish the unchanged server-owned value from a proposed replacement. If current account policy permits retaining it, a stale/missing entry in a mutable reference list alone must not invalidate the authenticated owner's unchanged identity. Bind any allowance to the authenticated account and the approved format/status policy, not a caller-selected owner or a different person's matching ID. Explicit revocation and disabled-account policy still apply.

Changed identifiers retain authoritative validation and duplicate/ownership safeguards at the backend, including direct API calls. Client checks are feedback, not authority. Distinguish a dependency outage from a genuinely rejected value; do not weaken verification, change someone's credentials or invent directory membership to make a test pass.

## Rules

- **SEC-AUTHN-001** — MUST verify identity and account status through a trusted server-side mechanism.
- **SEC-AUTHN-002** — MUST apply the same required factors and abuse controls to alternate authentication entry points.
- **SEC-AUTHN-003** — MUST NOT log credentials or expose account existence through different public authentication errors.

- **SEC-AUTHN-004** — MUST distinguish an authenticated account's policy-permitted unchanged identifier from a replacement; mutable reference-list absence alone cannot revoke an established value, and any allowance must be bound to trusted ownership and current account policy.
- **SEC-AUTHN-005** — MUST enforce changed-identifier validation and duplicate/ownership restrictions at the trusted boundary; client hints or an unchanged-value allowance cannot authorize another account's identity.

## Validation

Check valid, invalid, disabled, and alternate-path login; verify failure responses and operational diagnostics contain no credentials.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [session-pattern](session-pattern.md)
- [mfa-pattern](mfa-pattern.md)
- [recovery-pattern](recovery-pattern.md)

Reference: [OWASP Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html).
