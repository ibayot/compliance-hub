---
id: SEC-REVIEW
status: baseline
scope: security
owner: application-maintainer
triggers: ["security review", "new trust boundary", "sensitive workflow change"]
---

# Scoped security review pattern

## Guidelines

Review the changed attack surface and applicable controls. Context-only changes require document validation, not production security testing.

## Why

A scoped evidence trail allows later reviews to reuse findings without claiming unrelated systems were tested.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
request → changed surfaces → applicable SEC rule IDs → evidence/test → finding/disposition → owner → residual scope
```

## Implementation

Cover authentication, authority, input/output, sensitive data, files, secrets, dependencies, and operations only when relevant. Label verified observations, assumptions, and recommendations. Keep sensitive findings in approved private tracking.

## Rules

- **SEC-REVIEW-001** — MUST record review scope, applicable controls, validation evidence, and untested boundaries.
- **SEC-REVIEW-002** — MUST distinguish a documented baseline from verified implementation compliance.
- **SEC-REVIEW-003** — MUST NOT run intrusive scans, load tests, real-account abuse, or destructive production checks without explicit scope and authority.

## Validation

A reviewer should reproduce the conclusions using the recorded paths and safe commands. A clean automated scan alone is insufficient evidence of authorization correctness.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [authorization-test-matrix](authorization-test-matrix.md)
- [negative-release-pattern](negative-release-pattern.md)
- [threat-model](../foundations/threat-model.md)
