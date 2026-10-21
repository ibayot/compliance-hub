---
id: CORE-ARCHITECTURE-BACKEND
status: baseline
scope: architecture
owner: application-maintainers
---

# Backend Architecture

## Guidelines
ARCH-BE-001 SHOULD keep transport validation in the boundary layer, business decisions in domain/service code, and persistence behind the owning module.

## Why
Business rules embedded only in controllers or UI cannot protect alternate callers.

## Structure
~~~text
controller/handler -> validated input + actor
                  -> capability/resource policy
                  -> domain service -> transaction/repository
                  -> response contract + audit/side effects
~~~

## Implementation
Use the active framework's normal dependency injection and module boundaries. A simple operation need not acquire extra repository/service layers if the existing architecture already expresses ownership clearly.

## Rules
ARCH-BE-002 MUST enforce record-specific invariants at the mutation/read boundary.
ARCH-BE-003 MUST define transaction and external-side-effect ordering.
ARCH-BE-004 MUST return safe failure contracts and retain actionable internal diagnostics.
ARCH-BE-005 MUST preserve compatibility for affected consumers or plan migration.

## Validation
Test business logic directly where feasible, endpoint validation/authentication, negative authorization, transaction failures, and dependent clients.
