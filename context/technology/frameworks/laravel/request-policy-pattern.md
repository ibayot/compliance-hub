---
id: TECH-LARAVEL-REQUEST
status: baseline
scope: "Laravel; applicable only when enabled by the application profile"
triggers:
  - "Laravel controller"
  - "Form Request"
  - "policy"
---

# Laravel Requests and Policies

## Guidelines

Use the application's request-validation and policy mechanisms to separate transport validation from authorization.

## Why

A validated request can still reference a forbidden resource.

## Structure

```text
Pseudocode:
route middleware -> authenticated principal
form request -> input validation + intended authorization boundary
policy -> capability and record scope
controller/action -> domain operation -> approved response resource
```

## Implementation

Map the sequence to the installed Laravel version. Scope model binding and queries where required. Avoid mass-assigning unvalidated attributes; response resources expose approved fields only. Use existing action/service conventions rather than inventing a new layer.

## Rules

- `TECH-LARAVEL-REQUEST-001` MUST evaluate authorization for route-bound records and mutations.
- `TECH-LARAVEL-REQUEST-002` MUST write only approved validated fields, with model assignment restrictions as defense in depth.
- `TECH-LARAVEL-REQUEST-003` MUST NOT expose unrestricted model attributes by default.

## Validation

Test unauthenticated, forbidden-resource, invalid-input, allowed-scope, and extra-attribute requests through the actual routes.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://laravel.com/docs/authorization)
