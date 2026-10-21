---
id: CORE-ARCHITECTURE-BACKGROUND-PROCESSING
status: baseline
scope: architecture
owner: application-maintainers
---

# Background Processing and Events

## Guidelines
ARCH-JOB-001 MUST define delivery, retry, idempotency, ordering, and recovery semantics for each job or event.

## Why
Retries are normal; duplicate effects and invisible failures are not acceptable defaults.

## Structure
~~~text
commit domain change -> durable intent/queue -> worker
worker -> deduplicate/claim -> process -> persist result
failure -> bounded retry -> visible terminal failure/recovery
~~~

## Implementation
Record payload version, actor/scope, correlation, retry count, and ownership. If queue publication can fail after commit, state the reconciliation approach; do not claim exactly-once behavior from a queue.

## Rules
ARCH-JOB-002 MUST make repeated delivery safe for material effects.
ARCH-JOB-003 MUST keep user input and secrets out of unnecessary payload/log fields.
ARCH-JOB-004 MUST define cancellation, poison-job handling, and graceful shutdown where applicable.
ARCH-JOB-005 MUST NOT mark a business operation successful merely because it was enqueued.

## Validation
Duplicate delivery, crash between effect/acknowledgment, exhausted retry, schema evolution, and restart recovery.
