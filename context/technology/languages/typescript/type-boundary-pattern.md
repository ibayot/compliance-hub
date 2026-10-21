---
id: TECH-TS-TYPES
status: baseline
scope: "TypeScript; applicable only when enabled by the application profile"
triggers:
  - "untrusted data"
  - "DTO"
  - "unsafe cast"
---

# Type Boundaries

## Guidelines

Keep runtime validation at boundaries and preserve precise types inside the application.

## Why

A TypeScript declaration cannot prove that a remote response, stored JSON, or form payload has the declared shape.

## Structure

```typescript
function readLabel(value: unknown): string {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error('Invalid label');
  }
  return value.trim();
}
```

## Implementation

Use the application's selected validation library for compound payloads. Narrow unknown values before access; map validated transport objects to domain types. Distinguish missing, empty, null, and zero according to the contract.

## Rules

- `TECH-TS-TYPES-001` MUST validate externally controlled values before relying on their domain shape.
- `TECH-TS-TYPES-002` MUST NOT replace validation with an unchecked assertion or new unbounded `any`.
- `TECH-TS-TYPES-003` SHOULD represent mutually exclusive states with unions rather than contradictory optional flags.

## Validation

Run the existing type check and relevant boundary tests. Exercise absent fields, wrong primitives, excess fields where relevant, and valid false/zero values.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.typescriptlang.org/docs/handbook/2/narrowing.html)
