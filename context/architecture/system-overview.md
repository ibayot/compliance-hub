# System Overview Pattern

## Guidelines
ARCH-SYSTEM-001 MUST describe entrypoints, modules/services, data owners, integrations, trust boundaries, deployment units, and failure boundaries before a material architecture change.

## Why
A directory tree alone does not explain runtime ownership or the consequences of changing a boundary.

## Structure
~~~text
client -> entrypoint -> module/service -> owned persistence
                         -> explicit external contract
                         -> job/event boundary
~~~

## Implementation
Keep the application map in its profile overlay. Describe actual dependencies separately from proposed changes. A modular monolith, service architecture, and native client are valid alternatives when their tradeoffs match requirements.

## Rules
ARCH-SYSTEM-002 MUST record material new boundaries or dependency changes in a decision record.
ARCH-SYSTEM-003 MUST assess security, reliability, observability, migration, and rollback consequences.
ARCH-SYSTEM-004 MUST avoid forcing a new architecture through a component consistency edit.

## Validation
Trace a representative read, mutation, async operation, and failure through the map. Verify entrypoints against source and deployments.
