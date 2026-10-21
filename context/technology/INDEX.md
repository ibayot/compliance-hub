---
id: TECH-INDEX
status: baseline
scope: "Language, framework, and runtime context routing"
triggers:
  - "language or framework implementation"
  - "dependency or runtime change"
---

# Technology Context

## Guidelines

Choose packs from [the application profile](../application/PROFILE.md). Framework, language, and platform concerns compose; their folders do not represent a required application architecture. Do not read every pack before starting work.

Select languages, frameworks, and libraries from the current application's profile and manifests. Available portable packs remain inactive until that profile enables or explicitly routes them. Shell guidance is task-scoped to owned shell/entrypoint work.

## Why

The same implementation task may need a language boundary, a framework lifecycle, and a platform behavior. Keeping those distinct supports reuse while avoiding contradictory state models or unrelated APIs.

## Structure

| Pack | Use for |
|---|---|
| [TypeScript](languages/typescript/INDEX.md) | Profile target `typescript` |
| [JavaScript](languages/javascript/INDEX.md) | Profile target `javascript` |
| [PHP](languages/php/INDEX.md) | Profile target `php` |
| [Dart](languages/dart/INDEX.md) | Profile target `dart` |
| [SQL](languages/sql/INDEX.md) | Profile target `sql` |
| [POSIX Shell](languages/shell/INDEX.md) | Profile target `shell` |
| [PowerShell](languages/powershell/INDEX.md) | Profile target `powershell` |
| [Node.js Runtime](frameworks/node/INDEX.md) | Profile target `node` |
| [NestJS](frameworks/nestjs/INDEX.md) | Profile target `nestjs` |
| [React](frameworks/react/INDEX.md) | Profile target `react` |
| [Laravel](frameworks/laravel/INDEX.md) | Profile target `laravel` |
| [Flutter](frameworks/flutter/INDEX.md) | Profile target `flutter` |
| [Electron](frameworks/electron/INDEX.md) | Profile target `electron` |
| [Frontend libraries](libraries/INDEX.md) | Profile-enabled MUI, TanStack Query, React Hook Form/Zod, Axios, and React Router |
| [Capacitor](frameworks/capacitor/INDEX.md) | Profile target `capacitor` |

## Implementation

1. Read the profile and owning package manifest/lockfile.
2. Select the language and framework packs matching changed files.
3. Add a matching [platform pack](../platforms/INDEX.md) when behavior depends on the execution target.
4. Add [container context](../containers/INDEX.md) only for build/runtime/container implications.
5. Load relevant security/domain rules through the master router.

The index does not prescribe all listed technologies. Future applications can copy this context structure and activate their own profile; decisions and implementation references must be revalidated for that application.

## Rules

- `TECH-ROUTE-001` MUST NOT apply inactive technologies merely because documentation exists.
- `TECH-ROUTE-002` MUST match examples and API guidance to the installed version and supported runtime.
- `TECH-ROUTE-003` MUST treat technology adoption, major upgrades, and replacement state frameworks as explicit decisions with affected-consumer assessment.

## Validation

Check profile-to-manifest alignment, narrow route selection, valid pattern links, and unique rule IDs. For implementation work, use the [validation matrix](../quality/validation-matrix.md); the presence of guidance is not evidence of code compliance.

## Related

[Application profile](../application/PROFILE.md), [security](../security/INDEX.md), [platforms](../platforms/INDEX.md), [containers](../containers/INDEX.md).
