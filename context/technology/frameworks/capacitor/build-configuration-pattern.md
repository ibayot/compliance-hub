---
id: TECH-CAP-CONFIG
status: baseline
scope: "Capacitor; applicable only when enabled by the application profile"
triggers:
  - "Capacitor sync"
  - "native build"
  - "cleartext"
  - "allowNavigation"
---

# Capacitor Build and Configuration

## Guidelines

Treat the web bundle, generated native assets, native configuration, and signing environment as one build chain.

## Why

A successful web build does not prove native files were synchronized or production networking is restricted.

## Structure

```text
Pseudocode:
select approved environment -> build web assets -> verify webDir
-> sync declared native platform -> inspect intended generated diff
-> build/sign -> install -> runtime verification
```

## Implementation

Keep development cleartext/navigation exceptions bounded to their environment. The current repository config is evidence to assess, not proof that those exceptions are safe for release. Do not embed server secrets in web build variables, native resources, or public client IDs.

## Rules

- `TECH-CAP-CONFIG-001` MUST verify the target environment, generated assets, and native configuration before distribution.
- `TECH-CAP-CONFIG-002` MUST scope cleartext/network-navigation exceptions explicitly and validate production behavior.
- `TECH-CAP-CONFIG-003` MUST NOT commit signing secrets or treat web bundle variables as secret storage.

## Validation

Inspect intended generated changes, test cold launch and API connectivity on the installed artifact, and verify the release build excludes development networking exceptions.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://capacitorjs.com/docs/config)
