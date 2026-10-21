---
id: TECH-REACT-EFFECT
status: baseline
scope: "React; applicable only when enabled by the application profile"
triggers:
  - "effect"
  - "subscription"
  - "event listener"
---

# Effects and Resource Cleanup

## Guidelines

Use effects to synchronize external systems and handlers for explicit user actions.

## Why

An effect used as a general computation mechanism adds extra state transitions and lifecycle risk.

## Structure

```tsx
import { useEffect } from 'react';

export function useOnlineRefresh(refresh: () => void) {
  useEffect(() => {
    window.addEventListener('online', refresh);
    return () => window.removeEventListener('online', refresh);
  }, [refresh]);
}
```

## Implementation

Subscriptions, timers, object URLs, and network requests need matching cleanup where their APIs support it. Include dependencies honestly; stabilize inputs at the correct owner rather than disabling lint. Guard against stale results when requests overlap.

## Rules

- `TECH-REACT-EFFECT-001` MUST release resources established by an effect when the owning lifecycle ends.
- `TECH-REACT-EFFECT-002` MUST NOT suppress dependency checks to conceal a stale-closure problem.
- `TECH-REACT-EFFECT-003` SHOULD compute render-derived values during rendering and perform user-triggered mutations in handlers.

## Validation

Mount/unmount, switch dependencies, and run under the application's development strict checks. Confirm no duplicate listener or late stale result.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://react.dev/learn/synchronizing-with-effects)
