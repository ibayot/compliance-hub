---
id: SEC-PRINCIPLES
status: baseline
scope: security
owner: application-maintainer
triggers: ["security review", "new boundary", "sensitive data"]
---

# Security principles

## Guidelines

Apply these baselines to relevant new or changed behavior. Existing application compliance requires evidence; a documented baseline is not an audit result.

## Why

A common security floor makes architecture, UI, service, and deployment decisions predictable.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
asset → authenticated actor → authorized operation → bounded input → protected storage → safe output → auditable result
```

## Implementation

Use the active application profile to select actual identity, permission, storage, transport, and operational mechanisms. Record unknown controls as assessment work.

## Rules

- **SEC-PRINCIPLES-001** — MUST default protected operations to denied until an explicit policy permits the actor, action, and resource.
- **SEC-PRINCIPLES-002** — MUST enforce controls at the trusted boundary; interface restrictions are a usability layer.
- **SEC-PRINCIPLES-003** — MUST minimize privileges and collected data; exceptional trust requires a documented reason and validation.

## Validation

Trace one protected operation through every boundary. Identify where each decision is made, its failure behavior, and its corresponding test.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [authorization-pattern](../authorization-pattern.md)
- [threat-model](threat-model.md)
- [data-classification](data-classification.md)

Reference: [OWASP Authorization](https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html).
