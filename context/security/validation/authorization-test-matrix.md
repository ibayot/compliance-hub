---
id: SEC-AUTHZ-TEST
status: baseline
scope: security
owner: application-maintainer
triggers: ["authorization change", "scope change", "protected endpoint"]
---

# Authorization test matrix

## Guidelines

Express expected decisions before testing. Include operation, resource scope, lifecycle state, and entry point.

## Why

One allowed user and one denied user cannot expose horizontal access or alternate-path bypasses.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
case | actor capability | actor scope | resource owner/state | operation/path | expected status/data/mutation | evidence
```

## Implementation

Use synthetic actors: anonymous, insufficient capability, correct capability in wrong scope, authorized scope, revoked/disabled, service caller where relevant. Test list/count/search/detail/mutate/export/attachments and mixed-authority bulk requests when present.

## Rules

- **SEC-AUTHZ-TEST-001** — MUST include both allowed and denied cases for every changed protected operation.
- **SEC-AUTHZ-TEST-002** — MUST include cross-resource or cross-scope attempts when identifiers select protected records.
- **SEC-AUTHZ-TEST-003** — MUST assert absence of unauthorized data and side effects, not only the HTTP status.

## Validation

Run the applicable matrix against isolated fixtures and preserve safe test results. Explain deliberately untested paths and inherited coverage.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [backend-enforcement-pattern](../authorization/backend-enforcement-pattern.md)
- [resource-scope-pattern](../authorization/resource-scope-pattern.md)
