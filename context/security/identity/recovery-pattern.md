---
id: SEC-RECOVERY
status: baseline
scope: security
owner: application-maintainer
triggers: ["password reset", "account recovery", "recovery link"]
---

# Account recovery pattern

## Guidelines

Design recovery as a credential operation with enumeration resistance, bounded challenges, and account-owner notification.

## Why

A recovery channel has authority to replace the mechanism that normally protects the account.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
request → generic acknowledgement → protected single-use challenge → verify → atomic credential change → invalidate challenge → notify
```

## Implementation

Bind challenges to purpose and account, set a profile-approved expiry, and store a protected verifier. Build recovery URLs from trusted configuration. Define session invalidation and follow-on authentication explicitly.

## Rules

- **SEC-RECOVERY-001** — MUST make recovery challenges unpredictable, purpose-bound, expiring, and single-use.
- **SEC-RECOVERY-002** — MUST avoid public account-enumeration differences and apply request/verification abuse controls.
- **SEC-RECOVERY-003** — MUST change credentials only after challenge verification and consume the challenge atomically with the protected transition.

## Validation

Test expired, reused, wrong-account, simultaneous redemption, forged-host links, and nonexistent-account requests.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [password-pattern](password-pattern.md)
- [mfa-pattern](mfa-pattern.md)
- [rate-limit-error-pattern](../input-output/rate-limit-error-pattern.md)

Reference: [OWASP Forgot Password](https://cheatsheetseries.owasp.org/cheatsheets/Forgot_Password_Cheat_Sheet.html).
