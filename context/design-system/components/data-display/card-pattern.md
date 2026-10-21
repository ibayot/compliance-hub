---
id: DS-CARD
status: baseline
scope: design-system
triggers:
  - "card"
  - "summary panel"
  - "dashboard tile"
---

# Card Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a card to group one coherent entity or topic, with a clear heading and deliberate action hierarchy.

## Why

Consistent card anatomy prevents every dashboard tile from becoming a different navigation model.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Card(heading, summary, status?, metadata?, actions?)
```

## Store Implementation

Cards consume entity/query state. Avoid a card-specific copied record or independent fetching when a page already owns that data.

## Rules

- **DS-CARD-001** — Cards MUST have a clear content relationship and meaningful heading.
- **DS-CARD-002** — Clickable surfaces MUST use valid link/button semantics and avoid nested interactive targets.
- **DS-CARD-003** — Action order and metadata placement MUST follow equivalent card patterns.
- **DS-CARD-004** — Fixed heights MUST NOT clip material content, errors, or enlarged text.

## Accessibility

Preserve semantic headings, keyboard actions, focus visibility, and reading order.

## Security and Permissions

Card summaries must obey the same data access and redaction rules as detail pages.

## Validation

Test long text, missing metadata, status variants, keyboard navigation, and responsive grids.

## Related Patterns

- [metadata-pattern ](metadata-pattern.md)
- [button-pattern ](../actions/button-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
