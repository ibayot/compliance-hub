---
id: DS-CREATEPAGE
status: baseline
scope: design-system
triggers:
  - "new record"
  - "create form"
  - "new page"
---

# Create Page Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Guide users through required information, explicit defaults, related inputs, and a clear creation outcome.

## Why

Predictable creation avoids hidden defaults and uncertainty about whether a new record exists.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
PageHeader('Create …')
Form(groups, requiredGuidance, validation)
Actions(cancel, create)
ConfirmedOutcome(destinationOrContinuation)
```

## Store Implementation

The form owns a new draft; the server owns created identity and defaults. Draft persistence requires its own policy.

## Rules

- **DS-CREATEPAGE-001** — Defaults MUST be intentional and valid for the current user/scope.
- **DS-CREATEPAGE-002** — Creation MUST prevent duplicate effects under the operation's idempotency contract.
- **DS-CREATEPAGE-003** — Failure MUST preserve correctable input and avoid generating a second record on blind retry.
- **DS-CREATEPAGE-004** — Successful creation MUST establish the authoritative identity before navigation or follow-up actions.
- **DS-CREATEPAGE-005** — Cancel and leaving behavior MUST follow unsaved-change policy.

## Accessibility

Use grouped labels, clear required guidance, validation summary/focus, and keyboard submission.

## Security and Permissions

Server-side creation must enforce capability, allowed fields, option scopes, and ownership rules.

## Validation

Test defaults, required inputs, server rejection, timeout after creation, duplicates, cancel, and narrow form layout.

## Related Patterns

- [form-submission-pattern ](../interaction-patterns/form-submission-pattern.md)
- [unsaved-changes-pattern ](../interaction-patterns/unsaved-changes-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
