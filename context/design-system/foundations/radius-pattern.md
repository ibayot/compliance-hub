---
id: DS-RADIUS
status: baseline
scope: design-system
triggers:
  - "radius"
  - "rounded corners"
  - "shape"
---

# Corner Radius Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a limited semantic radius scale for controls, containers, and transient surfaces.

## Why

Consistent shape connects components without letting arbitrary rounding imply new behavior.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
shape = tokens.radius[control | container | overlay | badge]
```

## Store Implementation

Radius is theme configuration and needs no component store.

## Rules

- **DS-RADIUS-001** — Equivalent component classes MUST use the same radius role unless the design profile defines a named variant.
- **DS-RADIUS-002** — Shape MUST NOT be the only cue for status, selection, or destructive meaning.
- **DS-RADIUS-003** — Clipping caused by rounded containers MUST NOT hide focus indicators or required content.

## Accessibility

Check focus outlines and high-contrast behavior near clipped edges.

## Security and Permissions

Do not use shape to imply a stronger security or verification guarantee.

## Validation

Compare buttons, fields, cards, dialogs, and badges at their actual nesting boundaries.

## Related Patterns

- [border-pattern ](border-pattern.md)
- [elevation-pattern ](elevation-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
