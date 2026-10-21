---
id: CORE-API-AND-INTEGRATIONS-API-CLIENT
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# Shared API Client

## Guidelines
API-CLIENT-001 MUST route authenticated requests through the application-approved client.

## Why
Duplicated token handling, base URLs, interceptors, and error logic diverge across pages.

## Structure
~~~text
component/query -> typed domain API function
                -> shared client -> auth/transport
                -> typed result or safe failure
~~~

## Store Implementation
The auth/session owner manages credentials. Server-state cache owns fetched records. Domain API modules define contracts; components own view state. Do not introduce a second token store or refresh loop.

## Rules
API-CLIENT-002 MUST avoid logging tokens and private payloads.
API-CLIENT-003 MUST bound refresh/retry to prevent infinite loops or duplicate mutations.
API-CLIENT-004 MUST distinguish cancellation, validation failure, denial, and service outage.
API-CLIENT-005 MUST revoke/clear relevant state at logout and account/scope change.

## Validation
Simultaneous expired requests, refresh failure, cancellation, offline, unauthorized, and application-specific native URL behavior.
