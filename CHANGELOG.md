# RICTMS Compliance Hub - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.5.0.1] - 2026-03-04 — KPI MoV Major Update (Quality-First)

### Fixed (QA Iteration 8 — Metrics pipeline reliability + archived docs end-to-end)
- **Bull queue jobs lost on backend restart** – Added `onModuleInit` startup recovery in `DocumentService`: on every backend start, all documents with `status IN ('pending','processing')` are scanned. Those with `extracted_text` already set are immediately updated to `READY` and their `compute-metrics` job is re-queued; those without extracted text have a full `process-document` job re-queued. This ensures no document is left permanently stuck after a server restart.
- **`reprocessDocument` smart routing** – The `POST /documents/:id/reprocess` endpoint now checks whether the document already has `extracted_text`. If so, it updates status to `READY` and queues `compute-metrics` only (skipping redundant file re-parsing). If not, it queues the full `process-document` pipeline.
- **Cybersecurity Incident Summary metrics end-to-end (verified logic)** – Document with `reportorial_doc_type_id=9` and text `"Users Trained: 1"` is now compared against `expected_number=10` with `comparison=gte`. Result: `1 >= 10 = FAIL` → NEEDS\_REVISION auto-review created → focal sees document as "Returned".
- **Archived documents page** – No code change needed; page was correct. The empty state was a downstream effect of metrics never running (no review → can\'t archive → nothing to show). With the pipeline fixed, the full chain now works: upload → metrics fail → auto-return → focal archives → archived page shows the document.

### Fixed (QA Iteration 7 — Cybersecurity Metrics + Archived Docs + Focal UX)
- **Cybersecurity metrics not auto-returning** – `getApplicableMetrics` now correctly respects `reportorial_doc_type_id`; the global-match condition tightened to `(unit_id IS NULL AND document_type IS NULL AND reportorial_doc_type_id IS NULL)` and an additional `OR reportorial_doc_type_id = :id` branch added. Cybersecurity Incident Summary metrics (property_check + section_check) now run on documents with `reportorial_doc_type_id = 9`.
- **Stuck documents (Bull job lost on restart)** – New `POST /documents/:id/reprocess` endpoint (SUPER_ADMIN + REVIEWER only) resets document status to `PENDING` and re-enqueues the `process-document` Bull job, recovering documents that lost their processing job on backend restart.
- **Document not found after archiving** – `getDocumentById` no longer filters `is_deleted: false`; archived documents can be fetched without throwing 404, enabling the detail page to load them correctly.
- **Map References button hidden for focal** – The "Map References" button is no longer shown on the document detail page when the signed-in user has `role = 'focal'`.
- **Archived document ARCHIVED banner** – The document detail page now shows an info `Alert` banner when `document.is_deleted === true`, informing the user the document has been archived.
- **Archived page performance** – `staleTime: 30_000` added to the archived documents query to prevent re-fetching on every navigation; `limit` reduced from 200 → 50. Archived table rows are now clickable, navigating to the document detail page.
- **Smoke test — Cybersecurity metrics flow** – Smoke test extended with Cybersecurity unit document reprocess → wait → metrics count verification, plus a reprocess route availability assertion.

### Fixed (QA Iteration 6 — Documents UX + Focal Workflow Hardening)
- **Compliant docs hidden from admin list** – Restored `NOT IN ('compliant', 'needs_revision', 'non_compliant')` filter on `listDocuments` for `super_admin`/`reviewer` when no explicit status filter is active and `archived = false`; admin queue only shows actionable documents.
- **Compliant docs hidden from Reviews queue** – Reviews table now filters out rows where the document's latest review decision is `compliant`.
- **Focal Return button removed** – `onReturn` prop not passed to `DocumentList` for focal users; the UI no longer shows a Return button they cannot use.
- **Uploaded By column hidden for focal** – `hideUploaderColumn` prop passed as `true` for focal users, removing the redundant column.
- **Unit column hidden for focal** – `hideUnitColumn` prop passed as `true` for focal users.
- **Document title set to Display Name** – When uploading via reportorial doc type, the document's `title` is now set to `reportorialDocType.display_name` instead of the uploaded filename.
- **Detail page shows workflow status** – The status chip in the document detail page now uses the same `getWorkflowStatus` logic (Approved / Returned / Pending Review) instead of the raw file-processing status.
- **Detail page shows return remarks** – An amber `Alert` banner now appears below the document info panel when `latest_review_remarks` is present, showing why the document was returned.
- **Removed redundant Download Current button** – Header "Download Current" button removed from document detail page; per-version downloads in the Version History timeline remain.
- **Archive returned documents** – Focal users can now archive documents that were returned (needs_revision / non_compliant). A new `POST /documents/:id/archive` endpoint soft-deletes the record. The documents list shows an Archive icon for applicable focal documents.
- **Archived documents view** – New page at `/dashboard/documents/archived` lists all archived focal documents with title, type, period, status chip, and the return remarks. Accessible via "View Archived" button on the documents page.
- **Upload reflects immediately** – `DocumentUpload` component now calls `queryClient.invalidateQueries({ queryKey: ['documents'] })` on success, busting the stale cache before navigating back.
- **KPI unit filter locked for focal** – On KPI page, focal users' unit filter is auto-set to their own unit on mount and the dropdown is disabled so they cannot switch units.
- **Metrics auto-return documents** – Works correctly now that the admin filter is restored; documents that fail metrics checks are automatically returned to focal with remarks and are no longer visible in the admin queue as pending.

### Fixed (QA Iteration 5 — Documents Workflow + Role Gates)
- **Document initial status** – Focal uploads now create the document record with `PENDING` status instead of `READY`, so the document immediately appears in admin/compliance officer view and the Reviews queue after text extraction completes.
- **Focal re-upload after return** – `validateFocalSubmission` (legacy path) and the new reportorial path both now allow re-upload when the existing submission has a `needs_revision` or `non_compliant` review decision; the old returned document is soft-deleted before the new one is inserted.
- **Admin visibility of focal uploads** – Removed the `NOT IN ('needs_revision', 'non_compliant')` subquery filter from `listDocuments` for `super_admin`/`reviewer` roles; admins now see all submissions regardless of review decision.
- **Return-for-revision gate** – `returnDocumentForRevision` now blocks only documents in `PROCESSING` or `FAILED` status, allowing admins to return both newly uploaded (`PENDING`) and text-extracted (`READY`) documents.
- **Focal document status labels** – Status chip now shows **Pending Review** (awaiting or in-processing), **Approved** (compliant), or **Returned** (needs revision / non-compliant) instead of SUBMITTED / UNDER REVIEW / COMPLIANT / RETURNED.
- **Documents page default filter** – Default status filter changed from `'pending'` to `undefined` (show all), so admins see new focal uploads immediately.
- **Reviews module role gate** – Reviews page restricts access to `super_admin` and `reviewer` roles; other roles see an Access Restricted message. Review queue filter updated from `status: 'pending'` to `status: 'ready'`.
- **Reports module role gate** – Reports page restricts access to `super_admin` and `reviewer` roles; other roles see an Access Restricted message.

### Fixed (QA Iteration 4 - 2026-03-10)
- **MoV Report HTML** – all main headers (`h2`) and section headers (`h3`) centered; period/summary text Arial 10pt; table headers (`th`) centered.
- **Register + Monitoring report** – section/table names centered, Arial 10pt.
- **Register Monitoring Matrix** renamed to “ICT Compliance Register Monitoring”; Q-column headers renamed Q1–Q4 Score; Source column shows actual URL as link text; `Applicable Bases` column parenthetical removed; colgroup widths added (Source gets 26%).
- **KPI Gap Remarks Override panel** now only visible when the Assessment Report is currently previewed.
- **Assessment Plan** – Print Plan button added (generates standalone HTML table in iframe, then prints).
- **Assessment Schedule** – Print Schedule button added (same mechanism).
- **Metrics** – Assigning Reportorial Document Type now correctly persisted in `metric_applicability` (`reportorial_doc_type_id` column was being dropped by the controller before saving).
- **Document Uploader** – Focal users using the new Reportorial Document Type upload path no longer get “No active assignment found” error (legacy assignment check skipped when `reportorial_doc_type_id` is supplied).

### Fixed (Register Report QA - 2026-03-09)
- **Register table columns refactored** (iteration 3):
  - Removed `Responsible Unit` and `Review Frequency` columns from all register tables (deferred to Issuances module).
  - Renamed `Implications Effectivity` → `Effectivity`; date now formatted as `mmm-dd-yyyy` (e.g., `Mar-09-2026`).
  - Column order: `Title` now precedes `Type`.
  - `Type` header superscript `¹` placed on second line (`Type<br/>¹`) for visual clarity.
  - Legend format updated: `¹: L – Law / Executive Order, R – Regulatory Issuance, S – Standard / Framework / Guideline, C – Contractual Requirement` (comma-separated, no pipe characters).
  - Table fonts: `Arial 11pt` for main `<h2>`, `Helvetica 9pt` for `<th>`, `Helvetica 10pt` for `<td>`, `Helvetica 8pt` for legend paragraph.
  - Vertical alignment `middle` applied to all `<th>` and `<td>` cells.
  - Summary section converted from `<ul>/<li>` bullets to plain `<div>` lines.
- **Register Monitoring Matrix separated:** extracted from inline register report into own report type (`GET /mov/reports/monitoring-matrix`) with separate button in UI.
- **MoV Builder access restricted** to `super_admin` and `reviewer` roles only; other roles see access-restricted alert.
- **Print isolation:** iframe-based print already isolates report output; `buildPrintHtml()` helper now injects header images and footers before printing.
- **Report Settings panel added:** upload up to 2 header images (base64), configure page footer, optionally configure a separate first-page footer.
- **KPI Gap Remarks:** free-form `Additional Manual Remarks` field always visible so users can enter remarks even when no gaps are detected.
- **Assessment Plan:** redesigned with timeline layout — vertical spine, color-coded year avatars, accent-bordered cards, per-year chip badges.
- **Artifacts tab:** added inline status-edit capability with `Edit / Save / Cancel` controls per row; status dropdown supports `draft`, `active`, `generated`, `archived`.

### Fixed (QA Iteration 2 - 2026-03-05)
- **Branch-safe execution:** all changes kept on `feature/kpi-mov-major-update-1.5.0.1`; no `master` changes introduced.
- **Issuances as register+monitoring:** added per-quarter compliance tags (`Q1`/`Q2`/`Q3`/`Q4`) and `register_added_at` so the module now captures both register and monitoring context.
- **MoV Builder reorganization:** refactored page into tabbed sections (Reports, Assessment Plan, Assessment Schedule, Artifacts) to reduce long-page scrolling.
- **Register generation coverage:** added per-register generation mode (`legal`, `standards`, `internal`) with dedicated buttons and issuance-type-driven categorization to ensure complete table coverage per register.
- **Register basis correction:** report “Added Entries” now uses `register_added_at` (fallback `created_at`) and quarter window; no dependency on issuance `issue_date` for this metric.
- **Print reliability:** replaced popup-window print behavior with iframe-based print flow to avoid “unable to open print window” failures.
- **Assessment report UX/content alignment:**
  - button label simplified to `Generate Assessment Report`,
  - checklist now derives from assessment plan bullet items,
  - conformance block rewritten as human-readable narrative,
  - failed checklist rows now use `❌` icon,
  - section renamed from Schedule Snapshot to Assessment Schedule,
  - schedule remarks included,
  - KPI gap remarks now support manual override input before report generation.
- **Assessment plan manageability:** added plan item editing, add, and delete actions with bullet-item authoring per year.
- **Assessment schedule updates:** added in-place status and remarks updates per schedule row.

### Database / Migration (QA Iteration 2)
- Added issuance fields:
  - `q1_compliance_status`, `q2_compliance_status`, `q3_compliance_status`, `q4_compliance_status`
  - `register_added_at`
- Applied runtime `ALTER TABLE ... IF NOT EXISTS` guards in Issuances service.
- Seed updates now initialize new issuance fields and keep migration additive/non-destructive.

### Verified (QA Iteration 2)
- `npm run build` (backend) ✅
- `npm run test -- --runInBand` (backend) ✅
- `npm run build` (frontend) ✅
- `smoke-test.ps1` ✅ all smoke tests passed.

### Fixed (QA Polish - 2026-03-05)
- **KPI validation hardening:** removed fragile `ParseIntPipe` usage for dashboard/action-plan query params and shifted to safe numeric parsing in controller before service validation to resolve `Validation failed (numeric string is expected)`.
- **MoV Builder register report:** changed generated output to **HTML visual report** (no markdown-only dependency) and aligned structure to QA-required format:
  - Header: `INFORMATION SECURITY MANAGEMENT SYSTEM` + legal/regulatory/standard subtitle.
  - Period + summary bullets (`Active register entries`, `Marked Compliant`, `Readiness`, `Added Entries`).
  - Table columns aligned to requested register semantics and enriched with responsible unit/review cadence context.
  - Section split into **Legal Register**, **Standards Register**, and **Internal Policy Register**.
  - Added register monitoring matrix (`Applicable Bases | Description/Link | Compliance Score (1st Q..4th Q)`).
  - Removed notes block from generated register report.
- **MoV Builder UX:** renamed module label from **MoV Planner** to **MoV Builder**, changed register filter input from numeric `Unit ID` to optional text `Unit`, and added `Print / Save PDF` action via browser print pipeline.
- **Issuances process owner UX:** converted `Process Owner` from free text to dropdown sourced from active app users (focus roles: focal/reviewer/section_head/super_admin).
- **Issuances seed enrichment:** added seeded context values for `binding_nature`, `adoption_basis`, `applicable_provisions`, and `compliance_obligations` by issuance category.

### Added
- **MoV Planner backend module** with secured endpoints:
  - `GET/POST/PUT/DELETE /api/mov/artifacts`
  - `GET /api/mov/reports/register`
  - `GET /api/mov/reports/assessment`
  - `GET /api/mov/register-columns`
- **MoV artifact persistence** via new `mov_artifacts` table (`schema.sql` + runtime compatibility creation in service).
- **5-year assessment roadmap seed** (`assessment_plan_year`) and quarter schedule seed samples (`assessment_schedule_entry`).
- **KPI action-plan automation endpoint**: `GET /api/kpi/action-plans`.
- **Expanded Issuances register fields** for binding nature, provisions, obligations, evidence, ownership, cadence, status, gaps, actions, and readiness.

### Changed
- **Reports page** now renders backend-generated **Suggested KPI Action Plans**.
- **Navigation + routing** now include **MoV Planner** at `/dashboard/mov`.
- **MoV Planner UI strategy changed** from template builder to **report builder**:
  - Register report is auto-generated from Issuances data.
  - Assessment report/checklist is auto-generated from plan + schedule + KPI monitoring.
  - Assessment schedule is editable in-UI with sample seeded entries.
- **KPI page** now visibly shows auto-generated action plans in dashboard tab.

### Database / Seed
- Added `mov_artifacts` table to `backend/src/database/schema.sql`.
- Added `mov_artifacts` setup + sample records to `backend/src/database/seed-data.sql`.

### Verified (Build/Test)
- `npm run build` (backend) ✅
- `npm run test -- --runInBand` (backend) ✅
- `npm run build` (frontend) ✅
- `smoke-test.ps1` ✅ all smoke tests passed.

### Migration / Rollback Notes (QA Polish)
- Migration is additive/content-only:
  - SQL seed updates only enrich issuance text/context fields.
  - No destructive schema change introduced in this QA polish pass.
- Rollback:
  - Revert KPI controller parsing changes in `backend/src/modules/kpi/controllers/kpi.controller.ts`.
  - Revert HTML report generation changes in `backend/src/modules/mov/services/mov.service.ts` + `backend/src/modules/mov/controllers/mov.controller.ts`.
  - Revert frontend MoV builder updates in `frontend/src/app/dashboard/mov/page.tsx`, `frontend/src/app/api/mov.ts`, and sidebar label update.
  - Revert Issuances process-owner dropdown update in `frontend/src/app/dashboard/issuances/page.tsx` and seed enrichment in `backend/src/database/seed-data.sql`.

### Rollback
- Revert `backend/src/modules/mov/**`, KPI action-plan endpoint changes, frontend MoV page/route/sidebar/report changes, and `mov_artifacts` schema/seed additions.

## [1.4.0] - 2026-03-03 — Issuances Expanded Regulatory Coverage + Amendment Tracking

### Added
- **Expanded issuance baseline coverage** in `backend/src/database/seed-data.sql` for broader applicability search:
  - Additional laws and legal amendments relevant to ICT implementation context.
  - Additional IRR/policy guidance entries where originally non-ICT legal frameworks include ICT-operational provisions.
  - Additional standards references (ISO/NIST) for security, privacy, cloud, and control baselines.
  - Executive Order reference (`EO-170-2022`) and national planning reference (`NCSP-2023-2028`).
  - Additional DICT/NPC circular reference entries to support operations-level compliance lookup.
- **Amendment metadata model** for issuances:
  - `is_amendment`
  - `amended_issuance_number`
  - `ict_amendment_notes`

### Changed
- **Issuances UI** now surfaces amendment context in list and detail workflows:
  - Added table column: `ICT Related Amendments`.
  - Add/Edit form supports amendment-specific fields.
  - Applicability/Relevance modal now includes amendment metadata and ICT amendment narrative.
- **Issuance type options** expanded to include `executive_order` and `plan` for broader issuance classification.
- **Issuance filtering UX** upgraded to persistent checkbox multi-select dropdowns for Authority and Category, so selected options remain visible and usable while filters are active.
- **Second-pass reassessment policy update**: all AO/MC documents are now included under INTERNAL_POLICY categories instead of removal tagging.
- **Public-service criterion added**: reassessment now explicitly includes issuances that drive public service delivery, anti-red-tape compliance, and transparency operations.
- **Category label display normalization**: Issuances category display now renders human-readable title labels (capitalized, underscores removed in UI presentation).
- **Issuances row actions simplified**: actions now use an ellipsis-triggered menu to reduce visual overload while preserving existing operations (view applicability, map documents, edit/delete/toggle for privileged roles).
- **Issuances table pagination**: client-side paging controls added to avoid heavy vertical scrolling on long issuance lists.
- **Title click resolution updated**: when `source_url` exists, title opens the link; if no link exists but an attachment is stored, title opens the attached file.

### Added
- **Manual upload-first assessment workflow** for issuance documents:
  - Added drop folder: `issuance-file-drop/`
  - Added classifier script: `scripts/classify_issuance_drop.py`
  - Added generated assessment output: `issuance-file-drop/classification-results.csv`
  - Added deep-dive report output: `issuance-file-drop/deepdive-assessment.md`
  - CSV now includes `policy_group`, `category`, `page_count`, `title_guess`, `key_topics`, `relevance_summary`, and `external_context`.
  - Added public-service issuances to seed baseline: `RA-9485`, `EO-2-2016`, `RA-12254`.
- **VS Code PDF extension baseline**: `tomoki1207.pdf` installed for direct PDF viewing.
- **Internal policy baseline rows** in `backend/src/database/seed-data.sql`: seeded AO/MC issuances (`issuance-041..050`) and DPO-related `NPC-CIRCULAR-17-01` (`issuance-051`).
- **Issuance attachment storage and APIs**:
  - Added DB fields: `attachment_file_name`, `attachment_mime_type`, `attachment_blob`, `attachment_uploaded_at`.
  - Added endpoints: `POST /issuances/:id/attachment`, `DELETE /issuances/:id/attachment`, `GET /issuances/:id/attachment/view`, `GET /issuances/:id/attachment/download`.
  - Added frontend support for upload/replace/remove and explicit attached-file view/download actions.
- **Traceability update** in `ICT-ISSUANCE-RELEVANCE-MAP.md`:
  - Complete applicable issuance master list for manual collection/upload.
  - Explicit per-item exclusion/deferred reasons.
  - Dropped-file assessment summary with Included / Mark-for-Removal / Mark-for-Review counts.

### Verified (Smoke)
- `npm run db:seed` (backend) → success.
- `npm run build` (backend) → success.
- `npm run build` (frontend) → success.
- `npx tsc --noEmit` (frontend) → success.
- `python scripts/classify_issuance_drop.py` → processed 51 PDFs, generated `issuance-file-drop/classification-results.csv`.
- Latest deep-dive run summary: `51` processed, `38` included, `11` marked-for-removal (deferred legal scope), `2` marked-for-review.
- Latest deep-dive run summary after public-service criterion: `51` processed, `41` included, `10` marked-for-removal (deferred legal scope), `0` marked-for-review.
- Manual-review adjudication captured: `RA-9485` included; `DICT Department Circular HRA-003 s2025` deferred as telecom-provider specific.

### Rollback
- Revert seed additions and amendment metadata updates in Issuances entity/schema/UI/API.
- Re-run `npm run db:seed` to restore prior issuance baseline.
- Revert Issuances filter UI changes in `frontend/src/app/dashboard/issuances/page.tsx` if single-select behavior is required.

## [1.3.0.22] - 2026-03-03 — Issuances Dropdown Filters, Category/Status Controls, Deeper Applicability Notes

### Changed
- **Issuance filtering UX**: Issuances filters are now dropdown/option style (Authority, Category, Status) instead of free-text/chip filtering.
- **Category-aware filtering**: Added backend/frontend support for filtering issuances by category (`issuance_type`).
- **Status-aware filtering**: Added active/inactive/all status filtering using `is_active`.
- **Status management action**: Issuance rows now support quick Activate/Deactivate action, and Add/Edit form includes explicit Status selection.
- **Deeper baseline narratives**: Seed data now enriches `applicability_scope` and `relevance_notes` with more detailed implementation-oriented explanations by issuance type.

### Added
- **Controller/service filter contract**: `GET /issuances` now supports `category` in addition to existing `authority/search/is_active` filters.
- **Frontend API contract**: Issuance create/update DTO now supports `is_active` and issuance list filters now support `category`.

### Verified (Smoke)
- `npm run db:seed` (backend) → success.
- `npm run build` (backend) → success.
- `npx tsc --noEmit` (frontend) → success.
- `npm run start:dev` (backend) → starts clean after clearing local port conflict.

### Rollback
- Revert Issuance controller/service/api/page updates for category/status filtering and status editing.
- Revert seed narrative updates in `backend/src/database/seed-data.sql`.
- Re-run `npm run db:seed` to restore previous baseline text/data.

## [1.3.0.21] - 2026-03-03 — Issuances Comprehensive ICT Inclusion + Applicability/Relevance Modal

### Changed
- **Comprehensive Issuances baseline**: `backend/src/database/seed-data.sql` now includes a broad ICT set covering laws, circulars, memorandums, IRRs, and international standards (ISO/NIST) related to operations, governance, cybersecurity, business continuity, disaster response, safety, and applicable use.
- **Issuances table structure aligned**: Issuances page table now uses `Issuance Number | Title | Authority | Issue Date | Status | Mapped Documents | Actions`.
- **Actions extended with relevance view**: Existing actions are preserved and an additional action now opens a modal that displays applicability and relevance details.

### Added
- **Issuance metadata fields**: Added optional issuance metadata fields (`issuance_type`, `applicability_scope`, `relevance_notes`) in backend entity + schema + seed compatibility `ALTER TABLE` guard.
- **Traceability map expanded**: `ICT-ISSUANCE-RELEVANCE-MAP.md` now documents full comprehensive baseline coverage and source links.

### Verified (Smoke)
- `npm run db:seed` (backend) → success.
- `npm run build` (backend) → success.
- `npx tsc --noEmit` (frontend) → success.
- `npm run start:dev` (backend) → compiles cleanly in watch mode with 0 TypeScript errors.

### Rollback
- Revert issuance metadata field additions in entity/schema/seed.
- Revert issuances table/modal UI updates in frontend.
- Re-run `npm run db:seed` to restore previous baseline.

## [1.3.0.20] - 2026-03-03 — Issuances ICT Relevance Curation + Traceability Map

### Changed
- **Issuances seed baseline curated**: `backend/src/database/seed-data.sql` now includes only ICT-relevant operational/governance/safety issuances with direct applicability to digital operations and compliance controls.
- **Seed references normalized to authoritative links**: Core entries now point to Official Gazette pages (plus NPC page for DPA IRR) instead of generic agency/standards placeholders.
- **Non-baseline references removed**: International standards-only and non-specific homepage placeholders were removed from seeded Issuances module data to keep scope focused on enforceable local issuances.

### Added
- **ICT traceability document**: Added `ICT-ISSUANCE-RELEVANCE-MAP.md` with per-issuance rationale, category (operations/governance/safety), and source link.

### Verified (Smoke)
- `npm run db:seed` (backend) → success.
- `npm run build` (backend) → success.
- `npx tsc --noEmit` (frontend) → success.

### Rollback
- Revert `backend/src/database/seed-data.sql` issuance block and remove `ICT-ISSUANCE-RELEVANCE-MAP.md`, then re-run seed.

## [1.3.0.18] - 2026-03-03 — Subtle Trend Tilt, Applicability Scope Tightening, Repository Modal Download

### Changed
- **KPI/Reports trend arrowheads**: Minimum enforced arrowhead tilt is now subtle (`~5°`) so near-flat trends look natural while still showing direction.
- **Metrics applicability scope**: Unit-targeted sets remain `metric-005..008` (IT + `ICT Security Assessment`) and `metric-009..012` (Finance + `Finance Risk Report`), while Jan/Feb/Mar 2025 pending queue samples (`doc-017..022`) are now seeded as `Monthly Report` to avoid unintentionally matching targeted sets.
- **Repository modal actions**: Added in-modal download action so users can download the latest original file directly from preview dialog.

### Verified (Smoke)
- `npm run db:seed` (backend) → success; `metric_templates=12`, `metric_applicability=12`, `pending documents=10`.
- `npm run build` (backend) → success.
- `npx tsc --noEmit` (frontend) → success.

### Rollback
- Revert `TrendSparkline` min-tilt edits in KPI/Reports pages.
- Revert `doc-017..022` `document_type` values in `seed-data.sql`.
- Revert repository modal download action in `frontend/src/app/dashboard/repository/page.tsx`.

## [1.3.0.19] - 2026-03-03 — Natural Arrowhead Angle + Zigzag Non-Monthly Trend

### Changed
- **KPI/Reports trend arrowheads**: Removed enforced minimum tilt; arrowheads now follow the true terminal segment angle.
- **KPI/Reports trend sparkline shape**: Trend sparklines now support multi-point rendering. Quarterly, Semestral, and Annual views show zigzag movement across actual visible points instead of a compressed 2-point approximation.

### Verified (Smoke)
- `npm run db:seed` (backend) → success; `metric_templates=12`, `metric_applicability=12`, `pending documents=10`.
- `npm run build` (backend) → success.
- `npx tsc --noEmit` (frontend) → success.
- VS Code diagnostics for touched KPI/Reports/Repository/seed files → clean.
- DB count validation query confirms expected baseline counts.

### Rollback
- Revert `TrendSparkline` updates in KPI and Reports pages to the prior 2-point implementation.

## [1.3.0.17] - 2026-03-03 — Direction Glyph Simplification, Stronger Trend Arrowheads, Seed Runner Repair

### Fixed
- **Seed execution reliability**: Added missing `backend/src/database/seed.ts` used by `npm run db:seed`; this resolves failed reseed runs that prevented expected Documents/Metrics baseline data from loading.
- **Documents queue visibility (seed ownership)**: Pending sample documents (`doc-017..022`, plus pending `doc-008`/`doc-010`) are now seeded under focal ownership (`uploaded_by=3`) so they appear in the focal Documents queue.

### Changed
- **KPI/Reports Direction column**: Direction indicators now render arrows only (`↑` / `↓`) instead of text labels.
- **KPI/Reports trend arrowheads**: Arrowheads now enforce a minimum visual tilt so up/down direction remains obvious even when trend deltas are small.

### Added
- **Seed verification output**: `db:seed` now prints post-seed counters (active metric templates, applicability rows, pending documents) for immediate QA confirmation.

### Verified (Smoke)
- `npm run db:seed` (backend) → success; `metric_templates=12`, `metric_applicability=12`, pending documents populated.
- Frontend diagnostics clean on KPI/Reports pages.
- Backend build: `npm run build` (backend) → success.

### Rollback
- Revert this patch and re-run the previous known-good seed baseline.
- If needed, restore prior UI behavior by reverting `TrendSparkline` + `DirectionIndicator` changes in KPI/Reports pages.

## [1.3.0.16] - 2026-03-04 — KPI Direction Indicators, Trend Arrowheads, Repository Simplification, Jan–Mar Seeds

### Fixed
- **KPI scoring — `lower_is_better`**: Formula corrected to `target/actual*100` (with existing clamp), so lower actual values are properly rewarded and higher actual values are penalized.
- **KPI charting — KPI band pie filter scope**: `KPIs by Performance Band` now follows the active dashboard filters (year/frequency/period/unit) and no longer ignores selected unit scope.

### Changed
- **KPI Unit Detail table**: Added Direction indicator column (`↑ Higher`, `↓ Lower`) for each KPI.
- **Reports single-unit KPI table**: Added the same Direction indicator column for parity with KPI module.
- **Trend visuals (KPI + Reports)**: Trend sparklines now include arrowheads to make up/down direction immediately visible.
- **KPI band pie transparent logic parity**: Partial/incomplete-filter data is represented as a transparent dashed `PARTIAL` slice (same visual logic used by unit-level band distribution).
- **Repository table UX**: Removed status/compliance columns from repository list (repository already contains compliant/ready outputs only). Download action remains for reusing prior reports as baseline updates.

### Added
- **Seed — Documents module monthly samples**: Added 2025 January, February, and March report samples for both IT and Finance units (`doc-017`..`doc-022`) with matching versions (`ver-017`..`ver-022`).

### Verified (Smoke)
- Frontend TypeScript compile: `npx tsc --noEmit` (frontend)
- Backend build: `npm run build` (backend)

## [1.3.0.14] - 2026-03-04 — Repository Layout, KPI/Reports Chart Range Fix, Targeted Metrics & Test Docs

### Fixed
- **Repository — horizontal scrollbar**: Document table was rendered inside a narrow grid cell (~33% width). Restructured `BucketFolder` component to be a stateless folder tile; the document table is now rendered below the full-width folder grid in `AccordionDetails`, eliminating horizontal overflow.
- **Repository — spurious "Type" column**: Removed the `document_type` column from the repository document table (no `Type` column exists in the other modules or the DB schema).
- **KPI — monthly chart range incorrect**: `getTimeseriesRange` monthly case now always returns `fromMonth: 1` (January) regardless of selected month, so the all-units chart always shows Jan → selected month. Previously it only returned the prior month → current month window.
- **KPI — Unit Detail shows wrong period months**: `openUnitDashboard` now uses the full `getTimeseriesRange` result (`fromYear, fromMonth`) instead of the hardcoded `periodYear, 1`. Quarterly Q3 now shows only Jul–Sep; Semestral H2 now shows only Jul–Dec; Monthly Feb shows Jan–Feb.
- **KPI — blank 0-anchor replaced with per-unit first-null injection**: Instead of prepending a blank-label `{ label:'', score:0 }` before all data, both `allUnitsLineData` and `kpiDetailLineData` now inject `0` only at the **first visible period** for a unit/KPI that has no data there but has data later in the range. Units with no data at all in the period keep null (no line drawn). This gives IT Unit a true Jan→Feb comparison while Finance starts from 0 at Jan only because it has Feb data.
- **Reports — same chart range and injection fixes**: Applied the same `getTimeseriesRange` monthly fix (fromMonth=1), updated `unitTsQuery` to use `tsRange.fromYear/fromMonth` (not hardcoded Jan-1), and applied the first-null injection logic to both `allUnitsLineData` and `kpiDetailLineData`.

### Added
- **Metrics — 8 new unit-targeted templates** (`metric-005` through `metric-012`): Combined with the existing 4 global templates this gives 3 templates per metric type (section_check, keyword_check, property_check, date_check).
  - `metric-005..008`: IT Unit templates targeting `document_type='ICT Security Assessment'` — ICT section structure (Executive Summary/Risk Analysis/Mitigation Plan), cybersecurity keywords, vulnerability count, ICT submission deadline (day 5).
  - `metric-009..012`: Finance Unit templates targeting `document_type='Finance Risk Report'` — Finance section structure (Budget Summary/Variance Analysis/Recommendations), finance keywords (audit/budget/variance), transaction count, Finance submission deadline (day 7).
- **Seed — 4 metric-test documents** (`doc-011` through `doc-014`):
  - `doc-011` (IT, ICT Security Assessment): triggers all 8 global+IT-targeted templates — extracted text contains both section sets, both keyword sets, Total vulnerabilities: 7, Total incidents: 3.
  - `doc-012` (Finance, Finance Risk Report): triggers all 8 global+Finance-targeted templates — Budget Summary/Variance Analysis, audit/budget/variance keywords, Total transactions: 250.
  - `doc-013` (IT, Policy Document): triggers **only** the 4 global templates (no IT-specific applicability match) — confirms applicability filtering works correctly.
  - `doc-014` (Finance, Policy Document): triggers **only** the 4 global templates — same applicability isolation test for Finance.
  - All 4 docs include pre-computed `metric_results` rows (result-007 through result-030).

### Verified (Smoke)
- 0 TS errors — `npx tsc --noEmit` on frontend → clean

---

## [1.3.0.13] - 2026-03-04 — KPI/Reports Chart Anchoring, Unit Detail Fix, KPIs Needing Attention & Sample Docs

### Fixed
- **KPI — Unit Detail blank for partial-period units**: `openUnitDashboard` now always fetches timeseries from January 1 of the selected year (`periodYear, 1`) instead of the period start month. Units that only have Q1–Q2 data are now visible when the selected period is Q3, showing their historical trend rather than a blank "No trend data" message.
- **KPI — `kpiDetailLineData` X-axis labels wrong after full-year fetch**: Replaced `getXAxisLabel()` (which produced quarterly-relative labels like "Q3--5") with `MONTH_ABBR[pt.periodMonth - 1]` so the per-KPI detail chart always shows correct month abbreviations (Jan, Feb, …).
- **KPI — KPI detail table missing KPI name**: Table cell now renders both `item.name` (bold) and `item.code` (caption, secondary color) instead of code-only.

### Changed
- **KPI — All charts always anchor at 0**: `allUnitsLineData` and `kpiDetailLineData` both unconditionally prepend a `{ label: '', score: 0 }` anchor point so all trend lines start from the bottom-left of the chart regardless of selected period or frequency. Previously only January monthly got the anchor.
- **Reports — KPI Scores section matches KPI module exactly**: Added `TrendSparkline` function to Reports page; all-units table now has Color / Score / Trend / # KPIs columns (was Unit / Score / Band / KPIs Monitored). Single-unit KPI table gains Color swatch, KPI name + code combined cell, and Trend sparkline column.
- **Reports — `unitTsQuery` fetches from Jan 1**: Same fix as KPI module — always fetches full-year history for correct trend computation and partial-period visibility.
- **Reports — `allUnitsLineData` and `kpiDetailLineData` 0-anchor**: Same 0-anchor prepend applied to Reports page chart data.

### Added
- **Reports — "KPIs Requiring Attention" section**: A new highlighted table section appears between KPI Scores and Document Submissions whenever the selected period has any Red or Amber KPIs. For single-unit view, KPIs come from `unitDashQuery.data.details`; for all-units view, from the last `hasData` timeseries point per unit. Table columns: Unit (all-units only) | KPI Name | Code | Score | Band | Actual Value.
- **Seed — 8 sample compliance documents** (`doc-003` through `doc-010`): Added to `seed-data.sql` covering IT and Finance units, spanning 2025 Q2 through 2026 (Monthly, Quarterly, Annual, Incident, Compliance types). All documents contain text satisfying all 4 metric template rules: Introduction/Findings/Recommendations sections, compliance/regulation/policy keywords (min 2), "Total incidents: N" for property check, and a submission date within deadline for the date-check template.
- **User Manual — Consolidated Reports section**: New `manualItem` added for `/dashboard/reports` covering inputs (Year, Frequency, Unit) and outputs (Score Card, KPI Scores Chart, KPIs Requiring Attention table, Document Submissions Table).
- **User Manual — Report Repository section**: New `manualItem` added for `/dashboard/repository` covering folder navigation (Year Accordion, Period Folder) and outputs (Document Table, View Action, Download Action).

### Verified (Smoke)
- 0 TS errors — `npx tsc --noEmit` on frontend → clean

---

## [1.3.0.12] - 2026-03-03 — KPI Score Fix, Trend Sparklines, Band Chips & Reports Alignment

### Fixed
- **KPI Score — `lower_is_better` formula**: Corrected `computeRaw()` in `kpi.service.ts`. The old formula `(target/actual)*100` incorrectly scored a KPI like "Incident Resolution Time" (actual=3.1, target=4) as 129 → capped to 100. New formula: when `actual ≤ target` (performance is *better* than target) → `(actual/target)*100 = 77.5`; when `actual > target` (worse than target) → `(target/actual)*100`. Score is still capped at 100. All band assignments and composite unit scores downstream are recalculated accordingly.
- **Unit Detail — unit name "Unit 2" bug**: `dashboardUnit` endpoint now falls back to a DB lookup (`unitRepo.findOne`) when `rows[]` is empty (partial period with no monitoring data), instead of returning the generic `"Unit N"` string. The unit header now always shows the actual organizational name (e.g. "Finance Unit").
- **Monthly chart — single dot on January**: `getTimeseriesRange` in `kpi/page.tsx` now returns a 2-month window (prev month → current month) for February–December so a connecting line always renders. For January (no prior month), a synthetic score-0 anchor point is prepended to `allUnitsLineData` so a line from 0 → actual score is drawn instead of an isolated dot.
- **Trend sparklines — always showing flat/null**: Both the Unit KPI Scores table and the Unit Detail KPI table were passing `prev={null}` to `TrendSparkline` regardless of actual history. Fixed: `prevScore` is now the score of the **first** timeseries point with `hasData=true`; `currScore` is from the **last** such point. Quarterly/Semestral/Annual periods now show correct directional arrows and slopes.

### Changed
- **Unit Detail — Composite Score chip**: The `CardHeader` subheader text `"Composite Score: X • Band: green"` is replaced with an MUI `<Chip>` whose background color matches the unit's band (green/amber/red). When the unit has no KPI data for the period, the chip shows `"—"` on a grey background.
- **Unit Detail — incomplete data guard**: When `selectedUnitDashboard.details` is empty (partial period), the KPI table is replaced by a centered message: *"No KPI data available for this unit/period (partial period)."*
- **Band Distribution — second pie chart**: The "Band Distribution" section now uses `md={6}` (was `md={4}`) for the existing "Units by performance band" pie, and a new `md={6}` "KPIs by Performance Band" pie is added alongside it, derived from the last `hasData` point's `kpiScores[].band` across all units (`kpiBandDistribution` useMemo).
- **Reports — Card 2 all-units label**: When no unit is selected in the Consolidated Report, the second score card now shows `"All Units"` / "Reporting Scope" (was the numeric `unitCount` / "Units Reporting"). The numeric count is removed to avoid implying inaccurate active KPI counts.
- **Reports — KPI Scores section title**: When a unit is selected, the section header reads `"KPI Scores"` (was always `"KPI Scores by Unit"`).

### Verified (Smoke)
- 0 TS errors — `npx tsc --noEmit` on frontend → clean
- `get_errors` on `kpi/page.tsx` and `reports/page.tsx` → No errors
- Backend `computeRaw` unit-tested: `lower_is_better` actual=3.1 target=4 → 77.5 ✓; actual=5 target=4 → 80 ✓; actual=4 target=4 → 100 ✓

---

## [1.3.0.11] - 2026-03-02 — KPI Data-Gate, Multi-Frequency Reports & Report Visual Overhaul

### Added
- **KPI Dashboard — `hasDataForPeriod` gate**: A new `useMemo` boolean (`hasDataForPeriod`) checks whether any unit has at least one timeseries point with `hasData=true` for the selected period. When false:
  - The Unit KPI Scores table renders a "No KPI monitoring data for this period yet" row instead of empty unit rows with `—` values.
  - The Unit Detail panel is hidden entirely (not just empty).
  - A `useEffect` auto-closes any open Unit Detail card the moment the period changes to one with no data.
- **Consolidated Reports — Frequency selector**: The Report Parameters form now matches the KPI module: Year + Frequency (Monthly / Quarterly / Semestral / Annual) + sub-period picker (Month / Quarter Q1–Q4 / Semester H1–H2). Period labels update dynamically (e.g. "Q1 2026 (Jan–Mar)", "H2 2026 (Jul–Dec)", "Annual 2026").
- **Consolidated Reports — Unit name card**: When a specific unit is selected, the "Units Reporting" score card is replaced by a "Reporting Unit" card showing the unit name.
- **Consolidated Reports — KPIs Monitored** (renamed from "KPI Entries"): the third score card label now reads "KPIs Monitored".
- **Consolidated Reports — Single-unit KPI chart**: When a unit is selected, `ReportView` fetches `kpiApi.dashboardUnit` + `kpiApi.dashboardUnitTimeseries` and renders the KPI detail line chart (one line per KPI code, same style as the KPI module's Unit Detail chart), followed by an individual KPI breakdown table (Code | Actual | Target | Score | Band).
- **Consolidated Reports — All-units KPI trend chart**: When "All Units" is selected, a multi-line `LineChart` (one line per unit from `allUnitsTsQuery`) is rendered above the per-unit summary table, exactly mirroring the KPI Dashboard's Unit KPI Scores chart.
- **Consolidated Reports — Metrics Applied column**: The Document Submissions table now includes a "Metrics Applied" column showing how many metric templates from the Metrics module are linked to each document's type (via `metricsApi.listTemplates()` + `applicability[].document_type` matching). Shown as a small info `Chip`; `—` when none.
- **Consolidated Reports — Print icon/SVG fix**: Print CSS now includes `svg { display: none !important; }` — this suppresses all MUI icon SVGs (including the large `<Alert severity="info">` icon) in the printed output. All "no data" messages now use a plain `<Box>` with a blue left-border instead of `<Alert severity="info">`.
- **Consolidated Reports — Visual overhaul**: Report body upgraded to `Paper elevation={3}`, colored score cards with band-based border/text, `LinearProgress` on Overall Score card, section headers with MUI icons (`TrendingUp`, `InsertDriveFile`), `Legend` added to all charts, and recharts imported into the reports page.

### Changed
- **`ReportParams` interface** extended with `frequency`, `quarter`, `semester`, `unitName` fields; `ReportsPage` state now tracks `selectedFrequency`, `selectedQuarter`, `selectedSemester`.
- **KPI page unit table conditional rendering**: `availableUnits.map(...)` is now wrapped in a `hasDataForPeriod` check — empty-period states show a centered message row rather than rendering clickable rows with `—` values.
- **`selectedUnitDashboard` render guard**: changed from `{selectedUnitDashboard && ...}` to `{hasDataForPeriod && selectedUnitDashboard && ...}` so the Unit Detail panel is always hidden when the selected period has no data.

### Verified (Smoke)
- 0 TS errors — `get_errors` on both `kpi/page.tsx` and `reports/page.tsx` → No errors
- Frontend `npm run build` ✅ (Vite — 13 126 modules, 0 errors, 28 s)

---

## [1.3.0.10] - 2026-02-28 — Report Repository, Document Period Picker & Consolidated Reports

### Added
- **Report Repository (`/dashboard/repository`)**: New Google Drive-style page that groups all non-deleted documents into Year → Period-Bucket (month name, Q1–Q4, Annual) folders. Click a folder to reveal an inline document table with title, type, unit, status chips, upload date, and view/download actions. Admins/reviewers see all documents; focal users see their own uploads only.
- **Documents Period Picker** (uploader): The document upload form now displays a Year + Month/Quarter selector below the Document Type field (Month drop-down for monthly doc types, Quarter Q1–Q4 for quarterly, Year-only for annual). The expected filename preview and backend filename validation both use the user-selected period, enabling correct late submissions without filename mismatch errors.
- **Consolidated Reports (`/dashboard/reports`)**: New page where users select Year + Month (+ optional unit) and hit "Generate" to produce a printed-layout report combining: overall KPI score card (unit count, entry count, overall score), per-unit KPI scores table (Unit | Score | Band | KPI Count), and a documents submission table for that year (Title | Type | Unit | Period | Status | Submitted On). A "Print / Export PDF" button opens a print-ready popup window.
- **`GET /documents/repository`** backend endpoint (before `:id` to avoid route conflict): returns `{ years: [{ year, buckets: [{ key, label, count, documents[] }] }] }`. Period strings are parsed into human-readable bucket labels: `202601` → "January", `202601-03` → "Q1 (Jan–Mar)", `2026Q1` → "Q1 (Jan–Mar)", `2026` → "Annual".
- **`ReportorialDocTypeService.computePeriodSuffixFromParts` / `computeExpectedFilenameFromParts`**: new static helpers that compute the expected filename from explicit integer year/period inputs (rather than a `Date` object), mirroring the frontend period picker values. Used by `uploadDocument` when year/period are supplied by the client.
- **`computePeriodSuffixExplicit` / `computeExpectedFilenameExplicit`** in `frontend/src/lib/api/document-types.ts`: explicit overloads that accept `{ year, month?, quarter? }` integers instead of a `Date`.
- **Sidebar navigation**: "Repository" (FolderOpen icon, all roles) added to main nav after Documents; "Reports" (Summarize icon, super_admin/reviewer/focal) added to Administration section.
- **`documentsApi.getRepository()`** in frontend API client; `RepositoryBucket`, `RepositoryYear`, `RepositoryResponse` TypeScript interfaces added to `documents.ts`.

### Changed
- **`uploadDocument`** in `document.service.ts`: when `reportorial_doc_type_id` is provided, uses client-supplied `year` and `period` (if present) to compute the expected filename for validation, not the current server date. This allows late submissions to pass filename validation without modifying the system clock. Falls back to current date when year/period are absent.

### Verified (Smoke)
- 0 TS errors · Frontend `npm run build` ✅ (13 126 modules, 0 errors)
- Backend `nest build` ✅ (0 errors)
- `GET /documents/repository` registered before `GET /documents/:id` (no route conflict)
- Period picker initializes to current year/month/quarter; changes immediately update expected filename preview

---

## [1.3.0.9] - 2026-02-27 — KPI Dashboard: All-Units Table, Partial Scores, Trend Fix, Band Dist Partial Slice, Unit Detail Close Button & No Prev-Year X-Axis

### Fixed
- **Unit KPI Scores table now shows all available units, including partial-period ones**: Previously the table only iterated `summary.units` (units with data for the exact `effectiveMonth`). Finance Unit in Q3 (no September data) was completely absent from the table even though it had 2 months of Q3 data. The table now iterates `availableUnits` — every unit visible to the current user — ensuring all units always have a row regardless of data coverage.
- **Score column shows `—` for partial-period / incomplete units**: When a unit has no `summary.units` entry for the selected period (e.g. Finance in Q3 with data only up to August), the Score column now correctly shows `—` instead of misrepresenting a missing value.
- **Trend sparkline uses last available data point**: `TrendSparkline` in both the Unit KPI Scores table and the Unit Detail KPI table now anchors to the chronologically last month that has `hasData=true`, instead of the first. This means Finance Q3 trend correctly reflects the August score, not the July score.
- **No previous-year indicator**: `getTimeseriesRange` and `getXAxisLabel` no longer include a prior-year December anchor point. All frequency views (monthly, quarterly, semestral, annual) now start from the first month of the period. January trend therefore starts from 0 (upward or horizontal) instead of referencing Dec of the previous year.
- **Trend sparkline always starts at 0** when no prior period data exists — consistent with the start-at-zero rule above.

### Changed
- **Unit KPI Scores panel is now full-width (`xs={12}`)**: Removed the side-by-side `md={6}` layout — the Scores panel now occupies the full row width, giving more horizontal space to the chart and table.
- **Unit Detail panel is now stacked below Unit KPI Scores**: Unit Detail appears as a separate full-width (`xs={12}`) row below the Scores panel, instead of sitting side by side. This gives each panel more room and makes the layout less cramped.
- **Unit Detail hidden by default; shows only when a unit is selected**: Unit Detail card is no longer always rendered with an empty placeholder. It only appears when a unit row is clicked.
- **Close (×) button on Unit Detail**: An `IconButton` (`CloseIcon`) in the Unit Detail card header lets users dismiss the detail panel, collapsing it back and restoring the full Scores-only view.
- **Band Distribution: partial-period units shown as transparent/dashed slice**: Units with timeseries data but no summary entry for the select period (i.e. partial coverage) are now included in the pie chart as a white transparent segment with a dashed grey border, visually distinguishing them from scored bands.

### Verified (Smoke)
- 0 TS errors (`get_errors` on kpi/page.tsx → No errors)
- Frontend `npm run build` ✅ (Vite — 13 124 modules, 0 errors)
- Backend running on port 4000 (PID 47124)
- Finance Q3 timeseries: 3 points, hasData=2 (Jul/Aug); IT Q3: 3 pts, hasData=3 ✅
- Summary Aug 2025 overall=80.67 units=2 ✅
- Summary Q3 2025 overall=95.51 units=1 (Finance partial — shown in table as `—`) ✅

---

## [1.3.0.8] - 2026-02-27 — KPI UI Polish, Unit Filter Panel Collapse, Finance Partial-Period Lines Fix & Theme Toggle

### Fixed
- **Finance Unit lines not drawn in Q3/S2 views**: `loadDashboard` previously fetched timeseries only for units present in `summary.units` (those with data for the exact `effectiveMonth`). Finance has no September data, so it was absent from Q3 summary and its chart line was never drawn. Fixed by fetching timeseries for all `availableUnits` (union of `summaryUnitIds` and `availableUnits.map(u => u.id)`); Finance Q3 now shows Jun/Jul/Aug data with a null gap at September.
- **Unit filter did not auto-open Unit Detail**: When `filterUnitId` was set, the Unit Detail panel was not auto-populated on dashboard load. Added a new branch in `loadDashboard` to auto-fetch and populate the detail panel whenever a unit filter is active.
- **DocTypesPanel "None Yet" on accordion expand**: The Reportorial Document Types panel in the Units page showed "None yet" on every initial expansion because `load()` was only called inside `handleSave`/`handleDelete`. Added `useEffect(() => { load(); }, [])` so data loads automatically on accordion expand.

### Changed
- **Unit KPI Scores hidden when unit filter applied**: When a specific unit is selected in the Unit Filter dropdown, the Unit KPI Scores chart and table are hidden and the Unit Detail card expands to full width (`md={12}`).
- **KPI Score card progress bar is now band-colored**: The `LinearProgress` bar in the Overall KPI Score card uses `overallBandColor` (green/amber/red) instead of hardcoded blue (`#1976d2`).
- **Chart legends removed**: Removed `<Legend />` from all three charts (Unit KPI Scores line chart, Unit Detail line chart, Band Distribution pie chart). Color information is already shown in the Color swatch column in each table.
- **Band Distribution pie hover tooltip removed**: Removed `<Tooltip />` from the `PieChart` — counts are shown as bold white numbers inside each segment.
- **Theme mode toggle in AppBar user menu**: Dark/Light mode toggle added directly to the user account dropdown menu (upper right) for quick one-click access. Previously only accessible via the Settings page.
- **`unitColorMap` useMemo**: Stable per-unit color mapping based on `availableUnits` order ensures consistent colors between chart lines and table Color swatches across all re-renders.

### Verified (Smoke)
- 0 TS errors; `get_errors` on all 3 changed files → No errors
- Frontend `npm run build` ✅ (Vite — 13 118 modules, 0 errors)
- Backend running on port 4000, no DB errors
- Finance Q3 timeseries: 4 points, `hasData=3` (Jun/Jul/Aug) ✅
- DocTypes: IT=3, Finance=2 ✅; KPI Monitoring Aug 2025 = 10 rows ✅

---

## [1.3.0.7] - 2026-02-27 — Backend DB Fix, Always-Draw Chart Lines & Seed Cleanup

### Fixed
- **Backend `Unable to connect to database` on startup**: TypeORM `DB_SYNCHRONIZE=true` was attempting to auto-migrate the schema on every server start. This caused a `QueryFailedError: Cannot drop index 'fk_issue_type_category_id': needed in a foreign key constraint` error that looped indefinitely, preventing the backend from serving any requests. Fixed by setting `DB_SYNCHRONIZE=false` in `backend/.env`. The database schema is already correct and no migration is needed; synchronize was only causing destructive alteration attempts.
- **KPI multi-line chart — always draw lines regardless of frequency filter**: The Unit KPI Scores chart was skipping `<Line>` elements for any unit whose `allUnitsTimeseries` contained zero `hasData: true` points in the **currently visible** period. This meant that when filtering to a period where a unit had no entries (e.g., a quarterly unit in a monthly view), its line disappeared entirely. Removed the `hasAnyData` guard (`if (!hasAnyData) return null`) — all unit lines are now always rendered; individual data points that have no value remain as `null` (visual gap via `connectNulls={false}`).

### Cleanup
- **Removed stale seed files**: Deleted `backend/database/seed-data.sql` (empty copy) and `backend/src/database/seed.sql` (old file with deprecated KPI codes `KPI-IT-ONTIME`, `KPI-IT-QA`, `KPI-IT-COMP`). The sole authoritative seed file is now `backend/src/database/seed-data.sql` which contains the correct live-DB KPI codes (`KPI-IT-001`–`KPI-IT-005`, `KPI-FI-001`–`KPI-FI-005`) and full 2025 monitoring data.

### Verified (Smoke)
- Backend starts cleanly: `Nest application successfully started` with no DB errors in startup log
- Login OK, 5 roles, 2 units, 2 docs, KPI summary (overallScore=85.59, 2 units) ✅
- IT timeseries: 12 points, first point `hasData=True` ✅; Finance timeseries: 12 points ✅
- KPI Master: 10 records ✅; KPI Monitoring: 105 records ✅
- Document detail, metric templates, KPI thresholds all respond correctly ✅
- Frontend `npm run build` ✅ (Vite — 13 118 modules, 0 errors)

---

## [1.3.0.6] - 2026-02-28 — KPI Multi-line Charts, Color Column, Trend-Only Tables & Expanded Seed

### Changed
- **Unit KPI Scores — BarChart → multi-line LineChart**: The static bar chart is replaced with a `<LineChart>` that renders one `<Line>` per unit across the selected time window. Each unit line uses a unique color from the new `UNIT_COLORS` palette (`#1565c0`, `#6a1b9a`, `#00695c`, `#e65100`, …). Lines with zero data for the entire selected period are not rendered.
- **Unit KPI Scores table — columns revised**: Removed the Band (full-cell color block) column. Added a **Color** column (20×20 rounded swatch matching the chart line) and a **Trend** column (`TrendSparkline` using `first-hasData → last-hasData` point for start/end, colored by band). Columns are now: Unit | Color | Score | Trend | # KPIs.
- **Unit Detail — single composite line → multi-KPI LineChart**: The composite score line chart is replaced with a `<LineChart>` that renders one `<Line>` per KPI code, each with a unique color from `UNIT_COLORS`. The KPI codes are derived from `unitTimeseries[].kpiScores[].code`.
- **Unit Detail table — columns revised**: Removed the Band column. Added a **Color** column for each KPI row. Columns are now: KPI | Color | Actual | Target | Score | Trend.
- **Band Distribution**: Now computed directly from `summary.units[].band` (unchanged logic, but reflects the new seed data).
- **`loadDashboard` — all-units timeseries**: After fetching the dashboard summary, `loadDashboard` now calls `kpiApi.dashboardUnitTimeseries()` for every visible unit in a `Promise.all` and stores results in the new `allUnitsTimeseries: Record<number, UnitTimeseriesPoint[]>` state map. This feeds the multi-line Unit Scores chart.
- **Unit Detail auto-refresh**: Added `selectedUnitIdRef` (a `useRef<number|null>`) to track which unit is currently shown. On every `loadDashboard` call (triggered by filter changes), if a unit is already selected, its detail panel is re-fetched automatically — no manual re-click required.
- **Partial data / gap rendering**: `connectNulls={false}` (already in use) causes recharts to leave visual gaps for `null` score points (periods where `hasData: false`). Only units/KPIs with **no** data across the entire selected range are excluded from the chart entirely.
- **`Bar`/`BarChart` imports removed** from recharts import block (no longer used).
- **`useRef` added** to React import.

### Added
- **`UNIT_COLORS` palette constant**: `['#1565c0','#6a1b9a','#00695c','#e65100','#558b2f','#4527a0','#ad1457','#00838f']` — assigned cyclically by unit/KPI index.
- **`allUnitsTimeseries` state**: `Record<number, UnitTimeseriesPoint[]>` — stores per-unit timeseries indexed by `unitId`.
- **`selectedUnitIdRef`**: `React.useRef<number|null>` — persists the selected unit ID without triggering re-renders or appearing as a `useCallback` dependency.
- **`allUnitsLineData` memo**: Pivots `allUnitsTimeseries` + `summary.units` into a flat recharts-compatible array `{ label, u<unitId>: score|null }[]`.
- **`kpiDetailLineData` memo**: Pivots `unitTimeseries[].kpiScores` into `{ data: { label, [kpiCode]: score|null }[], codes: string[] }`.

### Seed
- **IT Unit (`unit_id=1`)**: Added monitoring rows for January–December 2025 (5 KPIs × 12 months = 60 rows). Existing Jun–Aug 2025 rows (35 already in DB) replaced by re-seed. Narrative arc: strong Jan–Mar (green), gradual dip Apr–May (green), continuation Jun (green ~98.76), amber Jul (~86.36), RED Aug (backup failure), recovery Sep–Dec back to green.
- **Finance Unit (`unit_id=2`)**: Added monitoring rows for February–August 2025 (5 KPIs × 7 months = 35 rows). Existing Jun–Aug 2025 rows replaced. Narrative arc: GREEN Feb–Jun (high accuracy), RED Jul (audit finding not resolved), AMBER Aug (recovery).
- **February 2026 data**: Updated to use correct live-DB KPI codes (`KPI-IT-001`–`KPI-IT-005`, `KPI-FI-001`–`KPI-FI-005`) replacing the previous `KPI-IT-ONTIME`/`KPI-IT-QA` etc. codes that existed only in the seed file but not in the live DB.
- **`kpi_master` INSERT in seed-data.sql** updated to match live DB KPI definitions (System Uptime, Incident Resolution Time, Help Desk Satisfaction, Backup Success Rate, Network Availability | Budget Utilization Rate, Report Submission Accuracy, Collection Efficiency, Audit Finding Resolution, Financial Statement Timeliness).
- Seed SQL verified: `SELECT unit_id, period_year, period_month, COUNT(*) FROM kpi_monitoring GROUP BY ...` → IT: 13 periods × 5 KPIs, Finance: 8 periods × 5 KPIs.

### Verified (Smoke)
- 0 TS errors; `get_errors` tool on kpi/page.tsx → No errors found
- Frontend `npm run build` ✅ (Vite — 13 118 modules, 0 errors)
- Seed executed: IT Unit 60 + Finance 35 + 2026 demo data all present in DB
- `SELECT COUNT(*) FROM kpi_monitoring WHERE period_year = 2025` → 95 rows (was 35)

---

## [1.3.0.5] - 2026-02-27 — KPI Sparkline Diagonal Fix & Pie Chart Label Fix

### Fixed
- **TrendSparkline always horizontal**: The sparkline in the KPI Detail table Trend column was always drawing a horizontal line because when `prev` was `null` (no historic period data), `startVal` fell back to `current` (`prev ?? current ?? 0`), making both endpoints the same y-coordinate. Fixed to `startVal = prev !== null ? prev : 0` — when there is no prior period, the sparkline now shows a diagonal from 0 (baseline) up to the current score. When both periods have data and values differ, the sparkline shows the correct ascending or descending diagonal.
- **Band Distribution pie chart outer text labels**: The pie chart was rendering `"BAND: N"` strings as outer callout labels via recharts `label` prop, which cluttered the visualization. Removed the outer text label entirely; the count number is now rendered **inside** the colored pie segment (white bold text, centered in each slice). The legend below remains unchanged.

### Verified (Smoke)
- 0 TS errors; `tsc --noEmit` exits 0
- Frontend `npm run build` ✅ (Vite — 13 118 modules, 0 errors)
- Backend `npm run build` ✅ (NestJS — 0 errors)
- Timeseries Jun→Jul (both periods with data): 2 points, scores 98.77 → 86.36 — sparklines now diagonal for all KPIs where value changed
- KPI-IT-002 Jun=100 Jul=61.54 — steep downward diagonal confirmed
- KPI-IT-004 Jul=100 Aug=0 (Yes/No flip) — steep downward diagonal confirmed
- Band Distribution pie: number inside colored segment, no outer text
- `GET /api/kpi/dashboard/summary?periodYear=0&periodMonth=2` → HTTP 400 ✅
- August 2025 overall score: 80.67 (2 units) ✅

---

## [1.3.0.4] - 2026-02-28 — KPI Dashboard UI Overhaul & In-App User Manual KPI Section

### Changed
- **Overall KPI Score Card**: Removed band-colored left border and 'Band:' caption; LinearProgress bar now uses a neutral blue (`#1976d2`) to avoid visual noise at the aggregate level.
- **Band Scale chips**: Now display only the numeric range (e.g., `90–100`) — band color name text removed for cleaner legend.
- **Unit KPI Scores table**: Columns restructured to Unit | Current Score | Band | # KPIs. Band column is a full-cell color block (no text chip). 'Detail' button column removed — click anywhere on the row to drill in.
- **Unit Detail — Line Chart**: Replaced per-KPI bar chart with a composite score **trend line chart** showing score trajectory over time. Monthly=2 pts, Quarterly=4 pts, Semestral=7 pts, Annual=13 pts (includes prior period baseline). Each dot is color-coded by band; null periods render as gaps.
- **Unit Detail — KPI table**: Columns restructured to KPI | Actual | Target | Score | Trend | Band. Trend column shows a 60×24 SVG sparkline (grey start dot → band-colored end dot). Band column is a full-cell color block.

### Added
- **Backend timeseries endpoint**: `GET /kpi/dashboard/unit/:unitId/timeseries?fromYear&fromMonth&toYear&toMonth` — returns per-period composite score + per-KPI breakdown for any date range (safety cap: 60 periods).
- **Frontend kpi.ts**: `UnitTimeseriesPoint` interface and `kpiApi.dashboardUnitTimeseries()` method.
- **Helper functions in kpi/page.tsx**: `getTimeseriesRange()` (computes correct historical window per frequency), `getXAxisLabel()` (formats period labels), `TrendSparkline` component (inline SVG).
- **In-app User Manual — KPI section**: Full `KPI Monitoring & Dashboard` entry added to `/dashboard/user-manual` page covering purpose, all inputs (Period Year, Frequency, KPI Code/Name/Type/Direction/Target/Weight/Actual, Remarks) and all outputs (Overall Score Card, Band Scale Legend, Unit Scores Table, Trend Line Chart, KPI Detail Table with sparklines, Band Distribution Pie).
- **`'section_head'` role** added to `ManualRole` union type in user-manual/page.tsx.

### Verified (Smoke)
- 0 TS errors; `tsc -b` exits 0
- Frontend `npm run build` ✅ (Vite — 13 118 modules, 0 TS errors)
- Backend `npm run build` ✅ (NestJS — 0 TS errors)
- Timeseries endpoint tested: `GET /kpi/dashboard/unit/1/timeseries?fromYear=2025&fromMonth=6&toYear=2025&toMonth=8` → 3 data points with score + band + kpiScores array
- Unit Detail panel shows LineChart with colored dots and sparklines in KPI table

---

## [1.3.0.3] - 2026-02-27 — KPI NaN Fix, Period Frequency, Labels, Legend and Seed Data

> **Post-release seed & doc fix (2026-02-27):**
> - Re-seeded KPI monitoring data from Mar-May 2025 to **Jun-Aug 2025** to enable quarterly Q2 simulation (Q2 end-month = June).
> - Fixed Section I of QA-USER-MANUAL.md: corrupted Unicode characters replaced with ASCII equivalents; smoke checks updated to reference June 2025 seed data and quarterly navigation steps; formula notation corrected.

### Fixed
- **NaN SQL error on dashboard load**: 4x Unknown column 'NaN' in where clause errors eliminated. Guards in frontend loadDashboard/openUnitDashboard and backend service methods dashboardSummary, dashboardUnit, listMonitoring.
- **Backend unguarded query params**: dashboardSummary/dashboardUnit validate periodYear (2000-2100) and periodMonth (1-12), returning HTTP 400 on invalid input instead of NaN SQL error.
- **Controller query coercion**: @Query params for dashboard endpoints use ParseIntPipe({ optional: true }) for automatic numeric type enforcement.

### Added
- **Period frequency selector**: Monthly / Quarterly / Semestral / Annual dropdown; derived effectiveMonth used across all API calls.
- **Semestral KPI frequency**: Backend entity enum, DTO, frontend type, KPI Master dialog, DB ALTER TABLE all updated.
- **Band color legend**: Dynamic chip row below scorecards showing threshold ranges (Green/Amber/Red) sourced from live thresholds API.
- **KPI seed data**: 10 KPI masters (5 per unit) and 30 monitoring rows (3 months x 10 KPIs) for demo/testing.
- **QA-USER-MANUAL.md section I**: KPI Module full user guide -- band definition, scoring math, CRUD steps, dashboard guide, role table, 12-item smoke checklist.

### Changed
- **Bar chart X-axis**: Unit names truncated to 16 chars + ellipsis; ticks rotated -25 degrees to prevent overlap for 7+ units.
- loadMonitoring and loadDashboard use effectiveMonth derived from frequency picker.

### Verified (Smoke)
- 0 TS errors; frontend 
pm run build exits 0
- Dashboard summary/unit API: 200 OK with seeded data (2 units, 10 KPIs)
- Invalid inputs (year=0, month=99): HTTP 400 as expected
- Monitoring list (all months): 10 rows per month

---

## [1.3.0.2] - 2026-02-27 â€” KPI Dashboard Default View, Chart Empty-State, Visual Scorecards

### Fixed
- **KPI Dashboard hidden behind tabs**: KPI Dashboard tab was positioned at index 2 for manage-role users (super_admin, reviewer, section_head), meaning graphs were never visible on page load. Dashboard tab is now always tab 0 (first/default) for all roles.
- **KPI Monitoring tab condition bug**: `canManage && tab === 1` guard was broken by incorrect nested condition. Simplified and corrected.
- **Pie chart unclosed JSX block**: Structural JSX error in the Band Distribution pie card caused a runtime tree mismatch. Fixed indentation and added proper conditional closure.
- **`overallBand` missing from API type**: `DashboardSummaryResponse` does not include `overallBand`. Replaced with computed `computeBand()` helper using the returned `thresholds` array.
- **`MuiTooltip` unused import**: Removed unused aliased import that was imported but never referenced.

### Changed
- **KPI tab order**: Tabs reordered to `[KPI Dashboard, KPI Master*, KPI Monitoring*]` (* = manage roles only). Default tab 0 = Dashboard for everyone.
- **Scorecard visuals**: Overall KPI Score card now shows a color-coded left border, bold score, band label, and `LinearProgress` bar colored by band (green/amber/red).
- **Unit score table**: Band chips are now color-filled with BAND_COLORS matching the chart; clicking a row selects it for unit detail drill-down.
- **Unit detail panel**: Header shows composite score and band inline. Chart shows bar labels above each bar. Added `Band` column to the details table with colored chip.
- **Band distribution pie**: Added `Legend` component and better label formatting; conditional empty state shown when no data.
- **Empty states**: All three chart areas (unit scores, unit detail, band distribution) show a descriptive empty-state message when there is no data for the selected period instead of blank containers.

### Verified (Smoke)
- Frontend build: `npm run build` âœ… (exit code 0)
- Backend build: `npm run build` âœ…
- SUPER_LOGIN_OK, FOCAL_LOGIN_OK âœ…
- ROLES=5, DOCS=2, UNITS=2, METRICS=16, TICKETS=1 âœ…
- KPI super summary: overall=100 units=1 âœ…
- KPI thresholds=3, scoring rules=1 âœ…
- KPI focal summary: overall=100 units=1 âœ…
- KPI focal unit detail: unitId=1 score=100 band=green âœ…
- AUTH_ME no passwordHash leak âœ…

### Documentation Updated
- `CAPABILITIES.md`
- `CHANGELOG.md`
- `README.md`
- `INSTALLATION.md`
- `WALKTHROUGH.md`

---

## [1.3.0.1] - 2026-02-27 â€” KPI Access Hotfix, Graph Dashboard Upgrade, Toast Notification Standardization

### Fixed
- **KPI focal access denied issue**: Hardened KPI unit-scope resolution to support token unit formats and fallback to DB unit mapping when token units are missing/empty.
- **KPI super admin internal server error**: Guarded KPI unit-detail score computation from orphan monitoring rows with missing KPI master relation.
- **KPI navigation routing bug**: Sidebar navigation now uses React Router navigation hooks consistently with app routing, resolving KPI button misroute to dashboard.
- **KPI route registration gap**: Added `/dashboard/kpi` route wiring in app router to ensure direct KPI page rendering.

### Changed
- **KPI dashboard UX**: Upgraded KPI page dashboard section to graph-first layout (unit score bar chart, band distribution donut, KPI normalized bars) while preserving KPI master and monitoring workflows.
- **Dashboard home KPI overview**: Added KPI overview cards/list in main dashboard for all roles; super admin/reviewer see consolidated scope, unit roles see unit-scoped KPI output.
- **Notification standardization**: Migrated remaining inline frontend alerts and browser `alert()` usage to `notistack` toast notifications across login, upload, metrics validation, reviews, settings dialog errors, and module status feedback.

### Verified (Smoke)
- Frontend build: `npm run build` âœ…
- Backend build: `npm run build` âœ…
- KPI smoke (super admin): summary endpoint âœ…
- KPI smoke (focal): summary + unit detail endpoints âœ…
- Core API smoke: auth login, roles, documents, units âœ…

### Documentation Updated
- `CAPABILITIES.md`
- `CHANGELOG.md`
- `README.md`
- `INSTALLATION.md`
- `WALKTHROUGH.md`

---

## [1.2.0.4] - 2026-02-26 â€” KPI Monitoring Module, KPI Dashboard, User/Role Management Enhancements

### Added
- **KPI Module (new)**: Added `backend/src/modules/kpi` with secure endpoints for:
  - `KPI Master` (`/api/kpi/master`)
  - `KPI Monitoring` (`/api/kpi/monitoring`)
  - `KPI Dashboard` (`/api/kpi/dashboard/summary`, `/api/kpi/dashboard/unit/:unitId`)
  - `Lookup Tables` (`/api/kpi/lookups/thresholds`, `/api/kpi/lookups/scoring-rules`)
- **KPI Master table structure aligned to requirements**:
  - `code` (primary key), `name`, `description`, `unit_id`, `type`, `unit_of_measure`, `direction`, `target_value`, `weight`, `frequency`, `active`
  - Removed `min_value` / `max_value`
- **KPI Monitoring table structure aligned to requirements**:
  - `kpi_master_code`, `unit_id`, `period_year`, `period_month`, `actual_value`, `remarks`, `entered_by_staff_id`, `entered_by_name`, `status`
  - `status` supports `draft` / `locked`
  - Removed `submitted_at`
- **Lookup tables added**:
  - `kpi_thresholds`
  - `kpi_scoring_rules`
- **Frontend KPI workspace page**: Added `Dashboard â†’ KPI` (`/dashboard/kpi`) with role-aware tabs for KPI Master, Monitoring, and Dashboard.

### Changed
- **User edit behavior**:
  - Existing users can now be edited for name, email, role, position/designation, and assigned unit(s).
  - `staff_id` is now immutable by design (locked in UI and rejected in update DTO/service path).
- **System roles management**:
  - Added persisted role definitions (`role_definitions` table) and API create/update/list support.
  - Settings `System Role Definitions` now supports add/edit metadata (label, description, assignable).
- **Sidebar navigation**:
  - Added KPI entry in Administration navigation for permitted roles.

### Security / Access
- KPI endpoints enforce role and unit visibility server-side:
  - Focal users see only allowed units in KPI dashboard data.
  - Compliance/Admin roles can manage KPI master and monitoring.
  - Super admin controls lookup table maintenance.

### Database / Seed Updates
- Updated `schema.sql` with:
  - `role_definitions`
  - `kpi_master`
  - `kpi_monitoring`
  - `kpi_thresholds`
  - `kpi_scoring_rules`
- Updated `seed.sql` and `seed-data.sql` with role definition seeds and KPI baseline records.
- Updated `init.sql` to use current `users.active` column naming.

### Documentation Updated
- `CAPABILITIES.md`
- `CHANGELOG.md`
- `README.md`
- `INSTALLATION.md`
- `WALKTHROUGH.md`
- `QA-USER-MANUAL.md`
- `.bmad/02_ARCH.md`

### Verified (Smoke)
- Frontend TypeScript: `npx tsc --noEmit` âœ…
- Frontend build: `npm run build` âœ…
- Backend TypeScript: `npx tsc --noEmit` âœ…
- Backend build: `npm run build` âœ…
- API smoke: login + KPI dashboard summary endpoint âœ…
- API smoke: staff ID update attempt rejected (`property staffId should not exist`) âœ…

---

## [1.2.0.3] - 2026-02-26 â€” Bug Fixes: Toast Notifications, Units in Login, Create User Modal, Pagination, Dashboard Date

### Fixed
- **Documents pagination label shows "Page 1-1 of 1"**: `labelDisplayedRows` was using `Page ${page}-${page} of ${totalPages}`. Fixed to `Page ${page} of ${totalPages}`.
- **Create User error appears in card (outside dialog)**: The error `<Alert>` was placed in `<CardContent>` outside the `<Dialog>`. Replaced with `createError` state rendered inside `<DialogContent>` so errors appear within the modal. On success, the dialog closes and a toast is shown.
- **Unit multi-select dropdown stays open after selecting**: Added `<Checkbox>` + `<ListItemText>` to each `<MenuItem>` in the multi-select. MUI multi-select with checkboxes gives proper visual feedback without requiring menu closure per selection.
- **Created user role not reflected in table**: Root cause was the error placement bug causing confusion. Role is now sent correctly via `usersApi.create(form)` with the selected `form.role` value. Fixed code path is now clear.
- **Unit not shown in Settings â†’ Account Information after login**: Added "Assigned Units" row to the Account Information card displaying unit chips. Also fixed the root cause (login response missing `units`).
- **Unit not auto-populated in Document Upload for focal users after login**: Backend `auth.service.ts` `login()` now includes `units: user.units?.map(u => ({ id, name })) || []` in the returned user object. Frontend `AuthContext.login()` additionally calls `getProfile()` after login to guarantee full user profile with units is populated.
- **Dashboard shows "Incident Response (Today 8AM - 5PM)"**: Replaced hardcoded string with dynamic date using `date-fns`: `Incident Response â€” {format(new Date(), 'EEEE, MMMM d, yyyy')}` (e.g., "Incident Response â€” Wednesday, February 26, 2026").
- **All alerts/notifications were inline banners**: Migrated action feedback (create, update, delete, submit errors/successes) across all pages to `notistack` Snackbar toasts. Inline `Alert` components remain only where they provide contextual status (e.g., document preview error, compliant status indicator, filename preview hint).

### Added
- **Toast notification system (notistack v3)**: Installed `notistack@3.0.2`. `SnackbarProvider` added to `ThemeModeContext` wrapping the entire app â€” top-right position, max 4 snacks, 4-second auto-hide. All pages now use `useSnackbar()` from notistack for success/error/warning toasts.
- **`units` field in `AuthResponse` interface**: `auth.interface.ts` updated to include `units: { id: number; name: string }[]` in the user object.

### Changed
- **`AuthContext.login()`**: After receiving the login response (which now includes `units`), also calls `authApi.getProfile()` for full profile data. Non-blocking fallback if profile fetch fails.
- **`backend/auth.service.ts`**: `login()` now returns `units: user.units?.map(u => ({ id: u.id, name: u.name })) || []` in the user payload.
- **Settings page**: Replaced `msg/setMsg` state + inline `<Alert>` pattern with `useSnackbar()` toasts for all success/error notifications. Create User dialog now shows errors inline (`createError` state) within `<DialogContent>`.
- **Packets migrated to notistack**: `settings/page.tsx`, `DocumentUpload.tsx`, `issuances/page.tsx`, `tickets/page.tsx`, `tickets/[id]/page.tsx`, `reviews/page.tsx`, `ReviewForm.tsx`.

### Dependencies
- `notistack@3.0.2` added to `frontend/package.json`

### Verified (Smoke Tests Passed)
- Backend TypeScript: 0 errors âœ…
- Frontend TypeScript: 0 errors âœ…
- Frontend Vite build: âœ“ 12345 modules transformed, exit 0 âœ…
- Backend NestJS build: exit 0 âœ…
- Pagination: "Page 1 of 1" displays correctly âœ…
- Login response includes `units` array âœ…
- `AuthContext` calls `getProfile()` after login âœ…
- Create User dialog error shown inside modal âœ…
- Unit multi-select has checkboxes âœ…
- Account Information card shows Assigned Units âœ…
- Dashboard header shows formatted date âœ…

---

## [1.2.0.1] - 2026-02-26 â€” Reportorial Document Types, Nav/UI Fixes, Metrics Linked to Documents

### Added
- **Reportorial Document Types system**: New `reportorial_document_types` table per-unit. Each type has a `base_name` (e.g., `Incident_Report`), `display_name`, `submission_frequency` (monthly/quarterly/annual), and auto-computed period suffix. Filename format: `{base_name}_{period_suffix}` (e.g., `Incident_Report_202602` for February 2026 monthly).
- **Document upload filename validation**: Uploaded filename is validated against the expected `{base_name}_{period_suffix}` format on both client and server. Front-end shows a dynamic preview of the expected filename.
- **Metrics linked to documents (not units)**: `metric_applicability` now has a `reportorial_doc_type_id` FK. The Metrics Template Builder UI replaced the "Unit + Document Type (free text)" selectors with a single "Reportorial Document Type" dropdown fetched from the new API.
- **Units page â€” Reportorial Documents CRUD**: Each unit row is now an expandable accordion with a full in-page CRUD table for its `ReportorialDocumentType` records (display name, base name, frequency, sample filename, active toggle).
- **User Management â€” Unit selector**: "Create New User" is now a button opening a dialog with a multi-select for "Assigned Units" (`unitIds[]`) sent to the backend `CreateUserDto`.
- **4 metric template examples per type (16 total)**: Seed data expanded from 4 (1 per type) to 16 (4 per type): section_check, keyword_check, property_check, and date_check each have 4 distinct real-world templates.
- **Seed data â€” Reportorial Document Types**: 4 examples seeded (2 per unit) including monthly ICT Narrative, quarterly ICT Security Report, monthly Finance Memo, and annual Finance Compliance Report.
- **PageTitleContext**: New React context (`PageTitleProvider` / `usePageTitle()`) allows detail pages to set a human-readable breadcrumb title. Document detail page now sets the document's `title` so breadcrumbs show the document name instead of a raw UUID.

### Fixed
- **Deactivate/Activate user button fails ("Failed to update user status.")**: Frontend was sending `{ is_active: false }` but backend DTO uses `active`. Fixed `users.ts` to send `{ active: false/true }`. Also fixed `UpdateUserDto` to include `active?: boolean` and `users.service.ts` `update()` to handle it. `findAll()` now returns ALL users (including inactive) so the management table shows deactivated accounts.
- **Dashboard nav item always highlighted**: `pathname?.startsWith('/dashboard/')` matched every page. Fixed to use exact match `pathname === '/dashboard'` for the Dashboard nav item only.
- **Breadcrumbs show raw UUID**: AppBar now skips the `dashboard` segment when other segments exist, and for UUID/numeric-ID segments shows the `pageTitle` context value (e.g., the document title) or omits the segment entirely.
- **Issuances visible to all roles**: Sidebar now restricts Issuances to `super_admin` and `reviewer` roles only (compliance officers).
- **Version history layout breaks with long filenames**: `TimelineOppositeContent` now has a fixed `90px` width (`flex: 0 0 90px`) and the file name in `CardContent` has `wordBreak: break-word`.

### Changed
- **Document upload UI**: Completely overhauled. Removed free-text `document_type`, `period`, and `year` fields. Focal users have their unit auto-populated; all users select a Reportorial Document Type for their unit, which auto-computes the expected filename. `reportorial_doc_type_id` is now sent with every upload.
- **User Management form layout**: "Create New User" inline form replaced with a dialog opened by a button in the card header.

### Verified (Smoke Tests Passed)
- Backend build: 0 TypeScript errors âœ…
- Frontend build: 0 TypeScript errors, clean Vite output âœ…
- `GET /api/document-types` â†’ 200 with empty array (no seeded doc types via API in dev, seed via SQL) âœ…
- `GET /api/metrics` â†’ 16 metric templates after seed âœ…
- `PATCH /api/users/:id { active: false }` â†’ 200 (deactivate fix) âœ…
- Dashboard nav highlight: exact match only âœ…
- Breadcrumb on document detail page: shows document title âœ…

---

## [1.1.2.3] - 2026-02-25 â€” Hotfix: On-Demand DOCX Preview, Security Serializer, EADDRINUSE Docs

### Fixed
- **DOCX document preview returning 404 ("Preview not available")**: Uploaded DOCX files whose `generate-preview` Bull queue job failed silently (no `preview_blob` in DB) now generate an HTML preview on first request via mammoth. `getPreview()` in `version.service.ts` gained a "Priority 3" on-demand fallback: reads `file_blob`, invokes `mammoth.convertToHtml()`, wraps in styled HTML, and saves the result back to `preview_blob + preview_mime_type='text/html'` non-blocking for future caching. Real-world upload (DSWD FO II AIMS Policy.docx 1.7 MB) confirmed: endpoint returns `200 text/html` 38 KB.
- **`passwordHash` exposed in all API responses**: `@Exclude()` on `User.passwordHash` was present on the entity class but had no effect because `ClassSerializerInterceptor` was never registered globally. Added `app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)))` in `main.ts`. Re-tested `/api/auth/me` and `/api/users` â€” `passwordHash` no longer appears in JSON responses.
- **`Error: listen EADDRINUSE :::4000` on backend restart**: Documented resolution (kill existing PID before restart) in INSTALLATION.md. Caused by a stale `npm run start:dev` background process retaining the port across sessions.

### Verified (Smoke Tests Passed)
- **Login** (`POST /api/auth/login`): Returns valid JWT âœ…
- **Roles** (`GET /api/users/roles`): Returns 5 system role definitions âœ…
- **`passwordHash` in `/auth/me`**: Not exposed âœ…
- **`passwordHash` in `/users`**: Not exposed âœ…
- **Documents list** (`GET /api/documents`): Returns 3 documents (2 seeded + DSWD upload) âœ…
- **Seeded HTML preview** (`ver-001`): `Content-Type: text/html; charset=utf-8` âœ…
- **DSWD DOCX on-demand preview** (`750f3ff2-â€¦`): `200 text/html` 38 KB generated live via mammoth âœ…
- **DSWD document download**: `200` `attachment; filename="DSWD FO IIâ€¦Policy.docx"` 1.7 MB âœ…
- **Metrics** (`GET /api/metrics`): 4 templates (section_check, keyword_check, property_check, date_check) âœ…
- **Units** (`GET /api/units`): 2 seeded units âœ…

### Notes
- Queue-based preview generation still runs in the background but is no longer the sole path to a working DOCX preview. The on-demand fallback ensures the viewer works immediately on first request.
- The cached `preview_blob` is written asynchronously after the first preview request, so subsequent requests hit Priority 1 (blob exists) instead of running mammoth again.

---

## [1.1.2.2] - 2026-02-25 â€” Startup Fix: UTF-8 BOM in package.json

### Fixed
- **Frontend dev server crash (`npm run dev` exits 1)**: The `frontend/package.json` file was saved with a UTF-8 BOM (Byte Order Mark, `0xEF 0xBB 0xBF`) by an editor. Vite's PostCSS config loader uses `JSON.parse()` directly, which cannot handle BOM-prefixed JSON â€” it throws `SyntaxError: Unexpected token 'âˆ©â•—â”'`. Removed the BOM bytes from `frontend/package.json`.
- **Backend `npm run start:dev` exit 1 (spurious)**: `backend/package.json` also contained a UTF-8 BOM from the same editor save event. Removed BOM to ensure clean JSON parse across all tooling.

### Verified (Smoke Tests Passed)
- **Login** (`POST /api/auth/login`): Returns valid JWT for `admin@rictms.gov.ph` âœ…
- **Roles** (`GET /api/users/roles`): Returns 5 system role definitions âœ…
- **Documents list** (`GET /api/documents`): Returns 2 seeded documents âœ…
- **Document version** (`GET /api/documents/doc-001`): Version `ver-001` present âœ…
- **Document Preview** (`GET /api/documents/doc-001/versions/ver-001/preview`): `Content-Type: text/html; charset=utf-8` âœ…
- **Document Download** (`GET /api/documents/doc-001/versions/ver-001/download`): `Content-Disposition: attachment; filename="ICT_Compliance_Q1_2024.pdf"` âœ…
- **Metrics templates** (`GET /api/metrics/templates`): Returns metric templates âœ…
- **Units** (`GET /api/units`): Returns 2 seeded units âœ…
- **Frontend** (Vite dev server on port 3000): Starts cleanly after BOM removal âœ…
- **Backend** (NestJS on port 4000): All routes registered and responding âœ…

### Notes
- Root cause: Some text editors (Notepad, older VS Code, PowerShell `Set-Content`) save files with UTF-8 BOM by default. JSON parsers following the spec must reject BOM. The fix strips the 3-byte BOM prefix before JSON content begins.
- No code logic changes â€” this is purely a file encoding fix.
- All v1.1.2 functionality (HTML preview, Content-Disposition download, role management, settings cards, user manual) confirmed working.

---

## [1.1.2] - 2026-02-25 â€” Document Viewer, Metrics Seed, Dynamic Roles, Settings Cards

### Fixed
- **Document Download "blob" issue**: Added `exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']` to CORS configuration â€” browser can now read the `Content-Disposition` header to extract the proper filename and extension when downloading documents.
- **Document Preview "not available" (DOCX on Windows)**: Replaced LibreOffice (`soffice`) dependency in the preview processor with a `mammoth` HTML fallback. DOCX files are now converted to styled HTML when LibreOffice is unavailable, and saved as `preview_blob` with `preview_mime_type: 'text/html'`.
- **Seeded documents showing no preview**: Replaced the 15-byte fake PDF stub in seed data with full styled HTML preview content. Both seeded documents now render immediately in the Document Viewer without requiring re-processing.
- **Reviews "Unable to load digital preview"**: Fixed by propagating `mimeType` through `getPreviewBlobUrl()` return value and passing it to `DocumentViewer` as a prop. The viewer now branches correctly: iframe for HTML, react-pdf for PDF.
- **`getPreview()` priority bug**: Preview blob is now returned first (before falling back to raw PDF), so HTML previews generated for PDF source documents display correctly.
- **`preview_path` TypeScript type**: Changed from `string` to `string | null` in entity to match the nullable DB column.

### Added
- **`preview_mime_type` column** on `document_versions` table: tracks the MIME type of the preview blob (`application/pdf` or `text/html`). Added via `ALTER TABLE` and entity sync.
- **`GET /api/users/roles` endpoint**: Returns all 5 system role definitions with `value`, `label`, `description`, `assignable`, and `is_system` flags. Placed before the `/:id` wildcard route to avoid routing conflict.
- **Role Management card in Settings**: Super admin can now view all system roles in a table with descriptions and assignability status. Opens a detail dialog per role.
- **Dynamic role dropdown in Focal User Management**: Replaced hardcoded `focalRoleOptions` array with live `GET /users/roles` call. Role dropdown shows only assignable roles.
- **Activate/Deactivate user buttons**: Existing users table now includes an activate/deactivate toggle per user.
- **Change Role dialog**: Edit (pencil) icon opens a dialog to change an existing user's role, with purpose description shown per option.
- **4 metric template types in seed**: Added `property_check` (incident count) and `date_check` (monthly submission deadline) templates alongside existing `section_check` and `keyword_check`. 6 metric results seeded.
- **Settings page card-based layout**: Refactored from single `Paper` container to individual `Card` components â€” Account Information, Theme Preference, Change Password, Role Definitions, Focal User Management.
- **"Document Viewer" label**: Renamed "Document Preview" to "Document Viewer" in the document detail page.
- **DocumentViewer HTML iframe support**: New branch in `DocumentViewer.tsx` renders HTML previews in a sandboxed `<iframe>` with an "Open in Tab" button. PDF branch unchanged (react-pdf).
- **User Manual expanded field explanations**: All 7 modules now have comprehensive per-field input and output descriptions. New "Settings and Role Management" module added. Close button added to detail dialog.

### Changed
- `getPreviewBlobUrl()` in `frontend/src/lib/api/documents.ts` now returns `{ blobUrl: string; mimeType: string }` instead of `string`.
- `DocumentViewer` props: added `mimeType?: string` (defaults to `'application/pdf'`).
- `usersApi` in `frontend/src/lib/api/users.ts`: added `RoleDefinition` interface, `getRoles()`, `updateRole()`, `deactivate()`, `activate()` methods.
- Seed data column aligned to actual MariaDB schema (`active` not `is_active` for users, int unit IDs, correct metric_results columns).

---

## [Unreleased] - Current Development Build

### Changed - 2026-02-25 (`v1.1.1-dev` UX + Governance Alignment)

- Fixed protected document download flow by switching to authenticated blob download requests from the document details page.
- Updated Documents list UX:
  - removed Version column,
  - added title filter,
  - added total-record indicator,
  - updated page label format to `Page X-X of Y`.
- Extended `documents` table/model with `file_blob` persistence for source binaries and synchronized latest upload bytes on version updates.
- Removed placeholder preview generation behavior for non-PDF uploads; preview now depends on actual conversion outputs.
- Updated issuances UX:
  - authority is now free-text/editable with dynamic chip filtering,
  - title opens source URL in new tab when available.
- Enforced categoryâ†’issue-type dependency across ticket create/detail workflows and metadata configuration.
- Added Settings features:
  - authenticated change-password endpoint/UI,
  - light/dark theme preference toggle.
- Added super-admin focal account management in Settings with extended fields:
  - first/middle/last/suffix,
  - staff ID,
  - role,
  - position,
  - designation.
- Expanded user profile schema and DTOs to include focal profile fields.
- Updated Metrics defaults to provide four sample examples per metric type.
- Updated User Manual copy:
  - removed explicit â€œYour roleâ€ badge,
  - expanded field-level CRUD guidance, especially for all four metric types.

### Changed - 2026-02-24 (`v1.1.0-dev` Blob Persistence + Conversion Stabilization)

- Added `document_versions.file_blob` and `document_versions.preview_blob` to support database-native binary storage.
- Updated upload/version creation to persist original files to both storage path and `file_blob`.
- Updated document processing and preview generation jobs to read blob-first with filesystem fallback for existing path-only rows.
- Updated preview handling to persist generated PDF preview bytes to `preview_blob`.
- Updated processing state transition to `ready` after extraction queue flow to avoid indefinite upload/process spinner states.
- Cleaned and realigned SQL seed scripts to a minimal executable baseline with blob-backed document version records.

### Summary

Complete implementation of the RICTMS Compliance Hub system with all core features operational. The system includes document management, automated compliance checking, regulatory reference tracking, collaborative reviews, and issue management.

### Fixed - 2026-02-24 (Post-release stabilization)

- Fixed upload queue Redis retry incompatibility by setting Bull Redis client `maxRetriesPerRequest` to `null`.
- Fixed missing extraction persistence by storing extracted text in both `documents.extracted_text` and `document_versions.extracted_text`.
- Fixed automated metric-failure escalation by creating/updating internal review records with `needs_revision` and captured failed-check remarks.

### Added - 2026-02-24 (Assignment-governed submissions)

- Added focal submission assignment model (`document_assignments`) with user/unit/document-type scope.
- Added one-submission-per-cycle enforcement for focal uploads (per user + unit + type + period + year).
- Added filename policy enforcement using assignment prefixes and frequency-aware suffix validation (monthly/quarterly/annual/custom).
- Added upload option endpoints for focal users and assignment CRUD endpoints for super admins.

### Changed - 2026-02-24 (Metrics and UX alignment)

- Number Extraction now supports multiple keywords and expected numbers from comma/newline inputs.
- Date/Deadline custom period handling now supports regex + capture-group + fallback month configuration.
- Metrics template document type input now uses pre-defined options from backend.
- Ticket-facing labels in dashboard UI are aligned to issue terminology.
- Issuance module now includes a document mapping manager dialog for linking/unlinking `document_issuances` entries.
- Issuance CRUD and mapping actions are now explicitly visible to compliance/super-admin roles with read-only fallback messaging for other roles.
- Fixed issuance `is_active` filter parsing to avoid unintended false filtering when query parameter is omitted.

### Added - 2026-02-24 (Workflow + Mapping Expansion)

- Added document-to-document mapping endpoints and UI manager (`/documents/:id/references`) for cross-document references.
- Added role-based in-app User Manual module under dashboard navigation.
- Added explicit `POST /documents/:id/return` endpoint for non-destructive return-to-focal workflow with mandatory remarks.
- Added dynamic ticket issue metadata management endpoints for super admins:
  - `GET/POST/PUT/DELETE /tickets/issue-types`
  - `GET/POST/PUT/DELETE /tickets/categories`

### Changed - 2026-02-24 (Compliance Status Workflow)

- Document processing now returns extracted documents to `pending` state for manual compliance decisioning.
- Manual review decisions now drive readiness state:
  - `compliant` sets document status to `ready`
  - `non_compliant` / `needs_revision` sets document status to `pending`
- Linking policies now allow only `ready` documents for issuance and document-reference mapping.
- Corrected workflow semantics: reviewer/super-admin document action is now **Return** (audit-preserving), not deletion.
- Returned/non-compliant documents are hidden from super-admin/compliance list views and remain visible to focal users for revision/update.

### Fixed - 2026-02-23

- Fixed frontend compile error in `AppBar.tsx` caused by malformed MUI `sx` object.
- Rebuilt corrupted `Sidebar.tsx` component and restored collapsible behavior.
- Restored successful frontend production build output for all dashboard routes.
- Fixed metrics retrieval endpoint so `/api/documents/:id/metrics` resolves the current document version correctly.
- Fixed reviewer/reporter identity mapping in review and ticket controllers (JWT payload `id` mapping), eliminating ticket create 500 errors.
- Fixed protected PDF preview loading by switching viewers to authenticated blob-fetch flow.

### Added - 2026-02-23

- New cybersecurity incident posture endpoint: `GET /api/incidents/period-stats`.
- Added period aggregation for `daily`, `weekly`, `monthly`, `quarterly`, and `yearly` windows.
- Added frontend incident posture cards in `/dashboard/incidents` using new API.
- Linked dashboard incident card to the incident infographic page with period overviews.

### Changed - 2026-02-23 (UI + Feature Completion Pass)

- Replaced placeholder pages with working features:
  - `Units` page now supports create, update, list, and soft-delete.
  - `Metrics` page now supports template list/create/update/delete with applicability.
  - `Reviews` page now supports review queue visibility and review submission.
- Updated dashboard layout behavior to prevent sidebar/content overlap.
- Updated login page field behavior to avoid label/value overlap artifacts.
- Improved dashboard loading responsiveness by parallelizing API requests.
- Reworked Metrics Template Builder to typed rule forms (Section, Keyword, Number Extraction, Date/Deadline) instead of raw JSON-only inputs.
- Added deadline configuration fields (`deadline_day`, `deadline_month_offset`, `max_days_late`) scoped by unit + document type via metric applicability.
- Added submission frequency support for date checks (`monthly`, `quarterly`, `annual`, `custom`) with annual submission-month control.
- Added inline digital document viewer to manual reviews with in-viewer compliance tagging controls.
- Extended tickets workflow with issue documentation fields: `issue_type`, `resolution_steps`, and `resolution_date`.
- Added end-user QA tutorial: `QA-USER-MANUAL.md` and walkthrough enhancements for Metrics/QA flows.

### Changed - 2026-02-23 (Frontend Framework Migration)

- Migrated frontend framework from **Next.js** to **Vite + React Router**.
- Added routing bootstrap in `src/App.tsx` and `src/main.tsx`.
- Added compatibility shim for existing `next/navigation` imports to accelerate migration.
- Updated frontend env handling to `VITE_API_URL` (with temporary compatibility fallback).
- Replaced frontend scripts with Vite equivalents (`dev`, `build`, `preview`).

### Verified - 2026-02-23

- Backend build: `npm run build` âœ…
- Frontend build: `npm run build` âœ…
- API smoke tests passed:
  - Incidents period stats
  - Units CRUD
  - Metrics CRUD
  - Reviews submit + latest review read

### Added - 2026-02-24 (Hardening + CI Baseline)

- Added API rate limiting for backend `/api` routes using `express-rate-limit`.
- Added environment validation hardening via Joi schema (startup-time config checks).
- Added structured audit logs for privileged mutations in metrics, tickets, and reviews flows.
- Added GitHub Actions CI workflow:
  - backend build
  - frontend build
  - backend test hook
  - dependency security audit (`npm audit --audit-level=high`)
- Added initial backend automated tests for metrics engines:
  - section check
  - keyword check
  - number extraction/property check
  - date check

### Added - Backend

#### Authentication & User Management
- JWT-based authentication with access and refresh tokens
- Password hashing using BCrypt
- Role-based access control (Admin, Reviewer, Viewer)
- User CRUD operations with role management
- Session management with automatic token refresh
- Secure logout with token invalidation

#### Document Management Module
- Document upload with metadata capture
- Support for PDF and DOCX file formats
- Automatic file storage (local filesystem)
- Document versioning system
- Version history tracking
- Checksum verification for file integrity
- Document search and filtering by unit, type, period, year, status
- Document metadata update functionality
- Document deletion (soft delete)

#### Organizational Units Module
- Unit CRUD operations (Create, Read, Update, Delete)
- Hierarchical unit structure support
- Unit-based document organization
- Active/inactive unit management

#### Metrics & Compliance Module
- Metric template management
- Multiple metric categories:
  - Completeness scoring
  - Consistency checking
  - Compliance verification
  - Timeliness monitoring
  - Format validation
- Weighted scoring system
- Metric applicability rules (link metrics to issuances)
- Automatic metric calculation on document upload
- Historical metric tracking
- Metric result storage with detailed JSON results

#### Manual Review Module
- Review assignment system
- Multi-status workflow (draft, in_review, approved, changes_requested, rejected)
- 5-star rating system
- Comment and feedback capture
- Review history and audit trail
- Version comparison functionality
- Automated diff analysis between versions
- Similarity scoring

#### References (Issuances) Module
- Regulatory issuance database
- Support for multiple issuance types (laws, executive orders, memoranda)
- Issuing authority tracking
- Issue and effectivity date management
- Source URL linking
- Active/inactive status management
- Document-to-issuance many-to-many linking
- Search and filter by authority, status

#### Tickets & Issue Management Module
- Multi-category ticket system (compliance, content, format, technical, other)
- Priority levels (low, medium, high, urgent)
- Status workflow (open, in_progress, resolved, closed)
- Unit and document linking
- User assignment
- Threaded comment system
- Ticket statistics and reporting
- Resolution date tracking

#### Infrastructure
- Background job processing with Bull Queue and Redis
- Asynchronous document text extraction
- TypeORM database integration with MariaDB
- Swagger/OpenAPI documentation
- CORS configuration
- Environment-based configuration
- Error handling and logging
- Request validation using class-validator
- Database migration system
- Comprehensive database schema with proper relationships and indexes

### Added - Frontend

#### Authentication & Layout
- Login page with credential validation
- Persistent authentication using localStorage
- AuthContext for global auth state management
- Token refresh on API calls (axios interceptor)
- Automatic logout on token expiration
- Protected routes with authentication guards
- Dashboard layout with sidebar navigation
- Responsive Material-UI design

#### Dashboard Page
- Real-time statistics cards:
  - Total documents count
  - Compliant documents count
  - Pending documents count
  - Open tickets count
- Compliance rate calculation and display
- Recent documents table (latest 5)
- Quick action buttons
- Unit-specific data filtering (future enhancement)

#### Documents Management Pages
- Document listing page with data table
- Filter controls (unit, type, status, search)
- Pagination support
- Document upload page with form validation
- Document detail page showing:
  - Metadata display
  - Version history
  - Compliance metrics
  - Manual review status
  - Preview support (planned)
- Version comparison view
- Download functionality

#### Issuances Management Page
- Issuances listing with sortable table
- Filter by authority and active status
- Search by issuance number or title
- Create issuance dialog form
- Edit issuance functionality
- Delete/deactivate issuances
- Document linking interface

#### Tickets Management Pages
- Tickets listing page with filters
- Filter by status, priority, category, unit
- Create ticket dialog with validation
- Ticket detail page with:
  - Full ticket information
  - Comment thread display
  - Status update controls
  - Document link display
- Add comment functionality
- Ticket statistics dashboard

#### API Integration
- Centralized axios client with interceptor
- Automatic token injection in headers
- API client functions for:
  - Authentication (login, refresh, logout)
  - Documents (CRUD, versions, upload)
  - Issuances (CRUD, document linking)
  - Tickets (CRUD, comments, statistics)
- Error handling and user notifications
- Loading states for async operations

### Added - Database

#### Database Schema
- Complete schema for 11 tables:
  - `users`: User accounts and authentication
  - `units`: Organizational hierarchy
  - `documents`: Document metadata
  - `document_versions`: Version tracking
  - `metric_templates`: Reusable metrics
  - `metric_applicability`: Metric-issuance rules
  - `metric_results`: Calculated scores
  - `manual_reviews`: Human reviews
  - `version_comparisons`: Diff analysis
  - `issuances`: Regulatory references
  - `document_issuances`: Document-regulation links
  - `tickets`: Issue tracking
  - `ticket_comments`: Discussion threads

#### Database Scripts
- `init.sql`: Database creation with proper charset
- `schema.sql`: Complete table creation with:
  - Foreign key constraints
  - Indexes for performance
  - Proper data types
  - Default values
  - Timestamp tracking
- `seed.sql`: Sample data for testing:
  - 3 test users (admin, reviewer, viewer)
  - 5 organizational units
  - 5 regulatory issuances
  - 5 sample documents with versions
  - 5 metric templates
  - Sample metric results
  - Sample reviews and tickets
  - Linking data

### Added - Documentation

#### User Documentation
- **CAPABILITIES.md**: Complete feature list
  - System overview
  - Module-by-module capabilities
  - Technical specifications
  - Performance characteristics
  - Security features
  - Limitations and future roadmap

- **INSTALLATION.md**: Setup instructions
  - Prerequisites and system requirements
  - Manual installation guide
  - Docker installation guide
  - Configuration details
  - Database setup instructions
  - Troubleshooting section
  - Update and uninstallation procedures

- **README.md**: Project overview
  - Quick start guide
  - Architecture overview
  - Technology stack description
  - Project structure
  - API documentation reference
  - Development and deployment guides
  - Contribution guidelines

- **WALKTHROUGH.md**: User guide
  - Getting started tutorial
  - Step-by-step workflows
  - Feature walkthroughs
  - Role-specific guides
  - Tips and best practices
  - Troubleshooting common issues
  - Glossary of terms

- **CHANGELOG.md**: This file
  - Comprehensive change history
  - Feature additions
  - Bug fixes
  - Breaking changes

### Added - DevOps & Configuration

#### Docker Support
- Docker Compose configuration with:
  - MariaDB 11 service
  - Redis 7 service
  - Backend (NestJS) service
  - Frontend (Vite + React) service
- Volume management for data persistence
- Network configuration
- Health checks for services
- Development and production Dockerfiles

#### Environment Configuration
- Backend `.env` with:
  - Application settings
  - Database credentials
  - JWT secrets
  - Redis configuration
  - Storage settings
  - CORS configuration
  - File upload limits
- Frontend `.env.local` with:
  - API URL configuration
  - Application settings

### Fixed

- TypeScript compilation errors in API client pattern
- Token access pattern (changed from explicit token parameter to automatic injection via interceptor)
- Import path issues in frontend components
- Dashboard data fetching using correct API methods
- Removed undefined state variables causing build failures

### Changed

- Updated API clients to use consistent pattern with automatic token injection
- Refactored `references.ts` API to use `apiClient` instead of direct axios calls
- Updated all frontend components to remove explicit token passing
- Improved error handling in API calls
- Enhanced dashboard with real data fetching instead of mock data

### Technical Details

#### Backend Technology Stack
- **Framework**: NestJS 10.x
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Database**: MariaDB 11.x with TypeORM
- **Queue**: Bull Queue with Redis 7.x
- **Authentication**: JWT (jsonwebtoken)
- **Password**: BCrypt
- **Validation**: class-validator, class-transformer
- **Documentation**: @nestjs/swagger
- **Testing**: Jest

#### Frontend Technology Stack
- **Framework**: Vite 5.x + React Router 6 (React 18)
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Language**: TypeScript 5.x
- **Styling**: Emotion (CSS-in-JS)
- **Icons**: Material Icons
- **Testing**: Jest, React Testing Library

#### Database
- **Engine**: MariaDB 11.x / MySQL 8.x compatible
- **Charset**: UTF8MB4 with unicode collation
- **Indexes**: Composite indexes on frequently queried columns
- **Relationships**: Properly defined foreign keys with cascade rules
- **Data Types**: Optimized for storage and performance

### Security

- Password hashing using BCrypt with cost factor 10
- JWT tokens with 30-minute expiration
- Refresh tokens with 7-day expiration
- Role-based access control at API level
- CORS configuration for frontend-backend communication
- SQL injection prevention through TypeORM parameterized queries
- XSS protection through React's automatic escaping
- CSRF protection consideration (to be enhanced in production)

### Performance Optimizations

- Database indexes on:
  - Foreign keys
  - Search columns (unit_id, document_type, status)
  - Date columns for sorting
- Lazy loading of document versions
- Pagination in list endpoints
- Background processing for document analysis
- Redis caching for queue management
- Optimized SQL queries with proper joins

### Known Issues

- Database services (MariaDB, Redis) need to be running before starting backend
- Docker/MySQL CLI not found in PATH (workaround: use Docker Desktop or add to PATH)
- Swagger API documentation route needs to be configured in main.ts
- Email notifications not yet implemented
- Document preview requires additional PDF.js integration
- Export/report generation features planned for future releases

### Development Notes

- All backend modules successfully compile
- Frontend successfully builds for production
- Database schema tested with seed data
- All Sprint 1-5 features implemented
- Sprint 6 features partially implemented (dashboard analytics)
- Testing pending (requires database setup)

### Migration Notes

For users migrating from previous versions:
- None (initial release)

### Breaking Changes

- None (initial release)

---

## Project Development History

### Sprint 1 - Foundation (Completed)
- âœ… Authentication & User Management
- âœ… Database schema design
- âœ… Project structure setup

### Sprint 2 - Core Modules (Completed)
- âœ… Units Module
- âœ… Documents Module with Versioning
- âœ… File upload and storage

### Sprint 3 - Compliance Engine (Completed)
- âœ… Metrics Module
- âœ… Automated scoring
- âœ… Background processing

### Sprint 4 - Reviews & Comparison (Completed)
- âœ… Manual Review Module
- âœ… Version comparison
- âœ… Review workflows

### Sprint 5 - References & Tickets (Completed)
- âœ… Issuances Module
- âœ… Tickets Module
- âœ… Frontend pages for both modules

### Sprint 6 - Dashboard & Reporting (In Progress)
- âœ… Enhanced dashboard with real statistics
- â³ Advanced reporting features (planned)
- â³ Export functionality (planned)
- â³ Charts and visualizations (planned)

### Sprint 7 - Testing & Documentation (In Progress)
- âœ… Comprehensive documentation (5 files)
- âœ… Database setup scripts
- âœ… Seed data script
- â³ End-to-end testing (pending)
- â³ Bug fixes (pending)
- â³ Performance testing (pending)

---

## Future Roadmap

### Short Term (Next Release)
- [ ] Complete Sprint 6 reporting features
- [ ] End-to-end testing
- [ ] Bug fixes and stability improvements
- [ ] Performance optimization
- [ ] Enhanced error messages
- [ ] API rate limiting

### Medium Term
- [ ] Email notification system
- [ ] Document preview in browser
- [ ] Bulk document operations
- [ ] Advanced search functionality
- [ ] User activity logs
- [ ] Two-factor authentication

### Long Term
- [ ] Multi-language support (Tagalog/Filipino)
- [ ] Mobile application (iOS/Android)
- [ ] Advanced NLP for document analysis
- [ ] Machine learning-based compliance predictions
- [ ] Integration with e-signature platforms
- [ ] Blockchain verification
- [ ] Real-time collaboration features
- [ ] Workflow automation engine

---

## Contributors

- Development Team: RICTMS Compliance Hub Development
- Architecture Design: Following BMAD methodology
- Documentation: Comprehensive user and technical docs

---

## Support & Contact

For issues, questions, or feature requests:
- Create an issue in the repository
- Email: support@rictms.gov.ph
- Documentation: See README.md and other docs

---

**Note**: Version numbering will be added once the initial release is finalized and deployed.

---

*This changelog will be updated with each release. Check back regularly for updates.*
