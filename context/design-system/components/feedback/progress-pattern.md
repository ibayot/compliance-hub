---
id: DS-PROGRESS
status: baseline
scope: design-system
triggers:
  - "spinner"
  - "progress bar"
  - "upload progress"
---

# Progress Indicator Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use determinate progress only when the measured quantity is known; use an indeterminate indicator for unknown completion.

## Why

Truthful progress helps users distinguish ongoing work, stalled work, and completed outcomes.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Progress(label, mode: totalKnown ? determinate : indeterminate, value: measuredProgress)
OperationStatus(cancel?, retry?)
```

## Store Implementation

The operation owner keeps progress and cancellation state; the indicator consumes it. A visual completion animation is not server confirmation.

## Rules

- **DS-PROGRESS-001** — Progress MUST reflect the measured phase; uploaded bytes MUST NOT imply that server processing or persistence completed.
- **DS-PROGRESS-002** — Busy regions MUST remain identifiable and preserve useful context.
- **DS-PROGRESS-003** — Cancellation MUST state whether it stops transfer, server work, or only local observation.
- **DS-PROGRESS-004** — Long-running operations MUST have defined failure, timeout/unknown-result, and recovery behavior.

## Accessibility

Expose a meaningful name and value where available; avoid excessive live announcements for every small increment.

## Security and Permissions

Do not reveal another user's background task details; cancellation needs normal authorization.

## Validation

Test unknown totals, zero/complete values, server-processing phase, interruption, cancellation races, and reduced motion.

## Related Patterns

- [file-upload-pattern ](../../interaction-patterns/file-upload-pattern.md)
- [retry-and-recovery-pattern ](../../interaction-patterns/retry-and-recovery-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
