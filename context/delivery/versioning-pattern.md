---
id: CORE-DELIVERY-VERSIONING
status: baseline
scope: delivery
owner: application-maintainers
---

# Versioning

## Guidelines
DELIVERY-VERSION-001 MUST identify every authoritative version source and how it reaches running clients/services.

## Why
Different manifests, native packages, images, and API responses can report different versions.

## Structure
~~~text
release identity -> manifests/build metadata
                 -> image/native artifact -> runtime display/check
~~~

## Implementation
Follow the application's chosen version policy and compatibility rules. Do not impose a patch bump on documentation-only changes unless its explicit release process requires it.

## Rules
DELIVERY-VERSION-002 MUST update coupled version sources together for a release.
DELIVERY-VERSION-003 MUST keep dependency versions distinct from application version.
DELIVERY-VERSION-004 MUST record breaking behavior and required migrations.

## Validation
Inspect built/runtime metadata and affected native/store/build identifiers without publishing.
