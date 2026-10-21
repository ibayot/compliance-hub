---
id: DS-SELECT
status: baseline
scope: design-system
triggers:
  - "dropdown"
  - "single select"
  - "fixed options"
---

# Select Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use a select for choosing a known option from a compact list; use a searchable select for large or remote lists.

## Why

Consistent option identity and empty-value handling avoid mismatched labels and accidental submissions.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Select(label, value: stableIdOrNull, options: [{id, label, disabled}], onChange)
```

## Store Implementation

The form owns the selected ID. Option loading belongs to the relevant query/cache owner; derive the displayed label.

## Rules

- **DS-SELECT-001** — Selections MUST persist stable option identifiers rather than display labels or array positions.
- **DS-SELECT-002** — Empty, clearable, required, loading, no-options, and invalid-saved-value states MUST be defined.
- **DS-SELECT-003** — Changing options MUST NOT silently replace a saved selection with a different value.
- **DS-SELECT-004** — Options unavailable due to authorization MUST NOT be exposed merely as disabled choices unless disclosure is permitted.

## Accessibility

Use native/platform select semantics where suitable; associate label/errors and test keyboard interaction.

## Security and Permissions

The server must validate option existence, scope, permission, and current availability.

## Validation

Test empty lists, duplicate labels, stale values, unavailable options, long labels, and keyboard selection.

## Related Patterns

- [searchable-select-pattern ](searchable-select-pattern.md)
- [field-error-pattern ](../feedback/field-error-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
