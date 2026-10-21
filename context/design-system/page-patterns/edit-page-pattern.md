---
id: DS-EDITPAGE
status: baseline
scope: design-system
triggers:
  - "edit form"
  - "update page"
  - "modify record"
---

# Edit Page Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Load a trustworthy baseline, expose editable versus read-only fields, and preserve drafts through recoverable failures.

## Why

Editing requires both original values and a policy for changes made elsewhere while the user works.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
loadAuthorizedRecord -> baseline(version) -> draft
save(draft, version) -> confirmedRecord | validation | conflict
```

## Store Implementation

The form owns baseline/draft/dirty state; the query owner owns confirmed data; the server owns version/conflict resolution.

## Rules

- **DS-EDITPAGE-001** — The form MUST initialize/reset intentionally when the record identity changes.
- **DS-EDITPAGE-002** — Background refresh MUST NOT overwrite meaningful unsaved edits.
- **DS-EDITPAGE-003** — Editable fields MUST match current capability and domain transition rules.
- **DS-EDITPAGE-004** — Concurrent modification MUST follow an explicit conflict policy.
- **DS-EDITPAGE-005** — Save/cancel/reset MUST have distinct documented effects.

## Accessibility

Make read-only values reviewable, errors associated, action labels specific, and focus recovery predictable.

## Security and Permissions

Reject unauthorized field mutations server-side even if the UI made those fields read-only.

## Validation

Test refresh during dirty edits, switched records, stale version, permission loss, validation, save, and reset/cancel.

## Related Patterns

- [form-submission-pattern ](../interaction-patterns/form-submission-pattern.md)
- [unsaved-changes-pattern ](../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
