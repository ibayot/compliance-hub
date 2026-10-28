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
Use appropriate database constraints as well as domain checks. Do not expose ORM entities wholesale as a public API contract. Choose timestamp and timezone semantics explicitly. Resolve representation, supported integrity capabilities and operational assumptions through [engine-neutral safeguards](engine-safeguards-pattern.md), then the profile-selected engine; a JSON/document field or ORM declaration does not replace an enforced invariant.

## Rules
DATA-MODEL-002 MUST preserve referential and uniqueness integrity for authoritative writes.
DATA-MODEL-003 MUST specify date-only versus instant values and avoid silent timezone conversion.
DATA-MODEL-004 MUST define soft-deletion visibility, restoration, and retention where used.
DATA-MODEL-005 MUST keep sensitive fields out of unapproved projections.
DATA-MODEL-006 MUST define relevant numeric precision/units, null/missing/empty distinctions and comparison/collation semantics in the actual storage and API contract, including any deliberate normalization or unsupported capability.

## Validation
Concurrent duplicates, null/empty boundary, missing relations, delete/recover, date transitions, and affected reports.
