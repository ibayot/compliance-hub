---
id: CTR-INDEX
status: baseline
scope: "Container build, configuration, security, and operations"
triggers:
  - "Dockerfile"
  - "Docker Compose"
  - "container networking, storage, readiness, or image"
---

# Container Context

## Guidelines

Read [the application profile](../application/PROFILE.md), then select only the affected container patterns. Inspect the actual build/deployment file set before judging compliance. This library is a portable operational baseline and does not claim that the repository's current Dockerfiles or Compose configuration already meet every guideline.

## Why

A reliable container contract spans source inputs, image contents, process lifecycle, service configuration, persistent data, network boundaries, and recovery. A successful build covers only part of that contract.

## Structure

- [Docker Builds](docker/INDEX.md)
- [Docker Compose](compose/INDEX.md)
- [Container Operations](operations/INDEX.md)
- [Container Security](security/INDEX.md)

## Implementation

| Change signal | Read |
|---|---|
| Build stage/artifact | [Multi-stage builds](docker/multi-stage-build-pattern.md), [dependency installation](docker/dependency-installation-pattern.md) |
| Base/runtime or registry version | [Base images](docker/base-image-pattern.md), [image identity](docker/image-tagging-pattern.md), [scan findings](security/image-scanning-pattern.md) |
| COPY, build arguments, private package | [Build context](docker/build-context-pattern.md), [build secrets](security/build-secret-pattern.md) |
| Runtime identity, mount permission | [Identity/filesystem](docker/non-root-filesystem-pattern.md), [hardening](security/hardening-pattern.md) |
| Service startup/probe | [Signals](docker/entrypoint-signal-pattern.md), [health checks](docker/healthcheck-pattern.md), [readiness](compose/startup-readiness-pattern.md) |
| Compose override/environment | [Service configuration](compose/service-configuration-pattern.md), [secrets](compose/secret-environment-pattern.md) |
| Ports/network boundaries | [Networking](compose/network-pattern.md), [hardening](security/hardening-pattern.md) |
| Data directory/bootstrap/upgrade | [Volumes/initialization](compose/volume-initialization-pattern.md), [recovery](operations/backup-rollback-pattern.md) |
| Capacity or diagnostics | [Resource limits](operations/resource-limit-pattern.md), [logging](operations/logging-pattern.md) |

## Rules

- `CTR-ROUTE-001` MUST inspect the exact target-environment configuration and supported engine/Compose versions.
- `CTR-ROUTE-002` MUST assess persistent-data and trust-boundary impact before runtime changes.
- `CTR-ROUTE-003` MUST NOT expose secrets through documentation, resolved configuration, build context, images, or diagnostic evidence.
- `CTR-ROUTE-004` MUST distinguish documentation-only review from authorization to build, deploy, stop, delete, or restore resources.

## Validation

For context edits, verify routes, links, rule identity, and scenario coverage. For container implementation, validate the exact configuration, build intended targets, and exercise affected startup/workload/recovery behavior in an appropriate isolated environment. Production actions remain governed by the authorized request.

## Related

[Application profile](../application/PROFILE.md), [technology](../technology/INDEX.md), [security](../security/INDEX.md), [validation matrix](../quality/validation-matrix.md). Technical references are linked at each pattern.
