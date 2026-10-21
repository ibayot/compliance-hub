---
id: CORE-ARCHITECTURE-DEPENDENCY
status: baseline
scope: architecture
owner: application-maintainers
---

# Dependency Direction

## Guidelines
ARCH-DEP-001 SHOULD make dependencies point toward stable contracts and domain rules rather than page-specific or transport-specific code.

## Why
Circular dependencies and shared catch-all modules make changes difficult to isolate.

## Structure
~~~text
presentation/transport -> application/domain -> owned persistence adapter
shared contract <- multiple bounded consumers
~~~

## Implementation
Define public module interfaces; keep internal helpers private. Shared code must have explicit consumers and a stable purpose. Do not promote an application-specific business rule into a universal utility.

## Rules
ARCH-DEP-002 MUST document newly introduced cycles or cross-module dependency changes.
ARCH-DEP-003 MUST not mix runtime secrets/server modules into client bundles.
ARCH-DEP-004 SHOULD keep generated artifacts owned by their generator.

## Validation
Inspect import graph, build boundaries, bundle/server separation, and affected consumers.
