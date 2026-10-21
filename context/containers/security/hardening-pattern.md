---
id: CTR-HARDEN
status: baseline
scope: "Container Security; applicable only when enabled by the application profile"
triggers:
  - "privileged"
  - "docker socket"
  - "read_only"
  - "capabilities"
---

# Container Runtime Hardening

## Guidelines

Grant only the runtime privileges and host access needed by a service.

## Why

Host namespaces, privileged mode, and engine sockets can bypass container isolation.

## Structure

```text
Runtime review:
identity -> capabilities -> privilege escalation controls
filesystem -> writable mounts -> host paths/devices
network -> exposed ports -> trust boundaries
engine socket -> explicit exceptional purpose -> restricted access
```

## Implementation

Evaluate non-root operation, capability drops, no-new-privileges, read-only root filesystems, and explicit writable paths against real runtime needs. Apply changes incrementally with startup and workload validation. Container security does not replace backend authorization.

## Rules

- `CTR-HARDEN-001` MUST assess host-impacting settings before adding privileged mode, host namespaces, devices, or engine socket mounts.
- `CTR-HARDEN-002` MUST document why each exceptional runtime privilege is required.
- `CTR-HARDEN-003` SHOULD minimize capabilities, writable paths, and host access while preserving verified functionality.

## Validation

Inspect effective runtime settings and attempt representative legitimate operations with reduced privileges. Check denied access behaves safely and capture deviations.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/engine/security/)
