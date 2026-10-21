---
id: CTR-STAGES
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "Dockerfile"
  - "image size"
  - "build artifact"
---

# Multi-Stage Builds

## Guidelines

Separate compilation/tooling from the runtime image and copy a deliberate artifact set.

## Why

Build tools, tests, and source archives can enlarge production images and expose unnecessary material.

## Structure

```dockerfile
# Fragment: build and runtime stages must already exist.
COPY --from=build /app/dist /app/dist
# Copy only the runtime dependencies/configuration required by the application.
```

## Implementation

Name stages and verify all service entrypoints exist in the emitted artifact. A runtime stage derived from a tooling-heavy base still includes those tools; inspect its lineage. Check native dependency compatibility between build and runtime bases.

## Rules

- `CTR-STAGES-001` MUST identify the production target and required runtime artifacts.
- `CTR-STAGES-002` SHOULD exclude build-only tools and development assets from the runtime image.
- `CTR-STAGES-003` MUST validate all deployed entrypoints, not only the default CMD.

## Validation

Build the intended target in an isolated build environment when changing it. Inspect image contents and launch each service command from that image.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/build/building/multi-stage/)
