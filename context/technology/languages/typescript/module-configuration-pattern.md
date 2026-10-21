---
id: TECH-TS-MODULE
status: baseline
scope: "TypeScript; applicable only when enabled by the application profile"
triggers:
  - "import"
  - "tsconfig"
  - "build"
---

# Modules and Compiler Configuration

## Guidelines

Use the module mode, path aliases, and public exports supported by the actual runtime and build tool.

## Why

An import can satisfy the compiler and still fail in emitted JavaScript.

## Structure

```typescript
export type Identifier = string;
export function isIdentifier(value: unknown): value is Identifier {
  return typeof value === 'string' && value.length > 0;
}
```

## Implementation

Inspect package module type, tsconfig inheritance, test transforms, and runtime entrypoints together. Keep domain modules independent of unrelated UI or persistence code. Export the smallest supported surface; verify aliases after emission.

## Rules

- `TECH-TS-MODULE-001` MUST check emitted/runtime module compatibility when changing imports or compiler options.
- `TECH-TS-MODULE-002` MUST NOT silently enable new compiler behavior across the application while fixing one file.
- `TECH-TS-MODULE-003` SHOULD use type-only imports when the import is required solely for typing and the toolchain supports them.

## Validation

Build the affected package and launch its real entrypoint or targeted module test. Inspect unexpected dependency cycles.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.typescriptlang.org/docs/handbook/modules/theory.html)
