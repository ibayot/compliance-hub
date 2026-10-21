---
id: CTR-LIMIT
status: baseline
scope: "Container Operations; applicable only when enabled by the application profile"
triggers:
  - "memory limit"
  - "CPU limit"
  - "concurrency"
---

# Container Resource Limits

## Guidelines

Choose CPU, memory, process, and workload limits from measured service needs.

## Why

A low limit can trigger outages; absent limits let one workload starve others.

## Structure

```text
Capacity record:
service -> baseline/peak memory + CPU + temporary storage
workload concurrency -> queue/backpressure
configured limit -> effective runtime limit -> alert threshold
over-limit behavior -> recovery expectation
```

## Implementation

Check the actual Compose/engine support for the chosen limit fields. Coordinate Node heap settings, database settings, worker concurrency, and host headroom. Limits do not replace request-size controls or bounded queue growth.

## Rules

- `CTR-LIMIT-001` MUST verify effective runtime limits instead of relying only on YAML fields.
- `CTR-LIMIT-002` MUST define expected behavior under memory pressure or concurrency saturation.
- `CTR-LIMIT-003` SHOULD validate limits with representative work before lowering production capacity.

## Validation

Use isolated load/failure tests for changed limits. Inspect actual runtime configuration, OOM behavior, queue backpressure, and recovery.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/engine/containers/resource_constraints/)
