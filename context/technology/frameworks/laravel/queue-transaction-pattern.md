---
id: TECH-LARAVEL-JOB
status: baseline
scope: "Laravel; applicable only when enabled by the application profile"
triggers:
  - "Laravel queue"
  - "transaction"
  - "scheduled command"
---

# Laravel Jobs and Transactions

## Guidelines

Define job payloads, transaction timing, retry behavior, and side-effect ownership together.

## Why

A worker may execute before associated database data commits or repeat a side effect after retry.

## Structure

```text
Pseudocode:
transaction -> persist domain mutation and required durable intent
commit -> dispatch using the application's established mechanism
worker -> reload within intended scope -> idempotency check -> work
failure -> retry classification -> bounded attempts -> operator signal
```

## Implementation

Check the installed framework's dispatch-after-commit behavior and queue configuration. Choose an outbox or another architecture only through an explicit decision when delivery guarantees require it. Do not serialize secrets or unnecessary personal data into job payloads.

## Rules

- `TECH-LARAVEL-JOB-001` MUST define idempotency and retry limits for jobs with side effects.
- `TECH-LARAVEL-JOB-002` MUST ensure queued work cannot rely on uncommitted state.
- `TECH-LARAVEL-JOB-003` MUST document scope, failure visibility, and replay authorization for background work.

## Validation

Test rollback before dispatch, duplicate delivery, partial external success, exhausted retries, and a worker restart.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://laravel.com/docs/queues)
