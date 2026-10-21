---
id: CORE-DELIVERY-RELEASE
status: baseline
scope: delivery
owner: application-maintainers
---

# Release Pattern

## Guidelines
DELIVERY-RELEASE-001 MUST define release scope, version/artifacts, acceptance evidence, environment prerequisites, migration, and rollback.

## Why
A release includes the behavior, data changes, operational instructions, and user-facing communication needed to use it.

## Structure
~~~text
scoped change -> validated artifact -> migration/config artifacts
              -> curated release notes -> deployment/rollback instructions
~~~

## Implementation
Use the active application's release policy. Context-only documentation does not create an application release. Do not invent an in-app changelog mechanism for another application.

## Rules
DELIVERY-RELEASE-002 MUST distinguish visible functionality from internal maintenance in user notes.
DELIVERY-RELEASE-003 MUST report tests actually run and unresolved risks.
DELIVERY-RELEASE-004 MUST not deploy, publish, or merge merely because release documentation is prepared.

## Validation
Acceptance evidence, artifact/version alignment, upgrade compatibility, note audience, and recovery path.
