---
id: TECH-REACT-STATE
status: baseline
scope: "React; applicable only when enabled by the application profile"
triggers:
  - "component state"
  - "shared state"
  - "controlled component"
---

# React Components and State Ownership

## Guidelines

Keep one owner for each fact and derive values that can be computed from existing inputs.

## Why

Duplicated or contradictory state creates drift between controls and displayed data.

## Structure

```tsx
import { useState } from 'react';

export function LabelEditor() {
  const [label, setLabel] = useState('');
  const canSubmit = label.trim().length > 0;
  return <input aria-label="Label" value={label}
    onChange={event => setLabel(event.target.value)}
    aria-invalid={!canSubmit} />;
}
```

## Store Implementation

The snippet demonstrates ownership only; use the application's canonical input and complete form semantics. Local state owns transient interaction, form state owns editable values, server cache owns remote records, and application state owns genuinely shared client facts. Document reset behavior on record/user changes.

## Rules

- `TECH-REACT-STATE-001` MUST assign one authoritative owner to each piece of state.
- `TECH-REACT-STATE-002` MUST NOT copy derived values or cached records into independent state without a defined synchronization need.
- `TECH-REACT-STATE-003` SHOULD expose controlled variants when parent workflows must own a component's value.

## Validation

Exercise prop/record changes, empty and invalid states, and multiple component instances. Confirm reset behavior and absence of duplicate authoritative state.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://react.dev/learn/choosing-the-state-structure)
