---
id: DS-STATUSTEXT
status: baseline
scope: design-system
triggers:
  - "status wording"
  - "workflow label"
  - "state text"
---

# Status Language Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use the domain state machine's approved terms and distinguish status from action labels.

## Why

Users should see the same state name in lists, details, filters, history, and notifications.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
domainState -> { label, description, semanticTone, allowedTransitions }
actionVerb -> transitionRequest
```

## Store Implementation

The domain/server owns state codes; a presentation map owns localized labels without redefining transitions.

## Rules

- **DS-STATUSTEXT-001** — Equivalent persisted states MUST use the same approved user-facing label across relevant surfaces.
- **DS-STATUSTEXT-002** — State labels MUST describe current confirmed state rather than a requested future transition.
- **DS-STATUSTEXT-003** — Unknown states MUST receive an explicit safe fallback and diagnostic path.
- **DS-STATUSTEXT-004** — Domain state changes MUST update dependent labels, filters, messages, tests, and documentation together.

## Accessibility

Status must be understandable in text independent of color or icon.

## Security and Permissions

Approval, verification, and completion wording must only describe authoritative outcomes.

## Validation

Review every supported state and transition across list, detail, filters, history, and feedback.

## Related Patterns

- [status-chip-pattern ](../components/data-display/status-chip-pattern.md)
- [timeline-pattern ](../components/data-display/timeline-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
