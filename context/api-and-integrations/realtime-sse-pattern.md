---
id: CORE-API-AND-INTEGRATIONS-REALTIME-SSE
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# Server-Sent Events

## Guidelines
API-SSE-001 MUST define audience, authorization, event shape, reconnect behavior, and refresh semantics.

## Why
Long-lived connections outlive ordinary request assumptions and can reveal unauthorized changes.

## Structure
~~~text
authorized subscription -> scoped event
client -> invalidate/refetch affected query
disconnect -> cleanup -> bounded reconnect
~~~

## Store Implementation
Remote data remains authoritative in its owner/cache. Events usually signal refresh; they must not create a competing unsynchronized record store. Track connection status separately.

## Rules
API-SSE-002 MUST clean up connections/listeners on unmount, logout, or scope change.
API-SSE-003 MUST preserve stream behavior across proxy buffering/timeouts and heartbeats.
API-SSE-004 MUST avoid placing sensitive credentials in logged URLs.
API-SSE-005 MUST define missed-event reconciliation after reconnect.
API-SSE-006 MUST bound connection-ticket setup and detect a stalled stream using the agreed heartbeat contract. Reconnect with fresh credentials/tickets, clean up watchdogs and superseded attempts, reconcile after opening, and prevent reconnection after sign-out or scope loss. Browser cookie renewal must not be mistaken for logout merely because no in-memory access token is returned.

## Validation
Unauthorized audience, reconnect, token expiry, duplicate event, proxy path, inactive tab, and logout.
