---
id: CTR-DEPS
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "npm Docker install"
  - "native dependency"
  - "build cache"
---

# Container Dependency Installation

## Guidelines

Use the established lockfile and separate dependency cache keys from application source.

## Why

A cached install must represent the intended dependency contract, not a stale or locally modified tree.

## Structure

```dockerfile
# Fragment for a repository with npm and a committed compatible lockfile:
COPY package.json package-lock.json ./
RUN npm ci
# Copy application inputs after dependency installation where practical.
```

## Implementation

Preserve flags required by the current lockfile until an explicit cleanup is validated. Install only needed runtime dependencies in the final stage. Verify native addons and system libraries for the deployed architecture/libc. Build caching is a performance feature, not proof of dependency freshness.

## Rules

- `CTR-DEPS-001` MUST keep dependency installation consistent with the chosen lockfile/package manager.
- `CTR-DEPS-002` MUST NOT copy host node_modules or equivalent platform-specific build output into production by default.
- `CTR-DEPS-003` MUST validate runtime dependencies and native compatibility when install stages change.

## Validation

Run a clean install/build, inspect production dependency availability, and launch the final image on the intended target architecture.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.npmjs.com/cli/v11/commands/npm-ci/)
