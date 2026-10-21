---
id: TECH-LIBRARIES
status: baseline
scope: "Profile-enabled frontend library routing"
triggers:
  - "frontend library usage"
  - "UI theme, remote cache, form schema, HTTP client, or router"
---

# Frontend Library Patterns

## Guidelines

Activate a library only when [the application profile](../../application/PROFILE.md) declares it. Read the actual manifest/lockfile before selecting APIs. These patterns cover the declared MUI 5, TanStack Query 5, React Hook Form 7 with Zod 3, Axios 1, and React Router 6 contracts; upgrading any of them is a separately assessed change.

## Why

Generic React guidance defines state ownership, while each library supplies concrete lifecycle, validation, styling, and transport contracts.

## Structure

| Request | Pattern |
|---|---|
| Theme tokens, MUI primitives, shared component variants | [MUI theme and components](mui-theme-component-pattern.md) |
| Query identity, cached resource scope, mutation refresh | [TanStack Query](tanstack-query-pattern.md) |
| Form state, client validation, schema-derived types | [React Hook Form and Zod](form-schema-pattern.md) |
| Authenticated HTTP requests, interceptors, cancellation | [Axios transport](axios-transport-pattern.md) |
| Routes, links, parameters, browser history | [React Router](react-router-pattern.md) |

## Implementation

Use [React state ownership](../frameworks/react/component-state-pattern.md) alongside the matching library pattern. Find canonical providers/adapters in the application's implementation map. Keep server authorization independent of router visibility, form validation, or filtered cache results.

## Rules

- `TECH-LIBRARIES-001` MUST use only profile-enabled libraries and installed-version-compatible APIs.
- `TECH-LIBRARIES-002` MUST reuse established providers/adapters rather than create competing theme, query-cache, or transport owners for ordinary features.
- `TECH-LIBRARIES-003` MUST assess consumers before changing global library defaults.

## Validation

Inspect profile/manifests and affected provider/adapter ownership. Run the existing type/build or targeted behavioral checks for implementation changes. Document-only edits require link and rule checks.

## Related

[Technology router](../INDEX.md), [application profile](../../application/PROFILE.md), [security](../../security/INDEX.md), [validation matrix](../../quality/validation-matrix.md).
