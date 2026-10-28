---
id: CORE-DATA-TRANSACTION
status: baseline
scope: data
owner: application-maintainers
---

# Transaction Pattern

## Guidelines
DATA-TXN-001 MUST define the invariant, transaction owner, isolation/concurrency needs, and rollback behavior.

## Why
Multiple individually correct writes can leave an invalid workflow if only some commit.

## Structure
~~~text
begin -> read/lock or version-check -> assert invariant
      -> related writes -> audit/intent -> commit
after commit -> external side effect/reconciliation
~~~

## Implementation
Keep a transaction on its manager/connection. Do not assume filesystem, email, HTTP, or queue operations roll back with SQL. Use explicit compensation or durable intent when required. Resolve engine isolation, conflict signals, finite resource/wait budgets and session cleanup through [engine safeguards](engine-safeguards-pattern.md).

For a declared retryable conflict, retry the entire logical transaction after the engine's required rollback/recovery rather than replaying only the failed statement. Bound attempts and elapsed time; do not repeat remote effects merely because local writes can be retried. A lost connection during commit may leave the outcome unknown: use stable operation identity and authoritative reconciliation before replay, not a false rollback report or assumed zero effects.

## Rules
DATA-TXN-002 MUST preserve atomicity for related authoritative mutations.
DATA-TXN-003 MUST handle declared retryable conflicts with bounded whole-transaction retries only when replay is safe, using the selected engine's required rollback/recovery boundary.
DATA-TXN-004 MUST not hold database locks while waiting on avoidable remote/user interaction.
DATA-TXN-005 MUST distinguish confirmed rollback from unknown completion/commit after ambiguous timeout, define caller-visible uncertainty and reconcile before replaying non-idempotent effects.

## Validation
Failure at each write, parallel updates, deadlock/conflict, duplicate replay, commit followed by side-effect failure.
