---
id: DS-WEB-UX
status: baseline
scope: browser interface and workflow composition
triggers: ["web UI", "browser usability", "web redesign"]
---

# Web UI and UX

## Guidelines

Start with the user's task, entry points and outcome. For each page, identify the primary action, supporting information, allowed variations and the content that must remain readable as the available space changes. Use the application profile for audience, supported browsers, themes, density, breakpoints and visual direction.

## Why

A page can look consistent while losing the user's place, hiding a required action, or applying a different operation in a narrower layout. Compose page and component patterns around the complete task.

## Structure

Illustrative layout and state, independent of framework.

~~~text
shell: current location and available destinations
page: title + primary action + supporting actions
work area: filters/context + results/detail + outcome/recovery
return: restore safe list state and meaningful focus
~~~

| Task | Compose these patterns |
| --- | --- |
| Find or compare records | [List page](list-page-pattern.md), [table](../components/data-display/table-pattern.md), [list loading](../interaction-patterns/list-loading-pattern.md) |
| Open, act on, and return from a record | [Detail page](detail-page-pattern.md), [breadcrumbs](../components/navigation/breadcrumbs-pattern.md), [action menu](../components/actions/action-menu-pattern.md) |
| Create, edit, or configure | [Edit page](edit-page-pattern.md), [settings](settings-page-pattern.md), [form submission](../interaction-patterns/form-submission-pattern.md); add [select](../components/inputs/select-pattern.md), [file picker](../components/inputs/file-picker-pattern.md), or the exact input in use |
| Read a dashboard or report | [Dashboard](dashboard-pattern.md), [reporting](../../domain/reporting-pattern.md), [responsive breakpoints](../foundations/responsive-breakpoint-pattern.md) |
| Review a document | [Document preview](../components/data-display/document-preview-pattern.md), [preview access and versioning](../../security/files/preview-replacement-pattern.md) |

## Store Implementation

The shell owns global navigation and preferences. The page owns filters, visible panels and selection. Store safe, shareable navigation state in the route when it helps link, reload or return behavior. Scope other retained state to its view and account. The form owns the draft and submission state. The query layer owns results and freshness. Server authorization and business outcomes remain authoritative.

## Rules

- **DS-WEB-UX-001** — A page MUST preserve the task, location and permitted primary action across supported layout modes. Put secondary actions in a predictable location and give alternate entry points an intelligible return or recovery path.
- **DS-WEB-UX-002** — Where a list-to-detail journey supports returning to the previous results, it MUST restore the applicable safe filters, ordering and selection or position without displaying another view's or account's stale results.
- **DS-WEB-UX-003** — When a dashboard selection filters other views, it MUST make the active selection and reset discoverable by pointer and keyboard. Dependent panels MUST report the same active scope, including their loading, empty and error states.

## Accessibility

Verify meaningful titles and landmarks, ordered headings, sensible focus on navigation, visible focus, readable text under zoom and resizing, and reachable controls without hover. Check each supported theme with actual text, interactive states and data.

## Security and Permissions

Persist or share only the route/filter state allowed by policy. Preserve permissions, validation and confirmation when an action moves. Browser visibility does not grant access.

## Validation

Start on a direct link and also arrive from a filtered list. Complete a permitted action, then return and confirm focus and result context. Use realistic long content and representative large, short, empty and unavailable datasets. Check keyboard navigation, zoom, intermediate widths, and multi-panel loading or failure. For substantive changes, use the [measured interface quality guide](../../quality/ui-quality-pattern.md).

## Related Patterns

- [Application navigation](../components/navigation/application-navigation-pattern.md)
- [Button and action hierarchy](../components/actions/button-pattern.md)
- [Error state](../components/feedback/error-state-pattern.md)
- [Web platform](../../platforms/web/INDEX.md), when enabled by the application profile
