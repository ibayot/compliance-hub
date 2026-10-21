---
id: DS-RICHTEXT
status: baseline
scope: design-system
triggers:
  - "rich text"
  - "formatted input"
  - "editor"
---

# Rich Text Editor Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use rich text only when the workflow needs structured formatting; define supported content and export behavior.

## Why

An editor introduces security, storage, accessibility, and rendering contracts beyond a multiline input.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Editor(value: approvedDocumentSchema, toolbar: approvedFormatting, onChange)
validateSchema -> sanitizeAtBoundary -> safeRenderer
```

## Store Implementation

The form owns an editor document; the editor owns selection/history state. Autosave and collaboration require explicit workflow ownership.

## Rules

- **DS-RICHTEXT-001** — The persisted schema and allowed nodes/marks MUST be documented and versioned when compatibility requires it.
- **DS-RICHTEXT-002** — Pasted content MUST pass the same allowed-content contract as toolbar-created content.
- **DS-RICHTEXT-003** — Rendered content MUST use an approved sanitization and safe-rendering boundary.
- **DS-RICHTEXT-004** — Attachments, links, autosave, and unsaved changes MUST follow their own patterns rather than bypassing them.

## Accessibility

Support keyboard editing, named formatting actions, editor labelling, focus visibility, and readable rendered output.

## Security and Permissions

Reject unsafe URLs and executable content; preserve server-side validation even when the client sanitizes.

## Validation

Test paste from external tools, malformed content, links, long documents, keyboard toolbar use, and save/reopen fidelity.

## Related Patterns

- [textarea-pattern ](textarea-pattern.md)
- [unsaved-changes-pattern ](../../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
