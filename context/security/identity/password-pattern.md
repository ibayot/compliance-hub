---
id: SEC-PASSWORD
status: baseline
scope: security
owner: application-maintainer
triggers: ["password storage", "password change", "credential migration"]
---

# Password handling pattern

## Guidelines

Prefer the approved identity provider or maintained password-hashing library. Choose parameters against current primary guidance and measured server capacity.

## Why

One-way adaptive hashing limits the impact of a credential-store disclosure.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
password → library verification/hash → stored encoded hash + algorithm parameters; no recoverable password
```

## Implementation

Record the selected algorithm, parameters, maximum supported input, and rehash-on-login plan in application configuration documentation. Keep migration compatible with existing hashes until users are migrated.

## Rules

- **SEC-PASSWORD-001** — MUST store passwords with an approved adaptive one-way hash and library-managed salt.
- **SEC-PASSWORD-002** — MUST NOT store plaintext, reversibly encrypted passwords, or password values in logs and fixtures.
- **SEC-PASSWORD-003** — MUST document hashing parameters and an upgrade path; password policy changes require compatible validation and user feedback.

## Validation

Verify correct/incorrect passwords, long and Unicode input handling, legacy-hash migration, and absence of plaintext from database/log output.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [authentication-pattern](authentication-pattern.md)
- [recovery-pattern](recovery-pattern.md)

Reference: [OWASP Password Storage](https://cheatsheetseries.owasp.org/cheatsheets/Password_Storage_Cheat_Sheet.html).
