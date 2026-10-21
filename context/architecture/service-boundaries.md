# Service and Data Boundaries

## Guidelines
ARCH-SVC-001 MUST identify the sole writer for each entity and use explicit contracts across boundaries.

## Why
A shared database engine does not make every table safe for every service to mutate.

## Structure
~~~text
service A -> authenticated contract -> owner B -> owned data
service A <- permitted projection or bounded response <- B
~~~

## Implementation
Document existing compatibility reads separately. Do not silently convert a legacy view into write ownership. Keep ownership information in the application's system map.

## Rules
ARCH-SVC-002 MUST NOT introduce cross-owner writes or transactions without an approved design and recovery model.
ARCH-SVC-003 MUST bound timeouts and distinguish unavailable enrichment from authoritative denial.
ARCH-SVC-004 MUST preserve identity/scope across internal requests.
ARCH-SVC-005 SHOULD prevent N+1 cross-service calls through bounded batch contracts or appropriate caching.

## Validation
Simulate downstream failure, stale cache, partial response, invalid service identity, and unauthorized scope. Check query plans/request counts when enrichment changes.
