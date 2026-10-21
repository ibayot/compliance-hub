---
id: DS-VALIDATIONTEXT
status: baseline
scope: design-system
triggers:
  - "validation wording"
  - "required error"
  - "constraint error"
---

# Validation Message Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Explain the problem and how to correct it using the user's field terminology.

## Why

Actionable consistent errors shorten recovery and reduce contradictory frontend/backend language.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
validationCode + safeParameters -> localizedFieldMessage
unknownCode -> safeFormMessage + supportReference
```

## Store Implementation

The form owns mapped error codes; localize on rendering. Server validation remains authoritative.

## Rules

- **DS-VALIDATIONTEXT-001** — Validation messages MUST identify the violated constraint without blaming the user.
- **DS-VALIDATIONTEXT-002** — Client and server errors for the same rule SHOULD use the same safe meaning.
- **DS-VALIDATIONTEXT-003** — Messages MUST preserve meaningful distinctions such as missing, malformed, out-of-range, conflict, and unavailable option.
- **DS-VALIDATIONTEXT-004** — Raw backend exception text MUST NOT be passed through as a user-facing validation message.

## Accessibility

Associate messages with inputs and use predictable summary/focus behavior after submission.

## Security and Permissions

Messages must avoid exposing restricted existence or sensitive submitted values.

## Validation

Test each known error code, unknown codes, plural/limit parameters, localization, and multiple errors.

## Related Patterns

- [field-error-pattern ](../components/feedback/field-error-pattern.md)
- [error-message-pattern ](error-message-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
