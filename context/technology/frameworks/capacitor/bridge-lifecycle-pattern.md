---
id: TECH-CAP-BRIDGE
status: baseline
scope: "Capacitor; applicable only when enabled by the application profile"
triggers:
  - "Capacitor plugin"
  - "biometric"
  - "native permission"
---

# Capacitor Native Bridge and Lifecycle

## Guidelines

Wrap native features behind the application's platform boundary and specify web/unsupported fallbacks.

## Why

A web workflow can fail or disclose data when native permissions, storage, or process lifecycle differ.

## Structure

```text
Pseudocode:
feature request -> detect supported platform/capability
-> explain native permission when needed -> invoke approved plugin
-> map success/cancel/deny/unavailable -> workflow state
listener owner -> remove subscription on teardown
```

## Implementation

Check the installed plugin API and compatibility with the Capacitor/native target versions. A biometric success unlocks a local operation; server authentication/authorization still follow the application policy. Verify device storage classification before using preferences or plugin persistence.

## Rules

- `TECH-CAP-BRIDGE-001` MUST define unavailable, denied, canceled, and failed outcomes for native calls.
- `TECH-CAP-BRIDGE-002` MUST NOT treat local biometric success as a replacement for server authorization.
- `TECH-CAP-BRIDGE-003` MUST clean up native listeners according to the plugin's lifecycle contract.

## Validation

Test on a real supported device or appropriate emulator: permission denied, no enrollment, cancellation, background/resume, web fallback, and expired server session.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://capacitorjs.com/docs/apis)
