---
id: CTR-SERVICE
status: baseline
scope: "Docker Compose; applicable only when enabled by the application profile"
triggers:
  - "Compose service"
  - "override"
  - "environment configuration"
---

# Compose Services and Environment Overrides

## Guidelines

Treat the merged deployment model as the configuration contract.

## Why

A secure-looking base file may be changed by development overrides, mounted source, or exposed ports.

## Structure

```text
Configuration record:
project name + ordered compose file list + enabled profiles
service -> image/build -> command -> environment -> mounts
target environment -> intended exposed endpoints -> validation result
```

## Implementation

Confirm merge behavior for the installed Compose version. Separate development conveniences from release settings and keep required-variable errors explicit. Use config --quiet for schema validation where supported; any resolved config output needs redaction before capture.

## Rules

- `CTR-SERVICE-001` MUST validate the exact Compose file combination used for the target environment.
- `CTR-SERVICE-002` MUST keep development mounts/debug endpoints bounded to their intended environment.
- `CTR-SERVICE-003` MUST NOT publish resolved configuration containing credentials or tokens.

## Validation

Run non-mutating schema validation on the intended file set when changing it; inspect redacted effective service settings and compare build/command/mount differences.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/reference/compose-file/services/)
