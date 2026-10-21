---
id: DS-TEXTAREA
status: baseline
scope: design-system
triggers:
  - "multiline text"
  - "description"
  - "comment field"
---

# Textarea Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a multiline field for plain-text paragraphs; reserve rich text for workflows that need formatting.

## Why

Consistent sizing and limits make longer content manageable without hiding validation or submission actions.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Textarea(label: 'Description', value: form.description, rows: initialRows, resize: supported)
Counter(remaining: limit - measuredLength)
```

## Store Implementation

The form owns content and validation. Local state may track composition/focus; do not autosave unless the workflow defines it.

## Rules

- **DS-TEXTAREA-001** — Line breaks MUST survive normal editing and submission according to the domain contract.
- **DS-TEXTAREA-002** — Length limits MUST agree with the authoritative API/database constraints and character-counting policy.
- **DS-TEXTAREA-003** — Growing or resizable content MUST keep errors and actions reachable.
- **DS-TEXTAREA-004** — Autosave and unsaved-change behavior MUST be explicit rather than inferred from the control.

## Accessibility

Provide a label, instructions, keyboard access, readable line lengths, and usable text enlargement.

## Security and Permissions

Render submitted plain text safely; never treat textarea content as trusted HTML.

## Validation

Test pasted paragraphs, Unicode, line endings, limit boundaries, resize behavior, and failed submission.

## Related Patterns

- [text-field-pattern ](text-field-pattern.md)
- [unsaved-changes-pattern ](../../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
