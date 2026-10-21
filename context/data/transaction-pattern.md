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
Keep a transaction on its manager/connection. Do not assume filesystem, email, HTTP, or queue operations roll back with SQL. Use explicit compensation or durable intent when required.

## Rules
DATA-TXN-002 MUST preserve atomicity for related authoritative mutations.
DATA-TXN-003 MUST handle conflicts and retry only when replay is safe.
DATA-TXN-004 MUST not hold database locks while waiting on avoidable remote/user interaction.
DATA-TXN-005 MUST define what a caller sees after ambiguous timeout.

## Validation
Failure at each write, parallel updates, deadlock/conflict, duplicate replay, commit followed by side-effect failure.
