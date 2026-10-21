---
id: TECH-NEST-DTO
status: baseline
scope: "NestJS; applicable only when enabled by the application profile"
triggers:
  - "Nest DTO"
  - "ValidationPipe"
  - "request transformation"
---

# Nest Request Validation

## Guidelines

Treat request DTOs as runtime boundary contracts and inspect the actual pipe configuration.

## Why

A typed controller parameter alone cannot reject malicious or malformed JSON.

## Structure

```typescript
import { IsString, MinLength } from 'class-validator';

export class CreateLabelDto {
  @IsString()
  @MinLength(1)
  label!: string;
}
```

## Implementation

The example requires an installed validation pipeline. Whitespace normalization, nested validation, field whitelisting, and transformation need deliberate configuration. Reuse approved constraints without changing global pipe behavior during a local feature.

## Rules

- `TECH-NEST-DTO-001` MUST confirm the route's runtime validation path rather than relying on DTO annotations alone.
- `TECH-NEST-DTO-002` MUST validate identifiers, query parameters, and nested payloads as applicable.
- `TECH-NEST-DTO-003` MUST NOT change global transformation/whitelisting semantics without impact assessment.

## Validation

Send wrong types, missing fields, unknown fields, whitespace, nested invalid input, and out-of-range query values through the actual route.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.nestjs.com/techniques/validation)
