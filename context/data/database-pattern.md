---
id: CORE-DATA-DATABASE
status: baseline
scope: data
owner: application-maintainers
---

# Data Model and Ownership

## Guidelines
DATA-MODEL-001 MUST identify data owner, identifier, required fields, uniqueness, relationships, deletion, and audit needs.

## Why
UI validation alone cannot preserve integrity under concurrent writes or alternate clients.

## Structure
~~~text
owned entity -> primary identity
             -> constraints + allowed relationships
             -> creation/update/deletion provenance
             -> explicit response projection
~~~

## Implementation
Use appropriate database constraints as well as domain checks. Do not expose ORM entities wholesale as a public API contract. Choose timestamp and timezone semantics explicitly.

## Rules
DATA-MODEL-002 MUST preserve referential and uniqueness integrity for authoritative writes.
DATA-MODEL-003 MUST specify date-only versus instant values and avoid silent timezone conversion.
DATA-MODEL-004 MUST define soft-deletion visibility, restoration, and retention where used.
DATA-MODEL-005 MUST keep sensitive fields out of unapproved projections.

## Validation
Concurrent duplicates, null/empty boundary, missing relations, delete/recover, date transitions, and affected reports.
