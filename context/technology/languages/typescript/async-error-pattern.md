---
id: TECH-TS-ASYNC
status: baseline
scope: "TypeScript; applicable only when enabled by the application profile"
triggers:
  - "promise"
  - "retry"
  - "catch"
---

# Async Results and Errors

## Guidelines

Make promise ownership visible and normalize errors at the layer responsible for recovery.

## Why

Unobserved promises and blanket catch blocks make failures appear successful.

## Structure

```typescript
async function readText(response: Response): Promise<string> {
  if (!response.ok) throw new Error('Request failed');
  return response.text();
}
```

## Implementation

The caller awaits, returns, or intentionally supervises each operation. Preserve cancellation and original diagnostic context internally; map errors to approved public messages. A detached background operation needs a named owner, failure reporting, and shutdown behavior.

## Rules

- `TECH-TS-ASYNC-001` MUST observe rejection for every started asynchronous operation.
- `TECH-TS-ASYNC-002` MUST NOT report success after suppressing an operation's failure.
- `TECH-TS-ASYNC-003` SHOULD distinguish cancellation, validation failure, authorization failure, and transient failure when recovery differs.

## Validation

Use rejected promises and cancellation scenarios, inspect callers, and run relevant lint/type checks. Verify retries cannot duplicate non-idempotent work.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.typescriptlang.org/docs/handbook/2/functions.html)
