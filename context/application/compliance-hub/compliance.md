# Compliance Documents and Reporting Overlay

## Guidelines and structure

Document upload -> metadata and unit validation -> version persistence -> background processing/preview -> review and compliance outcome -> reporting. Processing status and compliance/review status have different meanings.

## Store Implementation

The server owns document/version/review state. The form owns unsaved metadata and selected files. Query state owns retrieved lists and processing progress. Do not overwrite review outcomes because a preview is reprocessed.

## Rules

- CH-DOC-001 MUST preserve version identity, uploader, unit, checksum/metadata, and historical review context.
- CH-DOC-002 MUST authorize preview, download, version comparison, and linked records as well as list/detail views.
- CH-DOC-003 MUST distinguish queued/processing/failed file work from reviewed/compliant/needs-revision business status.
- CH-DOC-004 MUST preserve period/year and applicability semantics in metrics, KPI, and MoV reports.
- CH-DOC-005 MUST define retry and partial-failure behavior for preview/text-processing changes.

## Evidence and validation

Inspect [document service](../../../backend/src/modules/documents/services/document.service.ts), [version service](../../../backend/src/modules/documents/services/version.service.ts), [preview processor](../../../backend/src/modules/documents/processors/preview.processor.ts), and [frontend contract](../../../frontend/src/lib/api/documents.ts). Verify scoped access, duplicate submission, old versions, failed processing, review revisions, and report totals for affected changes.
