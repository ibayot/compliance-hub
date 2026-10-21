---
id: SEC-RELEASE
status: baseline
scope: security
owner: application-maintainer
triggers: ["release", "security-sensitive change", "API negative tests"]
---

# Negative API checks and release security evidence

## Guidelines

Select checks from the changed surface and application risk profile. Do not turn every documentation edit into an application release.

## Why

A focused security evidence set is more useful than an unqualified 'security passed' statement.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
changed surface → expected rejection/failure → isolated check → result → unresolved risk/exception → release disposition
```

## Implementation

Use applicable cases: absent/wrong identity, foreign resource, unknown fields, oversized input, unsupported method/type, expired token, safe error, and secret-free output. Add targeted dependency/configuration evidence when those surfaces changed.

## Rules

- **SEC-RELEASE-001** — MUST retain applicable security-negative results alongside release validation evidence for security-sensitive changes.
- **SEC-RELEASE-002** — MUST identify unresolved material findings and their explicit release disposition.
- **SEC-RELEASE-003** — MUST NOT claim full application security or legal compliance from a partial checklist or scan.

## Validation

Verify the evidence states version/scope, environment, commands or test references, outcomes, and remaining limitations without including credentials.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [security-review-pattern](security-review-pattern.md)
- [authorization-test-matrix](authorization-test-matrix.md)
- [upload-security-tests](upload-security-tests.md)
