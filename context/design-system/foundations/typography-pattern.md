---
id: DS-TYPE
status: baseline
scope: design-system
triggers:
  - "font"
  - "heading"
  - "text scale"
---

# Typography Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Use named text roles for page titles, section headings, body, labels, supporting text, and numeric data.

## Why

Text roles communicate hierarchy consistently while semantic structure remains available to assistive technology.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
Text(role: sectionTitle, semanticLevel: 2, content: title)
Text(role: supporting, content: helper)
```

## Store Implementation

Typography is theme configuration, not feature state. Keep user text-size preferences outside individual controls.

## Rules

- **DS-TYPE-001** — Visual text roles MUST come from the active theme; components MUST NOT create a page-specific scale without a documented need.
- **DS-TYPE-002** — Heading levels MUST express document structure independently of visual font size.
- **DS-TYPE-003** — Important content MUST remain reachable under text scaling; truncation requires a usable way to read the full value.
- **DS-TYPE-004** — Numeric columns SHOULD use readable alignment and formatting without altering underlying precision.

## Accessibility

Check long labels, browser zoom or platform text enlargement, line spacing, and selectable text where appropriate.

## Security and Permissions

Do not embed confidential full values in hidden tooltip content merely to support truncation.

## Validation

Review page hierarchy and overflow with short and long content at enlarged text sizes.

## Related Patterns

- [spacing-pattern ](spacing-pattern.md)
- [labels-pattern ](../content-patterns/labels-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
