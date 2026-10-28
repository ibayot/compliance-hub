---
id: CTR-CONTEXT
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "dockerignore"
  - "COPY"
  - "build context"
---

# Build Context and Ignore Rules

## Guidelines

Send only required inputs to the builder and copy files according to clear ownership.

## Why

A broad context can include private data even when the final image does not visibly reference it.

## Structure

```text
Example .dockerignore entries, review against the actual context:
.git
node_modules
coverage
.env
.env.*
*.pem
# Re-include only explicitly approved non-secret example files if needed.
```

## Implementation

Inspect effective context root and Dockerfile-specific ignore rules. Do not exclude manifests, runtime templates, migrations, or required assets accidentally. Use build secret mounts rather than copying credentials and deleting them in another layer.

When production begins using files inside a previously preview-only or ignored directory, inspect both the production import graph and the effective build-context allowlist. Re-include only the required production inputs; keep fixtures and private material excluded. Verify the actual target-platform image with its locked installation and native dependencies, then exercise the packaged route/runtime under its intended identity, mounts and resource limits. A host build or a previously built image does not establish that the current packaged artifact works (CTR-CONTEXT-001/002).

## Rules

- `CTR-CONTEXT-001` MUST exclude credentials and unnecessary private material from build context.
- `CTR-CONTEXT-002` MUST confirm COPY paths resolve within the intended build inputs.
- `CTR-CONTEXT-003` MUST NOT rely on deleting a secret in a later image layer to remove exposure.

## Validation

Review context contents without printing secret data. Build from a clean checkout/context and verify required static assets and bootstrap files exist.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/build/concepts/context/)
