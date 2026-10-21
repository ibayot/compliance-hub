---
id: DS-MOTION
status: baseline
scope: design-system
triggers:
  - "animation"
  - "transition"
  - "reduced motion"
---

# Motion Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use restrained, purposeful motion to explain continuity or state changes.

## Why

Consistent motion can orient users; uncontrolled or compulsory motion can distract or block interaction.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
transition(role: enter | exit | stateChange, reducedMotion: preference)
completion -> restore stable layout
```

## Store Implementation

Animation state is local and derived from interaction state. Persist user motion preferences only at the application preference boundary.

## Rules

- **DS-MOTION-001** — Motion MUST respect the active platform's reduced-motion preference.
- **DS-MOTION-002** — Essential information and actions MUST remain available when animation is reduced or disabled.
- **DS-MOTION-003** — Animation MUST NOT delay validation, make completion look successful before confirmation, or cause duplicate actions.
- **DS-MOTION-004** — Duration and easing SHOULD use approved motion roles rather than per-page invention.

## Accessibility

Avoid flashing and unnecessary auto-motion; allow pausing where persistent movement requires it.

## Security and Permissions

Security notices must remain readable and must not disappear solely because an entrance animation completed.

## Validation

Exercise reduced-motion mode, interrupted transitions, and rapid repeated actions.

## Related Patterns

- [progress-pattern ](../components/feedback/progress-pattern.md)
- [elevation-pattern ](elevation-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
