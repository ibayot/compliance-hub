---
id: SEC-SERVICE-ROUTE
status: baseline
scope: security
owner: application-maintainer
triggers: ["internal endpoint", "service credential", "delegated actor"]
---

# Service authentication context router

## Guidelines

Load workload identity, trust boundaries, and secret lifecycle guidance when a service-to-service call changes.

## Why

Transport reachability, service authority, and delegated user authority are separate inputs to the receiver's decision.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
service topology → caller identity → receiver policy → optional delegation → resource authority → safe audit context
```

## Implementation

Document actual callers/recipients and their allowed operations. Keep architecture ownership and request/response contract guidance in their owning application contexts.

## Rules

- **SEC-SERVICE-ROUTE-001** — MUST identify which authority a new internal operation exercises and how the receiver verifies it.
- **SEC-SERVICE-ROUTE-002** — MUST review the receiving service and background/alternate callers when modifying the internal authentication contract.

## Validation

Confirm missing/wrong service credentials, forged delegation, and rotation cases have a scoped negative-check plan.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [service-identity-pattern](authorization/service-identity-pattern.md)
- [trust-boundaries](foundations/trust-boundaries.md)
- [secrets-management-pattern](infrastructure/secrets-management-pattern.md)
- [audit-event-pattern](observability/audit-event-pattern.md)
