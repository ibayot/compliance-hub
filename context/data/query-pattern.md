---
id: CORE-DATA-QUERY
status: baseline
scope: data
owner: application-maintainers
---

# Query Pattern

## Guidelines
DATA-QUERY-001 MUST parameterize untrusted values and allowlist dynamic identifiers/order clauses.

## Why
Values and SQL structure require different safeguards. Unbounded queries also create reliability failures.

## Structure
~~~text
validated filter -> authorized base scope -> bounded query
                -> stable order + pagination -> explicit projection
~~~

## Implementation
Apply resource/unit scope before pagination and counts. Use stable tie-breakers. Check query plans and indexes for changed access patterns; adding an index has write/storage cost.

## Rules
DATA-QUERY-002 MUST use equivalent access/filter predicates for rows and totals.
DATA-QUERY-003 MUST bound page size and exports or define an authorized streaming job.
DATA-QUERY-004 MUST avoid per-row queries when a bounded join/batch projection is appropriate.
DATA-QUERY-005 MUST not reveal restricted records through counts, suggestions, or error timing by design.

## Validation
Injection payloads, unauthorized scope, empty result, duplicate sort values, deep pages, and representative query plans.
