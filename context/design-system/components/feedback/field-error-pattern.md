---
id: DS-FIELDERROR
status: baseline
scope: design-system
triggers:
  - "validation error"
  - "field error"
  - "form errors"
---

# Field Error Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Place concise errors beside the affected input and preserve user values for correction.

## Why

Errors are useful when they identify both the problem and the next valid action.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Field(label, input, help, error: errors[fieldId])
SubmitFailure -> focusFirstInvalidOrSummary()
```

## Store Implementation

The form owns client/server field errors and touched/submitted state. Derive invalid presentation rather than duplicating it in each child.

## Rules

- **DS-FIELDERROR-001** — Errors MUST be associated with the affected input or a clear form-level summary.
- **DS-FIELDERROR-002** — Server errors MUST be mapped to known fields or retained as form-level failures.
- **DS-FIELDERROR-003** — Validation timing MUST avoid premature interruption while still preventing invalid submission.
- **DS-FIELDERROR-004** — Clearing an error MUST follow a relevant edit/revalidation or confirmed outcome; unrelated renders MUST NOT erase it.

## Accessibility

Use text plus invalid state, associate error descriptions, and make validation focus changes predictable.

## Security and Permissions

Do not expose raw backend messages that reveal private data, internal schemas, or authorization details.

## Validation

Test multiple errors, server-only errors, correction, untouched fields, keyboard submission, and retained values.

## Related Patterns

- [text-field-pattern ](../inputs/text-field-pattern.md)
- [form-submission-pattern ](../../interaction-patterns/form-submission-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
