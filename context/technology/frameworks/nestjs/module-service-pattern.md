---
id: TECH-NEST-MODULE
status: baseline
scope: "NestJS; applicable only when enabled by the application profile"
triggers:
  - "Nest module"
  - "provider"
  - "service boundary"
---

# Nest Modules and Services

## Guidelines

Keep controllers focused on transport and make provider ownership explicit in modules.

## Why

Implicit dependencies and broad exports couple unrelated domains and complicate test setup.

## Structure

```typescript
import { Injectable, Module } from '@nestjs/common';

@Injectable()
class LabelService {
  normalize(value: string): string { return value.trim(); }
}

@Module({ providers: [LabelService], exports: [LabelService] })
export class LabelModule {}
```

## Implementation

This minimal module has no persistence or authorization. In real code, retain the owning domain module, use injected dependencies, and export only contracts needed by consumers. Avoid global modules or circular-reference helpers as the default fix for a boundary problem.

## Rules

- `TECH-NEST-MODULE-001` MUST register and inject providers through the owning module.
- `TECH-NEST-MODULE-002` MUST preserve application service/data ownership boundaries.
- `TECH-NEST-MODULE-003` SHOULD keep domain logic reusable without HTTP request/response objects.

## Validation

Compile the owning module in the existing test harness and exercise a controller/service path. Check provider resolution, exports, and dependency cycles.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.nestjs.com/modules)
