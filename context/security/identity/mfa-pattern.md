---
id: SEC-MFA
status: baseline
scope: security
owner: application-maintainer
triggers: ["MFA", "passkey", "authenticator reset"]
---

# Multifactor and authenticator change pattern

## Guidelines

Activate only when the profile includes MFA or related authenticator workflows. Specify enrollment, challenge, recovery, replacement, and factor strength.

## Why

Factor replacement can undermine a strong login if it has a weaker identity check.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
unenrolled → enrollment_pending → verified → active → challenge → success/failure; replacement → identity verification → old-factor revocation
```

## Implementation

Document allowed authenticators and fallback channels. Treat recovery codes as credentials. Require current identity verification and protected notification for factor changes according to risk.

## Rules

- **SEC-MFA-001** — MUST require proof of successful enrollment before marking a new factor active.
- **SEC-MFA-002** — MUST apply explicit verification and audit requirements to factor removal, replacement, and recovery.
- **SEC-MFA-003** — MUST NOT silently downgrade a required factor through an alternate login, API, or recovery route.

- **SEC-MFA-004** — Verification and resend MUST enforce server-side challenge expiry and attempt limits under concurrent requests. A resend must honor cooldown, invalidate any replaced code and preserve the applicable failure budget. Use the authoritative lock or expiry outcome to guide the user back to an eligible sign-in or authorized recovery flow.

## Validation

Test unverified enrollment, replayed challenge, wrong factor, replacement, recovery-code reuse, and all alternate login paths. Exercise repeated clicks, concurrent verification and resend, old codes after resend, lock expiry, and authorized unlock. Verify policy combinations for each configured delivery mode and confirm an unavailable required factor does not silently sign the user in.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [authentication-pattern](authentication-pattern.md)
- [recovery-pattern](recovery-pattern.md)

Reference: [OWASP Multifactor Authentication](https://cheatsheetseries.owasp.org/cheatsheets/Multifactor_Authentication_Cheat_Sheet.html).
