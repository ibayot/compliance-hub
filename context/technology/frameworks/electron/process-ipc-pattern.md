---
id: TECH-ELECTRON-IPC
status: baseline
scope: "Electron; applicable only when enabled by the application profile"
triggers:
  - "Electron IPC"
  - "preload"
  - "filesystem bridge"
---

# Electron Process and IPC Boundaries

## Guidelines

Expose narrow named capabilities from the privileged process through a minimal bridge.

## Why

A generic execution or filesystem bridge turns a renderer bug into operating-system access.

## Structure

```text
Pseudocode:
renderer -> bridge.chooseAttachment()
preload -> one approved IPC channel with validated arguments
main -> verify sender + authorization + allowed path
     -> perform bounded operation -> return minimal result
```

## Implementation

Use context isolation and sandboxing according to the supported Electron version and application constraints. Treat IPC callers and payloads as untrusted. Keep privileged modules and secrets out of renderers; disable arbitrary navigation and new-window behavior unless explicitly needed.

## Rules

- `TECH-ELECTRON-IPC-001` MUST validate sender, payload, authorization, and filesystem scope at privileged IPC handlers.
- `TECH-ELECTRON-IPC-002` MUST NOT expose arbitrary shell execution, unrestricted IPC, or raw filesystem access to renderers.
- `TECH-ELECTRON-IPC-003` SHOULD retain context isolation and sandboxing; any required exception needs explicit assessment.

## Validation

Attempt invalid payloads, untrusted sender frames, path traversal, unexpected navigation, and requests from a compromised renderer model.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://www.electronjs.org/docs/latest/tutorial/security)
