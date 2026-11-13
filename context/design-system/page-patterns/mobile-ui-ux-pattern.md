---
id: DS-MOBILE-UX
status: baseline
scope: task design for phone-sized browser, installed web, hybrid and native surfaces
triggers: ["mobile UI", "phone usability", "small-screen workflow"]
---

# Mobile UI and UX

## Guidelines

Design around the task a person needs to complete on a phone. Keep orientation, essential information and the next action easy to find. Choose layouts by available space and task complexity. Use the same pattern across browser, installed web, hybrid or native surfaces where the workflow permits, and use the selected platform's guidance for its navigation, permissions and lifecycle.

## Why

Stacking every desktop panel can bury key controls. A pinned column, software keyboard, system inset or fixed navigation can leave too little usable space to complete a task even if the page technically fits.

## Structure

Illustrative layout and state, independent of framework.

~~~text
route: current location + reachable return
task: essential context + current decision or input
supporting content: summary -> expand or open details
action: one reachable primary control + feedback or recovery
~~~

| Task | Compose these patterns |
| --- | --- |
| Find and act on a record | [List page](list-page-pattern.md), [table](../components/data-display/table-pattern.md), [responsive actions](../interaction-patterns/responsive-actions-pattern.md). Keep a comparison grid when comparison is the task and space permits; use a focused record/date view when pinned columns crowd out the next value or action. |
| Navigate a deep screen or switch panels | [Application navigation](../components/navigation/application-navigation-pattern.md), [tabs](../components/navigation/tabs-pattern.md), [detail page](detail-page-pattern.md). Verify direct entry and return as well as navigation from within the application. |
| Enter data or attach a file | [Form submission](../interaction-patterns/form-submission-pattern.md), [file picker](../components/inputs/file-picker-pattern.md), [field errors](../components/feedback/field-error-pattern.md). Verify entry, cancellation and retry with the real picker or keyboard. |
| Configure a report or review dense detail | [Settings](settings-page-pattern.md), [report builder](../../domain/report-builder-pattern.md), [document preview](../components/data-display/document-preview-pattern.md). Give complex inputs and previews usable space; keep related controls discoverable when grouped. |

## Store Implementation

Keep route, filters, selected record, draft and submission state with the existing workflow owners. Layout state selects the presentation and never creates a second mutation or cache for the same operation. Define restoration on rotation, resize and temporary interruption. Persist drafts only when product and data policy permit it.

## Rules

- **DS-MOBILE-UX-001** — A phone layout MUST preserve essential context, the current task and authorized controls. Any alternate view of the same records MUST preserve the relevant scope, results and actions.
- **DS-MOBILE-UX-002** — Fixed or floating controls MUST account for the usable viewport, including system insets, navigation and the software keyboard. Verify they leave focused fields, feedback and the primary action reachable. Apply the [responsive shortcut rules](../interaction-patterns/responsive-actions-pattern.md) when a shortcut mirrors a page control.
- **DS-MOBILE-UX-003** — When a task changes layout or temporarily leaves the application for a system prompt or picker, it MUST preserve recoverable input and selection or explain what was lost and how to recover. Respect data persistence policy.
- **DS-MOBILE-UX-004** — Validation claims MUST identify the tested surface. A browser viewport verifies layout in that browser. Installed launches, system Back, permissions, resume and native integrations need evidence from their own supported surface when affected.

## Accessibility

Check touch reach and spacing, meaningful names for icon controls, supported larger text, focus when panels open or close, and a visible alternative to essential gestures. Verify orientation changes where supported and follow the active accessibility requirements.

## Security and Permissions

Use the selected platform's file and permission controls. Handle denial, cancellation and stale authorization at the action boundary. A more compact view must not disclose extra fields or expand who can act.

## Validation

On representative supported sizes, run an essential journey through search or filters, a deep link, details, an edit or attachment, and return. Try long names, long values, short and empty results, large text, keyboard open, interruption and failed requests. With a fixed header or column, scroll actual populated results and check for clipping, overlap and reachability. Test affected installed or native interactions on representative devices and record coverage separately.

## Related Patterns

- [Responsive breakpoints](../foundations/responsive-breakpoint-pattern.md)
- [Measured interface quality](../../quality/ui-quality-pattern.md)
- [Mobile lifecycle and permissions](../../platforms/mobile/lifecycle-permission-pattern.md), for enabled native or hybrid targets
- [Web platform](../../platforms/web/INDEX.md), for enabled browser, installed web or hybrid web content
