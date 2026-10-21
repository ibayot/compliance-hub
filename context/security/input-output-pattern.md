---
id: SEC-IO-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["untrusted input", "public output", "browser security"]
---

# Input and output security context router

## Guidelines

Select the pattern for the actual interpreter or trust crossing: parser, database, HTML, browser credential, or outbound network.

## Why

A generic sanitization step cannot replace context-specific protection.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
request/import → input validation
SQL → bound query
HTML/rich text → output/sanitization
ambient cookies/cross-origin → CSRF/CORS
remote fetch → SSRF
expensive operation/public error → limits/error policy
```

## Implementation

Use the active language/framework's supported secure primitives. Add data classification/redaction when fields are sensitive and authorization when data selects protected records.

## Rules

- **SEC-IO-ROUTE-001** — MUST identify every interpreter or security-relevant sink introduced by the changed input/output flow.
- **SEC-IO-ROUTE-002** — MUST select destination-specific controls rather than assume a value becomes universally safe after validation.

## Validation

Trace raw input to its sinks and map each to an applicable pattern and targeted negative case.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [input-validation-pattern](input-output/input-validation-pattern.md)
- [encoding-richtext-pattern](input-output/encoding-richtext-pattern.md)
- [sql-query-pattern](input-output/sql-query-pattern.md)
- [csrf-cors-pattern](input-output/csrf-cors-pattern.md)
- [ssrf-pattern](input-output/ssrf-pattern.md)
- [rate-limit-error-pattern](input-output/rate-limit-error-pattern.md)
- [redaction-pattern](data-protection/redaction-pattern.md)
