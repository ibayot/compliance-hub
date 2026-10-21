---
id: DS-INDEX
status: baseline
scope: context-navigation
triggers:
  - "design system context"
---

# Design System Context

Load the smallest relevant element, interaction, and page patterns selected by MASTER. This catalog is a navigation aid; it is not an instruction to preload all UI documentation.

## Working rules

- **DS-CATALOG-001** — UI consistency work MUST preserve workflow semantics, permissions, data contracts, accessibility, and supported responsive modes.
- **DS-CATALOG-002** — Work MUST use the active profile's framework, theme, and implementation map; do not introduce a new component library or numerical token scale through documentation alone.
- **DS-CATALOG-003** — Illustrative pseudocode in these patterns MUST NOT be represented as an existing importable shared component.
- **DS-CATALOG-004** — A reusable exception or new variant MUST have an explicit reason, scope, and validation; observed legacy differences are not automatically approved variants.

## Focused catalogs

- [UI foundations](foundations/INDEX.md)
- [Element components](components/INDEX.md)
- [Interaction patterns](interaction-patterns/INDEX.md)
- [Page patterns](page-patterns/INDEX.md)
- [Content patterns](content-patterns/INDEX.md)
- [Application-wide UI principles](../foundations/ui-principles.md)
- [Accessibility principles](../foundations/accessibility.md)
- [Active application profile](../application/PROFILE.md)
- [Security context](../security/INDEX.md)

## Existing implementation evidence

The following repository paths were inspected while bootstrapping context. They are starting points for verification, not certification that existing implementations meet every baseline:

- [Theme and layout modes](../../frontend/src/lib/theme.ts): current semantic palette, typography, component overrides, and layout-specific breakpoints.
- [Searchable select](../../frontend/src/components/SearchableSelect.tsx): current single/multiple selection wrapper and stable option values.
- [Ticket image dropzone](../../frontend/src/components/TicketImageDropzone.tsx): current image-selection limits and controlled selected-file array. It is a domain-specific selector, not a claim of a universal upload service.
- [Responsive table](../../frontend/src/components/layout/ResponsiveTable.tsx): current horizontally scrollable table container and scroll controls.

## Pattern anatomy

Element patterns use Guidelines, Why, Structure, Store Implementation, and Rules, followed by Accessibility, Security and Permissions, Validation, and Related Patterns. Structure examples are framework-neutral pseudocode. State ownership explicitly separates local interaction, form drafts, query/cache data, application coordination, and authoritative server state.

## Consistency review

Choose the exact controls/workflows in scope; capture representative existing usages; compare semantic variants and state coverage against selected rule IDs; record defects with file evidence; propose scoped migration; verify only the affected behaviors and shared consumers. Document-only adoption does not constitute a UI migration or a completed security/accessibility audit.
