---
id: CORE-API-AND-INTEGRATIONS-ERROR-RESPONSE
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# API Error Response

## Guidelines
API-ERROR-001 MUST expose a stable safe failure classification with a usable user action when available.

## Why
A network outage must not appear as an empty list or authorization denial.

## Structure
~~~text
status + stable error code + safe message
+ field errors/retry hint when appropriate
+ correlation identifier for support
~~~

## Implementation
Map internal exceptions at the boundary. Preserve full diagnostics only in protected logs with redaction. Match the existing contract before adding fields.

## Rules
API-ERROR-002 MUST not expose SQL, stack traces, secrets, or internal storage paths.
API-ERROR-003 MUST preserve validation, conflict, denial, not-found, and unavailability classifications internally; expose distinct public errors only when the application's disclosure policy permits it. A uniform public denial/not-found response is valid when it protects record existence.
API-ERROR-004 SHOULD preserve enough correlation for support without leaking sensitive context.

## Validation
Malformed input, resource scope, conflict, timeout, unexpected exception, and client rendering/retry.
