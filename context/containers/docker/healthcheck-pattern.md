---
id: CTR-HEALTH
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "HEALTHCHECK"
  - "readiness"
  - "service probe"
---

# Container Health Checks

## Guidelines

Specify what each probe proves and keep it cheap and non-mutating.

## Why

A running process can be unable to serve traffic; an expensive probe can worsen an outage.

## Structure

```text
Probe contract:
liveness -> process can progress
readiness -> minimum dependencies required to serve intended traffic
startup allowance -> expected initialization budget
interval/timeout/retries -> bounded probe cost and failure detection
```

## Implementation

Use commands/tools actually present in the image and target the correct internal listener. Avoid embedding credentials or querying sensitive data. A Docker health status does not by itself guarantee automatic restart or continuous dependency recovery.

## Rules

- `CTR-HEALTH-001` MUST define probe meaning and verify it checks the intended service/listener.
- `CTR-HEALTH-002` MUST keep health checks non-mutating and free of exposed credentials.
- `CTR-HEALTH-003` MUST NOT treat health status alone as proof of restart/recovery behavior.

## Validation

Test initial startup, a failed listener, dependency outage, slow initialization, and the supervisor's actual unhealthy-state response.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/reference/dockerfile/#healthcheck)
