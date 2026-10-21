---
id: CTR-BASE
status: baseline
scope: "Docker Builds; applicable only when enabled by the application profile"
triggers:
  - "FROM image"
  - "runtime version"
  - "digest"
---

# Base Images and Update Policy

## Guidelines

Choose a trusted image compatible with the supported runtime, native modules, and platform.

## Why

A moving tag changes reproducibility; a permanently frozen digest misses later fixes.

## Structure

```text
Image record:
publisher + repository
runtime/OS version + supported architecture
resolved digest + build timestamp
update owner + compatibility checks
```

## Implementation

Resolve the runtime from the application profile/manifests and actual image, not from current online examples. Where production reproducibility requires digest pins, define a review/update process. Alpine, slim, and distroless have different libc/tooling tradeoffs; do not switch by image size alone.

## Rules

- `CTR-BASE-001` MUST verify the selected runtime/base version against application and dependency support.
- `CTR-BASE-002` MUST record or otherwise make the deployed image digest traceable.
- `CTR-BASE-003` SHOULD define scheduled base refreshes and tests when pinning images.

## Validation

Check target architecture, native modules, CA/timezone requirements, known-vulnerability findings, and startup after a base change.

## Exceptions

Existing Dockerfiles/Compose configuration are implementation evidence, not evidence that this baseline is satisfied. Record deviations and their affected environment; evaluate changes separately before altering a running deployment.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../application/PROFILE.md)
- [Security routing](../../security/INDEX.md)
- [Official reference](https://docs.docker.com/build/building/best-practices/)
