---
id: SEC-CRYPTO
status: baseline
scope: security
owner: application-maintainer
triggers: ["encryption", "TLS", "key rotation"]
---

# Encryption and key lifecycle pattern

## Guidelines

Select transport and at-rest protections from the data classification and threat model. Use maintained cryptographic facilities.

## Why

Cryptography requires correct key custody, randomness, lifecycle, and recovery in addition to an algorithm.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
plaintext → approved authenticated encryption/key service → {ciphertext, nonce, key_version}; secrets stored separately
```

## Implementation

Document key access, versioning, rotation, backup, loss response, and restore compatibility. Verify TLS peer identity; handle local development through bounded configuration rather than weakening production verification.

## Rules

- **SEC-CRYPTO-001** — MUST use approved libraries and authenticated encryption where application-level encryption is required.
- **SEC-CRYPTO-002** — MUST protect keys separately from encrypted content and document rotation/recovery ownership.
- **SEC-CRYPTO-003** — MUST NOT disable production certificate verification or replace authorization with encryption or obscure identifiers.

## Validation

Test tamper rejection, missing/wrong key behavior, rotation compatibility, and restore of representative old data in isolation.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [secrets-pattern](../secrets-pattern.md)
- [data-classification](../foundations/data-classification.md)

Reference: [OWASP Cryptographic Storage](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html).
