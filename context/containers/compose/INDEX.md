---
id: CTR-COMPOSE-PACK
status: baseline
scope: "Docker Compose context pack; conditional activation"
triggers:
  - "docker-compose"
---

# Docker Compose Pack

## Guidelines

Read this pack only when [the application profile](../../application/PROFILE.md) enables `docker-compose` or explicitly maps a task to this pack. A file being present is not activation. This is a portable baseline; application-specific decisions and exceptions refine it.

Inspect the exact ordered Compose file set, CLI/plugin version, interpolation sources, project name, profiles, mounts, and environment overrides. Do not print fully resolved config when it can contain secrets.

## Why

Focused container context avoids importing unrelated language, framework, or runtime assumptions into a task. A framework does not choose a domain workflow or establish the security of an existing implementation.

## Structure

- [Compose Services and Environment Overrides](service-configuration-pattern.md) — `CTR-SERVICE`
- [Compose Startup and Dependency Readiness](startup-readiness-pattern.md) — `CTR-READY`
- [Compose Networking and Exposure](network-pattern.md) — `CTR-NET`
- [Volumes, Persistence, and Initialization](volume-initialization-pattern.md) — `CTR-VOLUME`
- [Compose Secrets and Environment Values](secret-environment-pattern.md) — `CTR-SECRET`

## Implementation

Start with current manifests/lockfiles, build configuration, and the actual entrypoint. Load only patterns matching the change and add security/quality context when triggered. Match official documentation to the installed version; linked current documentation is a reference, not permission to upgrade.

Examples and pseudocode illustrate boundaries. Adapt them to canonical components and APIs actually present in the application. When a required convention is not established, record a candidate decision rather than introducing an architecture silently.

## Rules

- `CTR-COMPOSE-PACK-001` MUST apply this pack only when the profile enables or explicitly routes the relevant target.
- `CTR-COMPOSE-PACK-002` MUST confirm installed/runtime versions before relying on version-specific APIs or configuration.
- `CTR-COMPOSE-PACK-003` MUST identify applicable pattern rule IDs and targeted validation for a substantive change.

## Validation

Confirm activation, selected documents, source/configuration evidence, and version compatibility. Run the existing checks appropriate to changed behavior. Context-only edits require document/link/rule validation; they do not require running application builds.

## Related

- [Application profile](../../application/PROFILE.md)
- [Security](../../security/INDEX.md)
- [Validation matrix](../../quality/validation-matrix.md)
- [Official reference](https://docs.docker.com/reference/compose-file/services/)
