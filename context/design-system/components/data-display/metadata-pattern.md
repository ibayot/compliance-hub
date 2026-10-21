---
id: DS-METADATA
status: baseline
scope: design-system
triggers:
  - "label value"
  - "record metadata"
  - "summary details"
---

# Metadata and Label-Value Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Present structured facts using consistent labels, value formatting, missing-value treatment, and ordering.

## Why

Predictable metadata prevents users from interpreting absent, unknown, hidden, and zero values as the same thing.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
MetadataList([{label, value: format(value), availability: known | absent | restricted}])
```

## Store Implementation

Consume server/domain facts; derive formatted values. Do not persist display strings as canonical data.

## Rules

- **DS-METADATA-001** — Labels and value formatting MUST follow application terminology and locale policy.
- **DS-METADATA-002** — Missing, unknown, restricted, zero, and false values MUST have deliberate distinct treatment.
- **DS-METADATA-003** — Copyable values MUST copy the intended value and communicate the outcome.
- **DS-METADATA-004** — Long values MUST remain available through an authorized accessible mechanism.

## Accessibility

Use meaningful label-value structure and readable ordering under narrow layouts and text enlargement.

## Security and Permissions

Redaction rules apply to copied text, tooltips, accessibility names, and exports as well as visible values.

## Validation

Test each missing-value case, long values, copy failure, locale formats, and restricted content.

## Related Patterns

- [date-and-number-format-pattern ](../../content-patterns/date-and-number-format-pattern.md)
- [card-pattern ](card-pattern.md)
- [Active application profile](../../../application/PROFILE.md)
- [Security context](../../../security/INDEX.md)
