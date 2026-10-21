---
id: CORE-API-AND-INTEGRATIONS-RETRY-IDEMPOTENCY
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# Retry and Idempotency

## Guidelines
API-RETRY-001 MUST prove replay safety before retrying a mutation.

## Why
A timeout can occur after a server committed; blind retries can duplicate business effects.

## Structure
~~~text
logical operation identity -> request
transient failure -> bounded backoff/jitter -> replay only if safe
server -> deduplication/constraint -> stable outcome
~~~

## Implementation
Define key scope, expiry, payload conflict behavior, concurrent requests, and stored result. A disabled submit button alone is not server idempotency.

## Rules
API-RETRY-002 MUST bound attempts and total duration.
API-RETRY-003 MUST respect retry hints and avoid retrying permanent validation/authorization failures.
API-RETRY-004 MUST distinguish partial success from complete failure.
API-RETRY-005 MUST not promise exactly-once effects without a complete protocol.

## Validation
Same request twice, concurrent duplicate, changed payload/same key, timeout after commit, downstream partial failure.
