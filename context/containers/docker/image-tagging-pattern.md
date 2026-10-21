---
id: CTR-IMAGE
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "image tag"
  - "registry"
  - "release image"
---

# Image Tags and Provenance

## Guidelines

Give every deployable image a traceable source/build identity and retain rollback references.

## Why

A mutable tag alone cannot identify which artifact ran or reproduce a previous deployment.

## Structure

```text
Artifact record:
source revision -> CI/build identifier -> image repository:version
-> resolved immutable digest -> supported architecture
-> scan result -> deployment environment -> prior compatible digest
```

## Implementation

Tag according to the established release scheme. Do not rebuild the same nominal release separately for each environment when the application can promote the same artifact with runtime configuration. Frontend build-time public variables require an explicit environment-artifact model.

## Rules

- `CTR-IMAGE-001` MUST make deployed artifacts traceable to source revision and image digest.
- `CTR-IMAGE-002` MUST retain the previous compatible artifact reference for planned rollback.
- `CTR-IMAGE-003` MUST NOT treat a tag named latest as sufficient release evidence.

## Validation

Compare intended/deployed digests, verify labels/metadata without secrets, and confirm the rollback artifact is retrievable.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/reference/cli/docker/image/tag/)
