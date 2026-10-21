---
id: DS-SPACE
status: baseline
scope: design-system
triggers:
  - "spacing"
  - "gap"
  - "padding"
  - "layout rhythm"
---

# Spacing Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use named spacing tokens and a consistent rhythm for groups, sections, and page margins.

## Why

Spacing communicates relationships; repeated arbitrary values make the same component feel different across pages.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Stack(gap: tokens.space.related)
Section(padding: tokens.space.section, gap: tokens.space.group)
```

## Store Implementation

Spacing has no application store. Responsive layout derives from available space and profile-supported layout settings.

## Rules

- **DS-SPACE-001** — Reusable components MUST use approved spacing tokens rather than unexplained one-off values.
- **DS-SPACE-002** — Related labels, help text, and errors MUST stay visually grouped with their control.
- **DS-SPACE-003** — Layout gaps MUST remain sufficient when errors, wrapping labels, or loading indicators appear.
- **DS-SPACE-004** — Density variants MUST be named and scoped; reducing spacing MUST NOT remove usable interaction targets.

## Accessibility

Check pointer targets, touch operation, visible focus, and separation between neighboring controls.

## Security and Permissions

A crowded layout must not hide security-relevant warnings or materially separate them from the action.

## Validation

Compare equivalent form sections and action groups at narrow and wide sizes.

## Related Patterns

- [sizing-pattern ](sizing-pattern.md)
- [responsive-breakpoint-pattern ](responsive-breakpoint-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
