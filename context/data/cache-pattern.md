---
id: CORE-DATA-CACHE
status: baseline
scope: data
owner: application-maintainers
---

# Cache Pattern

## Guidelines
DATA-CACHE-001 MUST state cache owner, key scope, freshness, invalidation, expiry, and behavior when unavailable.

## Why
A cache can return stale or cross-user data if its key omits relevant scope.

## Structure
~~~text
request scope + normalized parameters -> cache key
miss -> authoritative load -> scoped value + expiry
mutation -> invalidate/update relevant keys
~~~

## Implementation
Distinguish a performance cache from authoritative state, locks, sessions, and durable queues. They have different loss/recovery requirements.

## Rules
DATA-CACHE-002 MUST include tenant/unit/actor or permission context when it affects a response.
DATA-CACHE-003 MUST prevent stale grants from authorizing protected behavior.
DATA-CACHE-004 SHOULD bound memory/cardinality and avoid stampedes.
DATA-CACHE-005 MUST define serialization/version compatibility during deployment.

## Validation
Cross-scope collisions, invalidation after mutation, expired key, cache outage, old format, and concurrent misses.
