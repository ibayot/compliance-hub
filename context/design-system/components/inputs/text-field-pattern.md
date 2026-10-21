---
id: DS-TEXTFIELD
status: baseline
scope: design-system
triggers:
  - "text input"
  - "form field"
---

# Text Field Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a visible label, optional help, and a nearby error slot; distinguish required, read-only, and disabled states.

## Why

Stable field anatomy prevents inconsistent forms and keeps instructions available after typing.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Field(label, required, help, error)
  TextInput(value, onChange, autocompletePurpose)
  ErrorMessage(error)
```

## Store Implementation

The form owns the value, touched state, and validation outcome; the field owns focus and transient presentation.

## Rules

- **DS-TEXTFIELD-001** — A placeholder MUST NOT replace a persistent field label.
- **DS-TEXTFIELD-002** — Required and optional conventions MUST match the application content rules.
- **DS-TEXTFIELD-003** — Read-only and disabled MUST have different intentional behavior; read-only values should remain reviewable where appropriate.
- **DS-TEXTFIELD-004** — Normalization MUST preserve meaningful user input; destructive trimming or case changes require domain rules.
- **DS-TEXTFIELD-005** — Server validation errors MUST map back to the corresponding field without discarding unrelated values.

## Accessibility

Associate label, help, and errors programmatically; provide relevant input purpose and autocomplete behavior.

## Security and Permissions

Treat input as untrusted at the server; avoid exposing sensitive values through logs or default browser suggestions without review.

## Validation

Test empty, long, invalid, server-rejected, autofilled, disabled, and read-only input with keyboard and assistive technology.

## Related Patterns

- [field-error-pattern ](../feedback/field-error-pattern.md)
- [form-submission-pattern ](../../interaction-patterns/form-submission-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
