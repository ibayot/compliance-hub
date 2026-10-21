---
id: DS-ICON
status: baseline
scope: design-system
triggers:
  - "icon"
  - "symbol"
  - "iconography"
---

# Icon Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use an approved icon family with consistent size, stroke, alignment, and meaning.

## Why

Stable symbols reduce ambiguity; labels remain necessary when the meaning is unfamiliar or consequential.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Icon(symbol: approvedSymbol, decorative: true)
IconButton(label: actionName, symbol: approvedSymbol)
```

## Store Implementation

Icons reflect existing domain or interaction state; they do not own a second status value.

## Rules

- **DS-ICON-001** — The same action or status MUST use the same approved symbol within an application scope.
- **DS-ICON-002** — An icon-only action MUST expose an accessible name describing its effect.
- **DS-ICON-003** — Decorative icons MUST NOT add duplicate names or announcements.
- **DS-ICON-004** — Ambiguous or high-consequence actions SHOULD include visible text.

## Accessibility

Check recognizable symbols, directional semantics, text alternatives, contrast, and scaling.

## Security and Permissions

Do not represent verified or secure state from an icon's presence alone.

## Validation

Inspect names, visual consistency, state changes, and right-to-left behavior where supported.

## Related Patterns

- [icon-button-pattern ](../components/actions/icon-button-pattern.md)
- [status-chip-pattern ](../components/data-display/status-chip-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
