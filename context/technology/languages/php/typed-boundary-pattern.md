---
id: TECH-PHP-TYPES
status: baseline
scope: "PHP; applicable only when enabled by the application profile"
triggers:
  - "PHP validation"
  - "PHP service"
  - "PHP exception"
---

# PHP Typed Boundaries

## Guidelines

Use supported scalar/object declarations and validate request data before constructing domain objects.

## Why

Declared parameter types improve contracts but do not replace business validation.

## Structure

```php
<?php
declare(strict_types=1);

function normalizeLabel(string $label): string
{
    $value = trim($label);
    if ($value === '') {
        throw new InvalidArgumentException('Label is required');
    }
    return $value;
}
```

## Implementation

Apply the established namespace/autoloading convention. Keep HTTP extraction in the transport layer. Preserve exception causes for diagnostics and expose approved messages. Do not introduce a new service/repository abstraction solely to match this sample.

## Rules

- `TECH-PHP-TYPES-001` MUST confirm the deployed PHP version before using version-specific syntax.
- `TECH-PHP-TYPES-002` MUST validate business invariants in addition to parameter types.
- `TECH-PHP-TYPES-003` MUST NOT expose stack traces, SQL, credentials, or raw exception details to users.

## Validation

Run the application's formatter/static analyzer and focused tests in the declared PHP version. Test malformed input and exception mapping.

## Exceptions

Apply only to the enabled pack and changed behavior. Record a scoped exception with rationale and validation when a baseline cannot be followed; this document does not authorize an application architecture migration.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.php.net/manual/en/language.types.declarations.php)
