---
id: PLAT-WORKER-JOB
status: baseline
scope: "Worker Platform; applicable only when enabled by the application profile"
triggers:
  - "background job"
  - "queue retry"
  - "scheduled task"
---

# Worker Job Ownership

## Guidelines

Make delivery assumptions, durable state, and operator visibility explicit for every job.

## Why

Workers can run twice, restart halfway, or fail after an external side effect succeeded.

## Structure

```text
Pseudocode:
durable job -> validate minimal payload -> reload authorized context
-> idempotency/lease -> bounded work -> committed result
failure -> retry category -> capped attempts -> actionable failed state
```

## Implementation

Use the installed queue library's real contract; this generic baseline does not select a queue library or prescribe a new outbox. Define concurrency limits, lease/lock duration, graceful shutdown, and replay authorization. User-context jobs require a deliberate policy for permission changes after enqueue.

## Rules

- `PLAT-WORKER-JOB-001` MUST make side effects safe under the queue's documented delivery/retry behavior.
- `PLAT-WORKER-JOB-002` MUST expose terminal failure and provide an authorized replay/recovery path.
- `PLAT-WORKER-JOB-003` MUST define ownership, limits, and shutdown behavior for newly added workers.

## Validation

Test duplicate delivery, crash after side effect, dependency outage, expired permissions, exhausted retries, and shutdown during work.

## Exceptions

Apply only to the profile-enabled target and changed workflow. Record a bounded exception with rationale, affected platforms, and validation; a platform-specific need does not silently redefine all applications.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://github.com/OptimalBits/bull/blob/develop/PATTERNS.md)
