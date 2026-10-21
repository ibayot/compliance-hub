---
id: DS-LABEL
status: baseline
scope: design-system
triggers:
  - "label"
  - "button text"
  - "field name"
---

# Labels and Action Naming Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use stable domain terms and concise labels that identify the field or action in context.

## Why

Consistent words connect navigation, forms, details, notifications, and documentation.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
FieldLabel(approvedConceptName)
ActionLabel(verb + objectWhenNeeded)
AccessibleName(action + recordContextWhenNeeded)
```

## Store Implementation

Labels derive from approved terminology/localization resources; do not store localized labels as business identifiers.

## Rules

- **DS-LABEL-001** — Equivalent concepts MUST use the same approved term unless audience context requires a documented synonym.
- **DS-LABEL-002** — Action labels MUST describe the action or destination rather than generic 'OK' or 'Click here'.
- **DS-LABEL-003** — Field labels MUST persist when values are entered; placeholders are examples, not labels.
- **DS-LABEL-004** — Accessible names MUST remain consistent with visible text and include disambiguating context when necessary.

## Accessibility

Keep labels understandable out of visual context and support translated word order and text expansion.

## Security and Permissions

Do not expose private object names in globally repeated labels or announcements.

## Validation

Review repeated concepts across pages, translation expansion, screen-reader names, and icon-only actions.

## Related Patterns

- [content-guidelines ](../../foundations/content-guidelines.md)
- [button-pattern ](../components/actions/button-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
