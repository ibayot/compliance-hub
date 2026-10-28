---
id: DOMAIN-REPORT-BUILDER
status: baseline
scope: configurable reports, saved templates and export presentation
owner: application-maintainers
triggers: [report builder, saved report template, optional report columns, report export]
---

# Configurable Report Builder

## Guidelines

Separate the server-owned metric contract from user-selected presentation. A template chooses supported sections, fields, sorting and permitted filters; it cannot remove required measures, widen authority or turn missing history into a known value. Use [reporting calculations](reporting-pattern.md) for metric meaning and [resource scope](../security/authorization/resource-scope-pattern.md) for access.

## Why

A report can calculate correctly and still mislead through cramped columns, an ambiguous denominator, unknown values shown as zero, or a preview/export built from different records. A personal report and a supervisor's aggregate need different useful dimensions even when they share one builder.

## Structure

~~~text
authenticated actor + current capabilities + validated configuration
  -> authorized source / optional-field and payload budget
  -> defined period, formulas, missing-history coverage and generation cutoff
  -> immutable generated result -> readable preview and export
saved template -> configuration only -> revalidated when reused
~~~

## Store Implementation

The owning backend controls required metrics/columns, row and field scope, supported options, calculation versions and data-quality labels. Store templates with a server-derived owner and the selected concurrency/name policy. Recheck current access and option validity when a template is used; saved configuration is not an authorization grant. Keep edits, display layout and visible-page state with the frontend owner. Do not claim a saved historical snapshot when only configuration was saved.

Map each optional field from checkbox to API schema, bounded query, result projection, preview, saved-template reload and export. Long narrative text is an explicit optional field where supported. Preserve text and line breaks; encode it as data. Fetch it only when selected, under the same row/field policy, and enforce a reviewed byte/work budget before materializing large text where possible. Reject an oversized request with a recovery action; do not silently drop records or truncate requested content.

For one-person reports, use the authorized account's actual display name and omit redundant comparison/assignee dimensions. For authorized cross-person reports, preserve meaningful comparisons and attribution. Resolve names through trusted records rather than displaying internal IDs as the only identity or substituting the current viewer's name for another selected person. State how current assignment, historical ownership and settings affect the result; do not imply historical snapshots that were never stored.

Review the maximum useful option set with long content, populated data, narrow/dark layouts and export pagination. A scrollable table with usable widths and visible row identity may serve scanning; labelled detail cards or a separate print layout may serve wide narrative reports. Reuse tokens, semantic hierarchy and contrast. Layout may differ, but selected values, scope, warnings and metrics must agree. Keep labels concise while preserving period/selection meaning in report metadata or calculation notes.

## Rules

- DOMAIN-BUILDER-001 MUST keep mandatory metrics/fields and authorization server-owned; templates and UI choices cannot override them.
- DOMAIN-BUILDER-002 MUST define template ownership, current-permission revalidation, stale-option behavior and concurrent-edit handling before reuse; configuration is distinct from a generated historical snapshot.
- DOMAIN-BUILDER-003 MUST trace optional fields through request validation, authorized retrieval, bounded projection, template reload, preview and export; preserve selected narrative text safely without silently truncating it.
- DOMAIN-BUILDER-004 MUST evaluate readable populated output with the largest supported useful field set and representative long values, including narrow and printed/exported layouts; passing data assertions alone do not prove usability.
- DOMAIN-BUILDER-005 SHOULD tailor redundant dimensions to individual versus aggregate scope and use resolved human-readable identities without exposing unrelated records or hiding necessary attribution.
- DOMAIN-BUILDER-006 MUST reconcile preview and export against the same generated result or an explicit equivalent snapshot contract, including all requested rows, data-quality warnings, scope and cutoff; visible-page pagination must not silently limit export.
- DOMAIN-BUILDER-007 MUST make stale inputs, missing history, zero values, unavailable values and incomplete coverage distinguishable; changing inputs requires the accepted refresh/regeneration behavior before export.

## Validation

Check mandatory-field tampering, foreign/stale templates, changed grants, individual/aggregate scopes, no-data periods, selected versus omitted narrative fields, payload-limit recovery, script-like text, stable global sorting, all-options readability and preview/export reconciliation beyond the first page. Use synthetic fixtures; do not create real-user reports or exercise production merely to validate this pattern. Related: DOMAIN-REPORT-001..004, DS-TABLE-001..005, QA-UI-001..010, API-REST-001..005.
