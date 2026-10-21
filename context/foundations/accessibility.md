---
id: FND-A11Y
status: baseline
scope: foundations
triggers:
  - "interactive UI"
  - "accessibility review"
  - "visual consistency"
---

# Accessibility Principles

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use semantic controls, predictable focus, readable content, and equivalent keyboard interaction. Record the application's selected accessibility target in its profile before claiming conformance.

## Why

An interface is usable only when people can perceive, operate, and understand its full workflows.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
workflow -> semantic control -> accessible name -> input/focus behavior -> state announcement
```

## Store Implementation

Keep focus references local. Announce asynchronous status through the platform's accessibility mechanism without duplicating business state.

## Rules

- **FND-A11Y-001** — Interactive controls MUST expose an appropriate role, name, value, and state.
- **FND-A11Y-002** — All required actions MUST be operable without pointer-only gestures; provide an alternative to drag, hover, and swipe.
- **FND-A11Y-003** — Focus MUST remain visible and follow a meaningful sequence; overlays MUST restore focus to an appropriate trigger or successor.
- **FND-A11Y-004** — Status, validation, and priority MUST NOT rely on color alone.
- **FND-A11Y-005** — Conformance claims MUST name a target and include supporting checks; an automated scan alone is insufficient.

## Accessibility

Test actual tasks with keyboard and assistive technology; check zoom, text enlargement, contrast, reduced motion, and platform settings.

## Security and Permissions

Do not announce confidential values to unrelated live regions or duplicate hidden sensitive content for styling.

## Validation

Exercise a complete task using keyboard; inspect accessible names and errors; combine automated findings with manual review.

## Related Patterns

- [ui-principles ](ui-principles.md)
- [focus-indicator-pattern ](../design-system/foundations/focus-indicator-pattern.md)
- [Active application profile](../application/PROFILE.md)
- [Security context](../security/INDEX.md)
