---
id: DS-SWITCH
status: baseline
scope: design-system
triggers:
  - "toggle"
  - "immediate setting"
---

# Switch Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a switch for an on/off setting. State explicitly whether it saves immediately or belongs to a submitted form.

## Why

A switch suggests a state change; ambiguous persistence creates false confidence.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Switch(label: 'Enable notifications', checked: setting.enabled, busy: saving)
onToggle -> saveOrUpdateForm(next)
```

## Store Implementation

Immediate settings use server-confirmed state plus a pending transition; form settings use form-owned values.

## Rules

- **DS-SWITCH-001** — The label MUST describe the controlled setting rather than an ambiguous action.
- **DS-SWITCH-002** — Immediate persistence MUST expose pending and failed states and recover to a truthful value.
- **DS-SWITCH-003** — Form-bound switches MUST NOT secretly save outside the form's submission contract.
- **DS-SWITCH-004** — Permission-restricted switches MUST have defined hidden/read-only/disabled behavior.

## Accessibility

Expose label, checked state, busy state where supported, and keyboard operation.

## Security and Permissions

Recheck capability and setting scope on persistence; do not trust a disabled UI.

## Validation

Test toggle success, network failure, rapid toggling, denied permission, and stale server values.

## Related Patterns

- [checkbox-pattern ](checkbox-pattern.md)
- [optimistic-update-pattern ](../../interaction-patterns/optimistic-update-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
