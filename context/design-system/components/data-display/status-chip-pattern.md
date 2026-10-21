---
id: DS-STATUS
status: baseline
scope: design-system
triggers:
  - "status chip"
  - "badge"
  - "status label"
---

# Status Chip and Badge Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Map domain states to consistent labels, semantic tones, and optional icons; distinguish status from notification counts.

## Why

Visual status must reflect a known domain state rather than an ad hoc page interpretation.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
statusPresentation = mapDomainState(serverState)
StatusChip(label, tone, icon?)
CountBadge(value, maximumDisplay, accessibleLabel)
```

## Store Implementation

The server/domain owns status; presentation derives from a central map. Counts derive from their source query and freshness policy.

## Rules

- **DS-STATUS-001** — Each domain status MUST map to an approved label and semantic treatment.
- **DS-STATUS-002** — Unknown states MUST have a safe explicit fallback and must not appear as success.
- **DS-STATUS-003** — Color MUST NOT be the only status indication.
- **DS-STATUS-004** — Interactive filters and passive status chips MUST have distinct semantics.
- **DS-STATUS-005** — Truncated/capped counts MUST remain truthful and explain their scope where needed.

## Accessibility

Provide readable text, meaningful count names, contrast, and keyboard behavior only when interactive.

## Security and Permissions

Do not imply approval/verification from local optimistic state before authoritative confirmation.

## Validation

Test every state, unknown states, long labels, zero/capped counts, themes, and denied metadata.

## Related Patterns

- [status-language-pattern ](../../content-patterns/status-language-pattern.md)
- [color-pattern ](../../foundations/color-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
