---
id: DS-DENIED
status: baseline
scope: design-system
triggers:
  - "forbidden"
  - "hidden action"
  - "access denied"
---

# Permission and Availability Feedback Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Distinguish unauthorized, unavailable by state, read-only, and temporarily disabled behavior.

## Why

Different causes require different presentation and recovery without disclosing protected resource details.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
capability + resourceScope + workflowState -> allowedActions
responseForbidden -> clearIncompatibleData -> safeAccessFeedback
```

## Store Implementation

Capabilities and scope belong to their authoritative session/query owner. Controls derive visibility/enabled state; server responses settle denied operations.

## Rules

- **DS-DENIED-001** — Hidden versus disabled behavior MUST be chosen according to disclosure policy and user recovery needs.
- **DS-DENIED-002** — Frontend checks MUST NOT substitute for backend resource/action authorization.
- **DS-DENIED-003** — Permission loss MUST clear or isolate incompatible visible/cached data and prevent stale actions.
- **DS-DENIED-004** — Denial feedback MUST avoid revealing restricted existence when policy requires concealment.
- **DS-DENIED-005** — Unavailable workflow actions MUST explain a safe next step when disclosure is permitted.

## Accessibility

Do not make disabled controls the only place an essential explanation can be discovered.

## Security and Permissions

Load the application's authorization context and recheck action/resource scope at execution.

## Validation

Test direct URLs, stale capabilities, cross-scope IDs, permission loss while open, hidden/disabled alternatives, and safe errors.

## Related Patterns

- [error-state-pattern ](../components/feedback/error-state-pattern.md)
- [button-pattern ](../components/actions/button-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
