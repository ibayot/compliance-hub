---
id: CTR-LOG
status: baseline
scope: "Container Operations; applicable only when enabled by the application profile"
triggers:
  - "container logs"
  - "log rotation"
  - "diagnostics"
---

# Container Logging and Diagnostics

## Guidelines

Make logs actionable, bounded, and safe to collect.

## Why

Unbounded disk usage and leaked tokens can turn debugging into an operational incident.

## Structure

```text
application -> approved structured stdout/stderr
runtime -> configured log driver/rotation -> retention owner
request/job -> correlation ID -> redacted diagnostic
support export -> minimum scope -> reviewed sharing
```

## Implementation

Use the existing logging schema and driver. Document retention and rotation at the driver/collector where they actually run; filesystem logs need explicit persistence/rotation. Keep health probes from flooding normal request logs.

## Rules

- `CTR-LOG-001` MUST exclude secrets and unnecessary personal data from container logs.
- `CTR-LOG-002` MUST define a bounded retention/rotation strategy for changed logging paths.
- `CTR-LOG-003` MUST preserve error and correlation context needed to investigate failures.

## Validation

Generate representative errors using synthetic data, inspect redaction/correlation, and verify configured rotation/collection in the target environment.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/engine/logging/configure/)
