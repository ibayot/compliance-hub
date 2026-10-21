---
id: CTR-READY
status: baseline
scope: "Docker Compose; applicable only when enabled by the application profile"
triggers:
  - "depends_on"
  - "startup ordering"
  - "service recovery"
---

# Compose Startup and Dependency Readiness

## Guidelines

Use explicit dependency readiness at startup and application-level recovery during runtime.

## Why

Creation order is not equivalent to availability, and a dependency can fail after startup.

## Structure

```yaml
# Fragment only; db must declare a meaningful healthcheck.
services:
  api:
    depends_on:
      db:
        condition: service_healthy
```

## Implementation

Match features to the installed Compose version. Each service must still handle unavailable dependencies with bounded retries/backoff and clear errors. Run one-shot initialization/migration work through an approved workflow, not an unbounded sleep.

## Rules

- `CTR-READY-001` MUST distinguish service creation order from readiness.
- `CTR-READY-002` MUST define runtime dependency recovery independently of startup dependencies.
- `CTR-READY-003` MUST NOT replace readiness checks with arbitrary long sleeps.

## Validation

Test cold startup, slow database initialization, dependency restart after healthy startup, and an intentionally failed migration in an isolated environment.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/compose/how-tos/startup-order/)
