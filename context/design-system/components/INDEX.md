---
id: DS-COMPONENTS-INDEX
status: baseline
scope: context-navigation
triggers:
  - "element component patterns"
---

# Element Component Patterns

Each element defines approved purpose, anatomy, state ownership, variants/state constraints, accessibility, security, and validation. Select by behavior rather than visual similarity.

## actions

- [Button Pattern](actions/button-pattern.md) — button, primary action, action hierarchy.
- [Icon Button Pattern](actions/icon-button-pattern.md) — icon action, compact action.
- [Action Menu Pattern](actions/action-menu-pattern.md) — overflow menu, row menu, secondary actions.

## inputs

- [Text Field Pattern](inputs/text-field-pattern.md) — text input, form field.
- [Textarea Pattern](inputs/textarea-pattern.md) — multiline text, description, comment field.
- [Number Field Pattern](inputs/number-field-pattern.md) — numeric input, quantity, decimal.
- [Checkbox Pattern](inputs/checkbox-pattern.md) — checkbox, multiple choice, select all.
- [Radio Group Pattern](inputs/radio-pattern.md) — radio, exclusive choice.
- [Switch Pattern](inputs/switch-pattern.md) — toggle, immediate setting.
- [Select Pattern](inputs/select-pattern.md) — dropdown, single select, fixed options.
- [Searchable Select and Autocomplete Pattern](inputs/searchable-select-pattern.md) — combobox, searchable dropdown, autocomplete, remote options.
- [Date Picker Pattern](inputs/date-picker-pattern.md) — date, calendar, date input.
- [Time Picker Pattern](inputs/time-picker-pattern.md) — time input, scheduled time.
- [Date Range Pattern](inputs/date-range-pattern.md) — date range, from and to, period filter.
- [File Picker Pattern](inputs/file-picker-pattern.md) — file picker, attachment selector, dropzone.
- [Rich Text Editor Pattern](inputs/rich-text-editor-pattern.md) — rich text, formatted input, editor.

## feedback

- [Alert Pattern](feedback/alert-pattern.md) — inline alert, persistent notice, warning.
- [Toast Pattern](feedback/toast-pattern.md) — snackbar, toast, transient feedback.
- [Field Error Pattern](feedback/field-error-pattern.md) — validation error, field error, form errors.
- [Progress Indicator Pattern](feedback/progress-pattern.md) — spinner, progress bar, upload progress.
- [Skeleton Pattern](feedback/skeleton-pattern.md) — skeleton, initial loading, layout placeholder.
- [Empty State Pattern](feedback/empty-state-pattern.md) — no data, empty list, no results.
- [Error State Pattern](feedback/error-state-pattern.md) — fetch failure, page error, unavailable service.

## navigation

- [Application Navigation Pattern](navigation/application-navigation-pattern.md) — sidebar, app navigation, navigation shell.
- [Breadcrumbs Pattern](navigation/breadcrumbs-pattern.md) — breadcrumbs, location hierarchy.
- [Tabs Pattern](navigation/tabs-pattern.md) — tabs, section navigation.
- [Pagination Controls Pattern](navigation/pagination-pattern.md) — page navigation, page size, table pagination.

## overlays

- [Dialog Pattern](overlays/dialog-pattern.md) — modal, dialog, form dialog.
- [Confirmation Dialog Pattern](overlays/confirmation-dialog-pattern.md) — confirm action, delete confirmation, irreversible action.
- [Drawer Pattern](overlays/drawer-pattern.md) — drawer, side panel, detail panel.
- [Popover Pattern](overlays/popover-pattern.md) — popover, anchored panel, floating content.
- [Tooltip Pattern](overlays/tooltip-pattern.md) — tooltip, hover help.

## data display

- [Data Table Pattern](data-display/table-pattern.md) — table, data grid, row actions.
- [List Pattern](data-display/list-pattern.md) — record list, result list, item collection.
- [Card Pattern](data-display/card-pattern.md) — card, summary panel, dashboard tile.
- [Status Chip and Badge Pattern](data-display/status-chip-pattern.md) — status chip, badge, status label.
- [Metadata and Label-Value Pattern](data-display/metadata-pattern.md) — label value, record metadata, summary details.
- [Timeline and Audit Display Pattern](data-display/timeline-pattern.md) — timeline, activity log, audit history.
- [Document Preview Pattern](data-display/document-preview-pattern.md) — document preview, image preview, attachment viewer.

## Variant boundaries

Button weight, checkbox mixed state, multi-select, status badges, and similar related variants are documented within their element pattern. Separate patterns are warranted when interaction/state/security contracts differ materially. A wizard includes the stepper contract in its [page pattern](../page-patterns/wizard-pattern.md); sorting belongs to the [query interaction](../interaction-patterns/search-and-filter-pattern.md).

## Before implementation

Check the active profile and design-system evidence using the links below; the repository may have an existing shared component. Existing code must be inspected before reuse or replacement. New rules do not certify or automatically migrate legacy controls.

- [Active profile](../../application/PROFILE.md)
- [Design-system catalog](../INDEX.md)
- [Element pattern template](../../templates/element-pattern-template.md)
