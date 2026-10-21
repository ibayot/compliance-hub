---
id: SEC-ABUSE
status: baseline
scope: security
owner: application-maintainer
triggers: ["rate limit", "login attempts", "public error", "expensive endpoint"]
---

# Abuse limits and safe error pattern

## Guidelines

Bound expensive and sensitive operations while preserving usable feedback and protected diagnostics.

## Why

An endpoint can exhaust capacity or disclose implementation details without violating its happy-path contract.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
request → actor/source/operation budget → bounded processing → public error(code, safe message, correlation ID)
internal diagnostic → protected redacted event
```

## Implementation

Set limits from actual workload and threat assumptions. Define shared-state behavior across replicas, proxy identity trust, response status, retry guidance, and limiter failure behavior. Avoid locking a victim out through attacker-driven requests.

## Rules

- **SEC-ABUSE-001** — MUST define resource and abuse limits for newly exposed expensive or authentication-sensitive operations.
- **SEC-ABUSE-002** — MUST return stable safe errors without stack traces, database internals, or secrets.
- **SEC-ABUSE-003** — MUST document whether limiter outages fail closed or use a bounded fallback for each sensitive route.

## Validation

Exercise limits in isolation, multiple replicas where applicable, spoofed forwarding headers, and downstream errors. Do not load-test production without scope.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [recovery-pattern](../identity/recovery-pattern.md)
- [security-logging-pattern](../observability/security-logging-pattern.md)

Reference: [OWASP Denial of Service](https://cheatsheetseries.owasp.org/cheatsheets/Denial_of_Service_Cheat_Sheet.html).
