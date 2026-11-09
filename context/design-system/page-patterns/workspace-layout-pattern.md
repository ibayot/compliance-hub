---
id: DS-WORKSPACE
status: active
scope: authenticated page composition
triggers: [workspace presets, page layout, appearance]
---
# Workspace composition

## Guidelines and why

The owner requested three visibly different compositions with independent color themes. Give pages explicit context and content regions so changing a preset changes information arrangement. Preserve each region's existing component, state, actions, and authorization.

## Structure

`page heading / navigation -> WorkspaceLayout(context, content, kind)`

- Operations Grid places context above a full-width working canvas.
- Split-Pane Workbench places context beside content at the active web `lg` breakpoint (1200px); tabbed operational pages use a vertical navigation rail.
- Sectioned Workspace uses broad context bands, two-column dashboard/settings sections, and a reading flow for document panes.
- Narrow and forced mobile layouts stack the regions; preset surface treatment remains visible. Print uses a linear flow.

## Store implementation

Use `frontend/src/components/layout/WorkspaceLayout.tsx`, its stylesheet, and `WorkspaceTabs.tsx`. Existing appearance context owns the selected preset; workflow data remains in its original owner.

## Rules

- DS-WORKSPACE-001 MUST bind page regions explicitly in JSX; do not infer business sections from rendered DOM order or duplicate live controls.
- DS-WORKSPACE-002 MUST preserve logical source/focus order and existing conditional capability checks when grouping regions.
- DS-WORKSPACE-003 MUST preserve all fields and actions on narrow screens. Palette selection is independent of composition.
- DS-WORKSPACE-004 MUST use actual MUI vertical tab orientation when displaying a vertical tab rail, including its keyboard semantics.
- DS-WORKSPACE-005 MUST compare populated representative page families at desktop and narrow widths before claiming complete visual coverage. A build is structural evidence only.
- DS-WORKSPACE-006 SHOULD reserve narrow context rails for compact search and filters; dense configuration forms and long option values belong in the main-width workspace region.

## Validation

Build the frontend; inspect list/filter, detail/context, dashboard/graphs, report/configuration, document/metadata and settings/profile consumers. Check keyboard order, overflow, empty context, loading/error states and print. Keep screenshots and local execution evidence out of Git under APP-CH-008.
