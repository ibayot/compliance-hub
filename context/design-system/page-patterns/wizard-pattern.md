---
id: DS-WIZARD
status: baseline
scope: design-system
triggers:
  - "multi-step form"
  - "wizard"
  - "stepper"
---

# Wizard and Stepper Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a wizard when a task benefits from staged decisions; keep completion, optionality, and navigation explicit.

## Why

Step structure helps complex tasks only when users can understand progress and recover their work.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Wizard(stepIds, currentStep, draft, validation)
Step(content, status)
Actions(back, next, finalSubmit)
```

## Store Implementation

The workflow owns the complete draft and completed-step validity; a step owns transient presentation. Server checkpoints require an explicit draft contract.

## Rules

- **DS-WIZARD-001** — Steps MUST have stable identity and explicit optional/skipped/completed states.
- **DS-WIZARD-002** — Next and final submission MUST validate the appropriate scope without losing other step values.
- **DS-WIZARD-003** — Backtracking or earlier edits MUST invalidate dependent steps where necessary.
- **DS-WIZARD-004** — Leaving/reopening, refresh, and draft recovery MUST be defined.
- **DS-WIZARD-005** — A final review SHOULD expose material consequences before irreversible completion.

## Accessibility

Announce current step/progress, move focus to a meaningful step heading, and provide keyboard back/next controls.

## Security and Permissions

Authorize step data and final transitions; client completion flags cannot authorize workflow advancement.

## Validation

Test backtracking, dependency changes, optional steps, server rejection, refresh policy, final duplicate submit, and keyboard use.

## Related Patterns

- [form-submission-pattern ](../interaction-patterns/form-submission-pattern.md)
- [unsaved-changes-pattern ](../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
