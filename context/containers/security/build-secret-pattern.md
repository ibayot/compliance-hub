---
id: CTR-BUILDSECRET
status: baseline
scope: "Container Security; applicable only when enabled by the application profile"
triggers:
  - "registry credential"
  - "build secret"
  - "private package"
---

# Build Secrets and Supply Inputs

## Guidelines

Use temporary build-secret mechanisms for private fetches and preserve artifact provenance.

## Why

ARG, ENV, copied files, image history, and build logs can retain credentials.

## Structure

```dockerfile
# BuildKit fragment; consuming tool must read the temporary file safely.
RUN --mount=type=secret,id=registry_auth \
    test -r /run/secrets/registry_auth
```

## Implementation

The fragment proves only mount availability; configure the approved package tool to consume it without echoing content. Verify BuildKit/frontend support and scope the source credential outside the build context. Also inspect generated configuration and package caches for copied credentials.

## Rules

- `CTR-BUILDSECRET-001` MUST NOT use build ARG/ENV or committed files to transport secrets into images.
- `CTR-BUILDSECRET-002` MUST keep temporary secret contents out of build output, final artifacts, and exported caches.
- `CTR-BUILDSECRET-003` MUST verify source/package provenance according to the application's supply-chain policy.

## Validation

Inspect build history/artifacts through secret-safe checks and verify a missing secret fails clearly. Use synthetic credentials in any exposure test.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/build/building/secrets/)
