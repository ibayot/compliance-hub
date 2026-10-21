---
id: DS-ERRORTEXT
status: baseline
scope: design-system
triggers:
  - "error wording"
  - "safe failure message"
  - "support code"
---

# Error Message Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

State what failed at the user's task level and give a safe next step.

## Why

Consistent error language helps recovery without exposing implementation internals.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
errorClass -> safeTitle + affectedTask + nextAction + supportReference?
privateDiagnostic -> restrictedLog
```

## Store Implementation

Error classification belongs to the boundary/operation owner; rendered wording is presentation.

## Rules

- **DS-ERRORTEXT-001** — Messages MUST distinguish recoverable validation, access, conflict, missing, transient, and unknown-outcome cases.
- **DS-ERRORTEXT-002** — Raw stack traces, queries, tokens, storage paths, and internal hostnames MUST NOT appear in user-facing errors.
- **DS-ERRORTEXT-003** — Retry instructions MUST reflect whether repeating the operation is safe.
- **DS-ERRORTEXT-004** — A support reference SHOULD correlate with diagnostics without containing confidential payloads.

## Accessibility

Keep text concise, persistent when essential, and associated with an accessible recovery action.

## Security and Permissions

Apply response-disclosure policy; do not reveal protected existence through overly specific wording.

## Validation

Test known/unknown errors, redaction, support references, narrow layout, and recovery semantics.

## Related Patterns

- [error-state-pattern ](../components/feedback/error-state-pattern.md)
- [retry-and-recovery-pattern ](../interaction-patterns/retry-and-recovery-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
