---
id: CTR-DOCKER-PACK
status: baseline
scope: "Docker Builds context pack; conditional activation"
triggers:
  - "docker"
---

# Docker Builds Pack

## Guidelines

Read this pack only when [the application profile](../../application/PROFILE.md) enables `docker` or explicitly maps a task to this pack. A file being present is not activation. This is a portable baseline; application-specific decisions and exceptions refine it.

Read the actual Dockerfiles, build context, ignore files, lockfiles, target architecture, runtime identity, and entrypoint. Check Docker/BuildKit versions before using new syntax. The baseline does not assert current files are hardened.

## Why

Focused container context avoids importing unrelated language, framework, or runtime assumptions into a task. A framework does not choose a domain workflow or establish the security of an existing implementation.

## Structure

- [Multi-Stage Builds](multi-stage-build-pattern.md) — `CTR-STAGES`
- [Base Images and Update Policy](base-image-pattern.md) — `CTR-BASE`
- [Build Context and Ignore Rules](build-context-pattern.md) — `CTR-CONTEXT`
- [Container Dependency Installation](dependency-installation-pattern.md) — `CTR-DEPS`
- [Container Identity and Writable Paths](non-root-filesystem-pattern.md) — `CTR-USER`
- [Entrypoints and Signals](entrypoint-signal-pattern.md) — `CTR-ENTRY`
- [Container Health Checks](healthcheck-pattern.md) — `CTR-HEALTH`
- [Image Tags and Provenance](image-tagging-pattern.md) — `CTR-IMAGE`

## Implementation

Start with current manifests/lockfiles, build configuration, and the actual entrypoint. Load only patterns matching the change and add security/quality context when triggered. Match official documentation to the installed version; linked current documentation is a reference, not permission to upgrade.

Examples and pseudocode illustrate boundaries. Adapt them to canonical components and APIs actually present in the application. When a required convention is not established, record a candidate decision rather than introducing an architecture silently.

## Rules

- `CTR-DOCKER-PACK-001` MUST apply this pack only when the profile enables or explicitly routes the relevant target.
- `CTR-DOCKER-PACK-002` MUST confirm installed/runtime versions before relying on version-specific APIs or configuration.
- `CTR-DOCKER-PACK-003` MUST identify applicable pattern rule IDs and targeted validation for a substantive change.

## Validation

Confirm activation, selected documents, source/configuration evidence, and version compatibility. Run the existing checks appropriate to changed behavior. Context-only edits require document/link/rule validation; they do not require running application builds.

## Related

- [Application profile](../../application/PROFILE.md)
- [Security](../../security/INDEX.md)
- [Validation matrix](../../quality/validation-matrix.md)
- [Official reference](https://docs.docker.com/build/building/best-practices/)
