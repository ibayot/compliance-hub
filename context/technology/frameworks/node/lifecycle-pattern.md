---
id: TECH-NODE-LIFE
status: baseline
scope: "Node.js Runtime; applicable only when enabled by the application profile"
triggers:
  - "startup"
  - "shutdown"
  - "event loop"
---

# Node Process Lifecycle

## Guidelines

Bound work on the event loop and define a process owner for startup, signals, and cleanup.

## Why

A healthy HTTP response at idle cannot prove that CPU work or unclosed resources are safe under load.

## Structure

```text
Pseudocode:
startup -> validate configuration -> connect dependencies -> accept traffic
shutdown -> stop new work -> drain requests/jobs -> close clients -> exit
deadline -> report unfinished work -> allow supervisor to terminate
```

## Implementation

Prefer framework lifecycle hooks when the application uses a framework. Keep shutdown idempotent and bounded. Move sustained CPU-heavy work to an approved worker/process design only after identifying ownership and deployment impact.

## Rules

- `TECH-NODE-LIFE-001` MUST define cleanup for long-lived clients, listeners, and workers added by a change.
- `TECH-NODE-LIFE-002` MUST NOT run unbounded synchronous processing in request handlers.
- `TECH-NODE-LIFE-003` SHOULD test shutdown under active work instead of assuming a signal handler guarantees completion.

## Validation

Run a representative request/job during shutdown in an isolated environment. Check drain time, error reporting, open handles, and restart recovery.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://nodejs.org/en/learn/asynchronous-work/dont-block-the-event-loop)
