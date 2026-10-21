---
id: DS-COLOR
status: baseline
scope: design-system
triggers:
  - "color"
  - "theme"
  - "dark mode"
---

# Color Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Choose semantic color tokens for purpose and interaction state. Use the active application's theme as the source of actual values.

## Why

Semantic roles preserve intent across themes and prevent pages from inventing competing color meanings.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
tokens.color = { surface, text, border, action, success, warning, danger, focus }
component.color = tokens.color[action.intent]
```

## Store Implementation

No store is required for static tokens. A shared theme preference may own selected mode; components consume the theme.

## Rules

- **DS-COLOR-001** — Colors in reusable UI MUST map to documented semantic roles; isolated overrides need a recorded variant or exception.
- **DS-COLOR-002** — Status and selection MUST include a non-color indication such as text, icon, border, or checked state.
- **DS-COLOR-003** — Theme changes MUST cover normal, hover, active, focus, disabled, loading, and error states.
- **DS-COLOR-004** — Existing theme values MUST be treated as implementation evidence; this document does not replace them with new numerical values.

## Accessibility

Check foreground/background contrast in every supported mode, including overlays and disabled explanatory text.

## Security and Permissions

Visual danger styling must not substitute for confirmation, authorization, or server validation.

## Validation

Inspect representative controls and status displays in all supported themes and states.

## Related Patterns

- [typography-pattern ](typography-pattern.md)
- [status-chip-pattern ](../components/data-display/status-chip-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
