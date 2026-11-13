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

Direct document and version reads follow the same focal ownership as the document list. The focal who owns an archived record can reopen its versions; archived records do not appear in another account’s ordinary document reads. Preview and download must match both the document and version IDs. The [shared preview hook](../../../frontend/src/lib/utils/useDocumentPreview.ts) binds authenticated bytes to the current selection and discards stale results. The [viewer](../../../frontend/src/components/documents/DocumentViewer.tsx) supplies PDF bytes to the bundled renderer and isolates generated DOCX markup in a sandboxed iframe. Verify that the deployed frontend serves the same-origin PDF worker as JavaScript and that the browser actually renders a page under its security policy.

The review workspace submits the version opened by the reviewer. The server checks it while locking the document row, then saves the decision and updates document status together. If another version has become current, the reviewer must reopen the document before submitting a decision. The current API still accepts requests without an expected version. Require that precondition when tightening the API under SEC-PREVIEW-004, after checking existing callers.

The current version owns the current review status and queue eligibility. Older decisions remain available through authorized review history. Review and comparison APIs apply the document's scope before returning records, and a comparison must link two versions of that same document. The review queue filters and paginates on the server. The [review service](../../../backend/src/modules/reviews/services/review.service.ts) permits absent remarks for compliant reviews and requires nonblank remarks for returns and non-compliant decisions.

Uploads commit the document and its version together. Replacements lock the parent document before allocating a version number, with a unique database index as a backstop. An older processing job may update its version but cannot change the current document's processing status or extracted text.

Database readiness under APP-CH-007 and WF-SCHEMA-004 includes a `document_versions.mime_type` field large enough for the 71-character DOCX MIME value, uniqueness on `(document_id, version_number)`, and actual foreign-key constraints. Use the catalog to confirm column types, constraint columns, and enforcement. An index name alone is insufficient. The environment-managed `20261112-document-version-integrity-compliance.sql` preserves existing records, repairs identifiable truncated MIME values and stops on unresolved integrity conflicts. See the [database workflow](../../../db-init/README.md).

## Evidence and validation

Inspect [document service](../../../backend/src/modules/documents/services/document.service.ts), [version service](../../../backend/src/modules/documents/services/version.service.ts), [preview processor](../../../backend/src/modules/documents/processors/preview.processor.ts), and [frontend contract](../../../frontend/src/lib/api/documents.ts). Verify scoped access, duplicate submission, old versions, failed processing, review revisions, and report totals for affected changes. Local verification covered synthetic document preview and a current-version review after replacement, plus duplicate-version and orphan rejection on the running MariaDB. Repeat relevant checks when these paths change. Device, production and full capability-matrix coverage require separate evidence.

Candidate workflows for future product review are returning and resubmitting from the original document page, comparing revisions before a decision, and retrying an individual failed processing stage. Confirm scope and recovery behavior before adding them.
