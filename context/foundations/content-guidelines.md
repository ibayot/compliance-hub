---
id: FND-CONTENT
status: baseline
scope: foundations
triggers:
  - "labels"
  - "messages"
  - "terminology"
  - "localization"
---

# Content and Terminology Guidelines

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Write short, task-oriented text using the application glossary. Distinguish action, status, instruction, and error language.

## Why

Consistent language prevents users from interpreting the same concept as multiple features or misunderstanding an action's consequences.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
concept -> approved term -> label/message -> context -> recovery action
```

## Store Implementation

Message rendering uses current workflow state. Keep local drafts separate from server-confirmed outcomes; do not persist translated strings as business state.

## Rules

- **FND-CONTENT-001** — UI terms MUST use the application glossary or identify an unresolved terminology decision.
- **FND-CONTENT-002** — Action labels MUST describe the action; confirmations MUST name the affected object and material consequence.
- **FND-CONTENT-003** — Success messages MUST describe an observed outcome, not an unconfirmed request.
- **FND-CONTENT-004** — User-facing text MUST NOT expose stack traces, raw queries, credentials, or internal authorization details.
- **FND-CONTENT-005** — Locale-sensitive text SHOULD support translated word order, plurals, dates, and numbers.

## Accessibility

Use meaningful labels independent of nearby visuals; avoid instructions that rely only on position, shape, or color.

## Security and Permissions

Redact sensitive identifiers from general notifications and diagnostics; retain an approved support reference when useful.

## Validation

Review normal, long, empty, plural, translated, and error text in its actual layout.

## Related Patterns

- [labels-pattern ](../design-system/content-patterns/labels-pattern.md)
- [error-message-pattern ](../design-system/content-patterns/error-message-pattern.md)
- [Active application profile](../application/PROFILE.md)
- [Security context](../security/INDEX.md)
