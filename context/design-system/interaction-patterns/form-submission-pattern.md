---
id: DS-FORMSUBMIT
status: baseline
scope: design-system
triggers:
  - "submit"
  - "save form"
  - "validation"
---

# Form Submission Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use one explicit submission contract with validation, pending state, confirmed outcome, and recoverable failure.

## Why

Consistent submission prevents lost drafts, duplicate effects, and false success feedback.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
submit -> validateDraft -> pending -> serverMutation
success -> reconcileSavedData -> feedback -> documentedNavigation
failure -> preserveDraft -> fieldOrFormErrors
```

## Store Implementation

The form owns draft, touched/dirty/errors; the mutation owner owns pending/outcome. The server owns persisted truth.

## Rules

- **DS-FORMSUBMIT-001** — Submission MUST validate client-visible constraints and still handle authoritative server rejection.
- **DS-FORMSUBMIT-002** — Pending state MUST prevent accidental duplicate effects; the server must protect operations requiring idempotency.
- **DS-FORMSUBMIT-003** — Failed submission MUST preserve correctable values and provide field or form-level feedback.
- **DS-FORMSUBMIT-004** — Success feedback/navigation MUST follow confirmed persistence.
- **DS-FORMSUBMIT-005** — Reset, cancel, navigation, and reopening MUST have documented draft behavior.

## Accessibility

Support keyboard submission, label inputs, associate errors, and focus the first relevant error or summary predictably.

## Security and Permissions

Reauthorize mutations server-side; do not log confidential draft values.

## Validation

Exercise valid/invalid, server field/form failures, timeout with unknown outcome, double submit, cancel, and reopen.

## Related Patterns

- [button-pattern ](../components/actions/button-pattern.md)
- [field-error-pattern ](../components/feedback/field-error-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
