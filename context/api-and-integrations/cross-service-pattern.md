---
id: CORE-API-AND-INTEGRATIONS-CROSS-SERVICE
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# Cross-Service Contract

## Guidelines
API-SVC-001 MUST use explicit identity, contract, timeout, and failure handling across service boundaries.

## Why
Internal network placement does not establish trust or make a dependency reliable.

## Structure
~~~text
owner A -> service client -> authenticated bounded request -> owner B
        <- projected result / classified failure
~~~

## Implementation
Propagate correlation and required user/resource context through the approved protocol. Specify whether enrichment is optional; access checks must not fail open because an authorization dependency is unavailable.

## Rules
API-SVC-002 MUST avoid sending unnecessary personal data or credentials.
API-SVC-003 MUST define batch limits and cache invalidation for projections.
API-SVC-004 MUST preserve the owning service as authoritative writer.
API-SVC-005 MUST validate response contracts at untrusted integration boundaries.

## Validation
Wrong token/origin, unavailable service, malformed response, stale scope, timeout, and request amplification.
