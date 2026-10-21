---
id: CTR-ENTRY
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "CMD"
  - "ENTRYPOINT"
  - "SIGTERM"
  - "container shutdown"
---

# Entrypoints and Signals

## Guidelines

Run the intended foreground service and preserve signal delivery to it.

## Why

An intermediate shell can prevent graceful termination and create unfinished work.

## Structure

```dockerfile
# Fragment, requires this built entrypoint:
CMD ["node", "dist/apps/gateway.main.js"]
```

## Implementation

The path illustrates the repository's existing gateway output; other applications use their own verified entrypoints. If a wrapper is needed, finish with exec and avoid secret logging. Check whether an init process is required for child reaping. Align grace period with bounded application drain.

## Rules

- `CTR-ENTRY-001` MUST verify signal delivery reaches the foreground application process.
- `CTR-ENTRY-002` MUST bound shutdown and define handling of active requests/jobs.
- `CTR-ENTRY-003` MUST NOT hide a failed startup behind a backgrounded process or permanently running shell.

## Validation

Start an isolated container, send normal termination during active work, and verify exit behavior, child cleanup, and restart reconciliation.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/reference/dockerfile/#entrypoint)
