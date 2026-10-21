---
id: TECH-PHP-PACK
status: baseline
scope: "PHP context pack; conditional activation"
triggers:
  - "php"
---

# PHP Pack

## Guidelines

Read this pack only when [the application profile](../../../application/PROFILE.md) enables `php` or explicitly maps a task to this pack. A file being present is not activation. This is a portable baseline; application-specific decisions and exceptions refine it.

Inactive unless the profile enables PHP. Read composer.json, composer.lock, PHP platform requirements, extensions, and framework version before choosing syntax or dependencies.

## Why

Focused technology context avoids importing unrelated language, framework, or runtime assumptions into a task. A framework does not choose a domain workflow or establish the security of an existing implementation.

## Structure

- [PHP Typed Boundaries](typed-boundary-pattern.md) — `TECH-PHP-TYPES`

## Implementation

Start with current manifests/lockfiles, build configuration, and the actual entrypoint. Load only patterns matching the change and add security/quality context when triggered. Match official documentation to the installed version; linked current documentation is a reference, not permission to upgrade.

Examples and pseudocode illustrate boundaries. Adapt them to canonical components and APIs actually present in the application. When a required convention is not established, record a candidate decision rather than introducing an architecture silently.

## Rules

- `TECH-PHP-PACK-001` MUST apply this pack only when the profile enables or explicitly routes the relevant target.
- `TECH-PHP-PACK-002` MUST confirm installed/runtime versions before relying on version-specific APIs or configuration.
- `TECH-PHP-PACK-003` MUST identify applicable pattern rule IDs and targeted validation for a substantive change.

## Validation

Confirm activation, selected documents, source/configuration evidence, and version compatibility. Run the existing checks appropriate to changed behavior. Context-only edits require document/link/rule validation; they do not require running application builds.

## Related

- [Application profile](../../../application/PROFILE.md)
- [Security](../../../security/INDEX.md)
- [Validation matrix](../../../quality/validation-matrix.md)
- [Official reference](https://www.php.net/manual/en/language.types.declarations.php)
