---
id: CORE-QUALITY-TESTING
status: baseline
scope: quality
owner: application-maintainers
---

# Testing Pattern

## Guidelines
QA-TEST-001 MUST test the behavior and invariant that could fail, rather than mirror implementation details.

## Why
Focused tests provide evidence with less maintenance and execution cost than a broad suite disconnected from the request.

## Structure
~~~text
acceptance criterion -> failure risk -> smallest useful check
                    -> controlled fixture -> assertion -> evidence
~~~

## Implementation
Use unit tests for pure rules, integration tests for persistence/contracts, and E2E for critical user flows. Add visual/accessibility checks for appropriate UI changes. Isolate data, clocks, actors, external dependencies, and cleanup.

## Rules
QA-TEST-002 MUST cover negative and recovery paths when changed behavior depends on them.
QA-TEST-003 MUST not claim skipped, unrun, flaky, or environment-blocked tests passed.
QA-TEST-004 SHOULD keep fixtures representative without real personal data/secrets.
QA-TEST-005 MUST not perform destructive cleanup against an unverified environment.

## Validation
Run targeted checks first. Broaden only for affected dependencies, new failures, or unresolved risk. Preserve useful failure artifacts with safe data and record limitations.
