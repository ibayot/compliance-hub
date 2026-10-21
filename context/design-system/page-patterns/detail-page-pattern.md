---
id: DS-DETAILPAGE
status: baseline
scope: design-system
triggers:
  - "record details"
  - "view page"
  - "detail route"
---

# Detail Page Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Present identity and status first, group facts by meaning, and place permitted actions consistently.

## Why

Users should understand which record they are viewing and which transitions remain available.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
RecordHeader(identity, status, authorizedActions)
Sections(metadata, relatedContent, attachments, history)
States(loading, missing, denied, failed)
```

## Store Implementation

The route owns record identity; the query owner owns confirmed record data. Child sections either consume it or declare their independent query contracts.

## Rules

- **DS-DETAILPAGE-001** — The displayed identity MUST stay aligned with the route and loaded record during transitions.
- **DS-DETAILPAGE-002** — Actions MUST reflect current capabilities and domain state.
- **DS-DETAILPAGE-003** — Missing, denied, failed, and loading states MUST not display stale incompatible record content.
- **DS-DETAILPAGE-004** — Sections MUST have meaningful headings and consistent metadata formatting.
- **DS-DETAILPAGE-005** — Mutation success MUST reconcile affected details, lists, counts, and related sections.

## Accessibility

Use a coherent heading hierarchy, landmark structure, keyboard actions, and clear link purposes.

## Security and Permissions

Authorize each sensitive section/resource; safe detail access does not imply permission for every attachment or action.

## Validation

Test direct URL, invalid/deleted record, permission loss, stale refresh, mutation reconciliation, and long content.

## Related Patterns

- [metadata-pattern ](../components/data-display/metadata-pattern.md)
- [permission-denied-pattern ](../interaction-patterns/permission-denied-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
