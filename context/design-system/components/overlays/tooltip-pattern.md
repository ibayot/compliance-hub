---
id: DS-TOOLTIP
status: baseline
scope: design-system
triggers:
  - "tooltip"
  - "hover help"
---

# Tooltip Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use tooltips for supplementary descriptions of otherwise understandable controls.

## Why

Supplementary help should clarify an action without becoming a hidden prerequisite.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Tooltip(text: supplementaryDescription, trigger: namedControl)
```

## Store Implementation

Visibility/timing is local presentation state; tooltips own no application data.

## Rules

- **DS-TOOLTIP-001** — Essential instructions, errors, and consequential information MUST remain available outside a tooltip.
- **DS-TOOLTIP-002** — Tooltips MUST be discoverable through keyboard focus as well as pointer hover where appropriate.
- **DS-TOOLTIP-003** — Interactive content MUST use an appropriate popover/dialog rather than a tooltip.
- **DS-TOOLTIP-004** — Tooltip text MUST avoid duplicating the control's name as a noisy repeated announcement.

## Accessibility

Associate descriptions correctly and provide dismissal, persistence, and hover/focus behavior under the selected accessibility target.

## Security and Permissions

Do not reveal sensitive full text through a tooltip when the visible value was intentionally redacted.

## Validation

Test keyboard focus, Escape, zoom, viewport edges, long text, and touch alternatives.

## Related Patterns

- [icon-button-pattern ](../actions/icon-button-pattern.md)
- [popover-pattern ](popover-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
