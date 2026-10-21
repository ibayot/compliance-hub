---
id: CTR-SECRET
status: baseline
scope: "Docker Compose; applicable only when enabled by the application profile"
triggers:
  - "Compose secret"
  - "env_file"
  - "configuration injection"
---

# Compose Secrets and Environment Values

## Guidelines

Classify each value as public configuration or secret and inject it through the approved environment mechanism.

## Why

Environment convenience is not secret confidentiality; resolved config and inspection can expose values.

## Structure

```text
Variable record:
name -> classification -> producer -> consuming service
required/default -> startup validation -> rotation/restart behavior
secret source -> access scope -> redacted diagnostics
```

## Implementation

Prefer supported secret-file mounts where the service and deployment support them. Environment-managed secrets may still be required by existing software; document exposure and mitigation. A Compose secret declaration alone does not guarantee encrypted host storage or an external secret manager.

## Rules

- `CTR-SECRET-001` MUST keep actual secret values out of source, examples, logs, and saved resolved config.
- `CTR-SECRET-002` MUST grant secrets only to consuming services.
- `CTR-SECRET-003` MUST define required values and avoid insecure fallback credentials for release environments.

## Validation

Verify missing-variable behavior, secret-file access, intended service scope, redacted startup failure, and rotation behavior without printing values.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/compose/how-tos/use-secrets/)
