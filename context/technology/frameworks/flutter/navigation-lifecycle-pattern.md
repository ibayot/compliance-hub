---
id: TECH-FLUTTER-NAV
status: baseline
scope: "Flutter; applicable only when enabled by the application profile"
triggers:
  - "Flutter navigation"
  - "deep link"
  - "resume"
---

# Flutter Navigation and Lifecycle

## Guidelines

Treat navigation, deep links, restoration, and native interruptions as inputs to the same workflow.

## Why

Resuming or opening a deep link can bypass assumptions made during a normal screen sequence.

## Structure

```text
Pseudocode:
launch/deep link -> parse route -> authenticate -> authorize resource
               -> fetch fresh state -> render target
resume -> reconcile expired session and stale state
leave dirty form -> apply approved unsaved-change behavior
```

## Implementation

Use the established router and lifecycle APIs supported by the installed SDK. Check widget liveness before post-await UI work. Never treat a route parameter as proof of resource access. Define permission-denial and app-background recovery.

## Rules

- `TECH-FLUTTER-NAV-001` MUST authorize deep-linked records using the same domain policy as normal navigation.
- `TECH-FLUTTER-NAV-002` MUST avoid updating disposed UI after asynchronous completion.
- `TECH-FLUTTER-NAV-003` MUST define dirty-form, session-expiry, and resume behavior for workflows affected.

## Validation

Test cold/warm deep links, background during submission, app resume after expiry, back navigation, and disposed widgets.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://docs.flutter.dev/ui/navigation)
