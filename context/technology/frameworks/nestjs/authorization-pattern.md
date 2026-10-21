---
id: TECH-NEST-AUTH
status: baseline
scope: "NestJS; applicable only when enabled by the application profile"
triggers:
  - "Nest guard"
  - "capability"
  - "resource authorization"
---

# Nest Authorization Boundaries

## Guidelines

Authenticate callers and evaluate capability plus resource scope before protected behavior.

## Why

A valid token identifies a caller; it does not prove permission to every requested record.

## Structure

```text
Pseudocode:
route -> established authentication guard
      -> required-capability guard
      -> service loads record within authorized scope
      -> authorized operation -> audit event
```

## Implementation

Use the repository's actual guard/decorator contracts. Keep resource rules in a reusable policy/service where list and mutation paths can share them. Include internal routes, exports, attachments, and scheduled/background behavior in the trust-boundary assessment.

## Rules

- `TECH-NEST-AUTH-001` MUST enforce authorization on the server for every protected path changed.
- `TECH-NEST-AUTH-002` MUST evaluate record ownership/scope in addition to route-level capability when required.
- `TECH-NEST-AUTH-003` MUST NOT make a frontend-hidden control the only authorization barrier.

## Validation

Run allowed and denied capability cases, cross-scope record access, identifier substitution, and a valid-token/forbidden-resource case.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.nestjs.com/guards)
