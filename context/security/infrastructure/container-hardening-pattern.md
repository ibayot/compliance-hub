---
id: SEC-CONTAINER
status: baseline
scope: security
owner: application-maintainer
triggers: ["Docker", "container privilege", "image"]
---

# Container security boundary pattern

## Guidelines

Activate for containerized workloads. Treat a container as a process-isolation boundary whose authority depends on runtime configuration.

## Why

Broad host mounts, runtime sockets, or privileged execution can remove the intended isolation.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
verified source/image → minimal build → non-root process → constrained capabilities/mounts/network → bounded resources → observable lifecycle
```

## Implementation

Declare required writes, devices, ports, capabilities, and host access. Use read-only filesystems and dropped capabilities where the workload permits. Keep development conveniences scoped to development.

## Rules

- **SEC-CONTAINER-001** — MUST justify privileged execution, host runtime socket access, host networking, and broad host mounts before introducing them.
- **SEC-CONTAINER-002** — SHOULD run application processes as non-root with only required capabilities and writable paths.
- **SEC-CONTAINER-003** — MUST keep credentials out of image layers and evaluate base/runtime image updates against supported versions.

## Validation

Review the effective image and deployment configuration; verify identity, mounts, exposed ports, permissions, and limits in an isolated runtime.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [container-security-pattern](../container-security-pattern.md)
- [secrets-management-pattern](secrets-management-pattern.md)

Reference: [OWASP Docker Security](https://cheatsheetseries.owasp.org/cheatsheets/Docker_Security_Cheat_Sheet.html).
