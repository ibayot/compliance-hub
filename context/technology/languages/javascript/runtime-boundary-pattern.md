---
id: TECH-JS-BOUNDARY
status: baseline
scope: "JavaScript; applicable only when enabled by the application profile"
triggers:
  - "JavaScript utility"
  - "module format"
  - "input parsing"
---

# JavaScript Runtime Boundaries

## Guidelines

Document input and output contracts for utilities and keep browser and server dependencies separate.

## Why

Dynamic values and implicit coercion can turn malformed input into valid-looking output.

## Structure

```javascript
export function parseCount(value) {
  const count = Number(value);
  if (!Number.isInteger(count) || count < 0) {
    throw new Error('Invalid count');
  }
  return count;
}
```

## Implementation

The example is ESM and assumes the owning package enables it. Reject absent or empty input before numeric coercion when the contract requires it. Use structured argument lists for subprocesses and the package's existing module format.

## Rules

- `TECH-JS-BOUNDARY-001` MUST check the caller's input contract before coercing dynamic values.
- `TECH-JS-BOUNDARY-002` MUST preserve the package's module format unless a migration is explicitly in scope.
- `TECH-JS-BOUNDARY-003` MUST NOT expose server-only environment values through browser bundles.

## Validation

Run the script in the actual supported runtime. Check undefined, null, empty text, whitespace, NaN, and unexpected objects; verify import paths on supported operating systems.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Modules)
