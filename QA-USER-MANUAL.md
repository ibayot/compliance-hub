# RICTMS Compliance Hub - QA User Manual

> **Release `v1.4.0` (2026-03-03):** Verify: (1) **Expanded issuance search baseline** — after reseed, Issuances include broader applicable references across laws, IRRs, standards, Executive Orders, DICT/NPC circular references, and NCSP planning context. (2) **Amendment metadata** — Add/Edit form supports `Is Amendment`, `Amended Issuance Number`, and `ICT Related Amendment Notes`. (3) **List column presence** — Issuances table includes `ICT Related Amendments` and correctly displays amendment/non-amendment rows. (4) **Modal completeness** — Applicability/Relevance modal shows amendment status and amendment notes when present. (5) **Build/seed health** — `npm run db:seed`, backend build, and frontend type-check complete successfully.

> **Release `v1.3.0.22` (2026-03-03):** Verify: (1) **Dropdown filters** — Issuances filter controls are dropdown-style and include Authority, Category, and Status. (2) **Category filtering** — selecting a category (`law`, `circular`, `memorandum`, `irr`, `standard`, `guideline`) narrows list correctly. (3) **Status filtering** — selecting Active/Inactive/All returns matching issuances without breaking existing table/actions. (4) **Status management** — manage-role users can activate/deactivate an issuance from row action and from Add/Edit form status field; saved value is reflected in Status chip and subsequent fetch. (5) **Deep narrative quality** — applicability and relevance details in modal show expanded, implementation-level narratives after reseed. (6) **No regressions** — document mapping/edit/delete actions remain functional; backend/frontend smoke checks stay green.

> **Release `v1.3.0.21` (2026-03-03):** Verify: (1) **Comprehensive inclusion** — Issuances list includes broad ICT references across laws, circulars, memorandums, IRRs, ISO, and NIST entries after reseed. (2) **Table structure** — Issuances columns appear exactly as `Issuance Number | Title | Authority | Issue Date | Status | Mapped Documents | Actions`. (3) **Action parity** — original actions remain functional (link mapping, edit, delete where role-allowed). (4) **New action modal** — clicking the new info action opens a modal showing `issuance_type`, `applicability_scope`, and `relevance_notes` (or fallback details). (5) **Reseed/build health** — `npm run db:seed`, backend build, and frontend type-check complete successfully. (6) **Zero regression** — KPI, Reports, Repository, Documents, and Reviews core flows remain intact.

> **Release `v1.3.0.20` (2026-03-03):** Verify: (1) **Issuance baseline relevance** — Issuances list is limited to ICT-relevant operational/governance/safety items (no standards-only placeholders in default seed). (2) **Authoritative links** — seeded issuance links open valid authoritative sources (Official Gazette for Acts; NPC page for DPA IRR). (3) **Traceability map present** — `ICT-ISSUANCE-RELEVANCE-MAP.md` exists and contains per-issuance rationale + link. (4) **Reseed health** — `npm run db:seed` succeeds without errors. (5) **No regression** — KPI/Reports/Repository workflows remain functional after reseed.

> **Release `v1.3.0.19` (2026-03-03):** Verify: (1) **No forced tilt** — trend arrowheads in KPI and Reports should align to the true end-segment angle (near-flat trends can appear near-flat). (2) **Zigzag non-monthly trend** — for Quarterly/Semestral/Annual, Trend cells in KPI/Reports should show multi-point zigzag movement that reflects visible period points, not a simplified 2-point line. (3) **Monthly trend stability** — monthly Trend remains valid and directional with existing behavior. (4) **Data baseline unchanged** — reseed still returns 12 active metrics, 12 applicability rows, and 10 pending documents. (5) **Repository unaffected** — row-level View/Download and modal Download continue working.

> **Release `v1.3.0.18` (2026-03-03):** Verify: (1) **Subtle trend arrowhead tilt** — in KPI Unit Detail and Reports KPI tables, small score deltas render arrowheads with slight direction (~5°), not steep tilt. (2) **Metrics applicability isolation** — global set (`metric-001..004`) still applies broadly; IT-targeted set (`metric-005..008`) applies only to IT `ICT Security Assessment`; Finance-targeted set (`metric-009..012`) applies only to Finance `Finance Risk Report`. (3) **Seeded monthly queue samples** — `doc-017..022` are `Monthly Report` and remain visible in pending Documents queue. (4) **Repository row actions** — each repository row has View + Download actions side-by-side. (5) **Repository modal download** — opening preview modal shows a Download icon in the title bar and downloads the latest original file.

> **Release `v1.3.0.17` (2026-03-03):** Verify: (1) **Direction labels simplified** — in KPI Unit Detail and Reports single-unit KPI table, Direction shows glyph-only arrows (`↑` for higher-is-better, `↓` for lower-is-better) without text words. (2) **Trend arrowhead visibility** — sparkline arrowheads in KPI/Reports have stronger up/down tilt, visibly directional even when score delta is small. (3) **Seed command health** — run `npm run db:seed` in backend; command must complete successfully and report `Active metric templates: 12` and `Metric applicability rows: 12`. (4) **Metrics completeness** — Administration → Metrics shows 12 templates total (3 per type). (5) **Applicability completeness** — templates `metric-005..008` apply to `ICT Security Assessment`; templates `metric-009..012` apply to `Finance Risk Report`. (6) **Documents queue visibility** — focal-accessible pending queue includes seeded `doc-017..022` Jan/Feb/Mar 2025 unit reports.

> **Release `v1.3.0.16` (2026-03-04):** Verify: (1) **`lower_is_better` formula correction** — open KPI Unit Detail for a lower-is-better KPI (e.g., Incident Resolution Time, actual=3.1, target=4); normalized score must reward lower values (target/actual behavior, capped by scoring rule). (2) **KPI Direction column** — Unit Detail table shows direction indicators (`↑ Higher` or `↓ Lower`) per KPI. (3) **Reports Direction parity** — single-unit KPI table in Reports shows the same direction indicators. (4) **Trend arrowheads** — all trend sparklines in KPI and Reports tables render arrowheads indicating up/down movement. (5) **KPI band pie filter scope** — `KPIs by Performance Band` updates with selected year/frequency/period/unit filters and does not remain all-units when a unit filter is active. (6) **KPI band pie transparent logic** — partial/incomplete-unit KPI counts appear as transparent dashed `PARTIAL` slice (same logic style as unit band distribution). (7) **Repository table simplification** — repository document table no longer shows status/compliance columns; it keeps View and Download actions for compliant-ready records. (8) **Seeded Jan–Mar 2025 unit reports** — Documents data includes monthly January/February/March 2025 samples for both IT and Finance units (`doc-017..022` with versions).

> **Release `v1.3.0.15` (2026-03-04):** Verify: (1) **KPI monthly range basis** — set Year=2025, Frequency=Monthly, Month=March (and repeat on later months). Trend/chart basis must compare **previous month to selected month** only (Mar compares Feb→Mar; Apr compares Mar→Apr; etc.). January must still render from a 0-start baseline. (2) **KPI non-monthly trend basis** — set Quarterly/Semestral views and inspect Trend columns in Unit KPI Scores and Unit Detail tables; direction must be based on **historical average vs current period score** (not first visible point vs last point). (3) **Reports parity** — run the same period filters in Reports; Trend direction and range behavior must match KPI exactly. (4) **Reports legend removal** — KPI charts in Reports must render without Unit/KPI legends. (5) **Documents pending queue** — open Documents page; default list and Reset action must show **pending-only** rows. (6) **Reviews pending queue** — open Reviews page; queue should include pending-only rows consistent with Documents. (7) **Repository compliant output** — open Repository and verify documents are previewed in an inline modal (no route redirect) and list reflects ready/compliant outputs only. (8) **Metrics template count** — Administration → Metrics shows **12 templates total** (3 per type). (9) **Seeded pending 2026 samples** — pending per-unit sample docs appear in Documents/Reviews and are distinct from repository-ready samples. (10) **Issuance seed breadth** — Issuance list includes expanded COA/NPC/DBM/DICT and international standards references.

> **Release `v1.3.0.14` (2026-03-04):** Verify: (1) **Repository layout** — open the Repository page, expand 2026, click any period folder (e.g. "February"); the document list must appear **below** the folder grid at full container width with no horizontal scrollbar. Confirm there is **no "Type" column** in that table. (2) **KPI monthly chart range** — set Year=2025, Monthly=February; the X-axis must show **Jan and Feb** (not a blank label + Feb). IT Unit's line starts at its Jan score; Finance Unit's line starts at 0 for Jan and rises to its Feb score. Not a single floating dot for Finance. (3) **KPI Unit Detail Q3** — select Year=2025, Quarterly=Q3; click Finance Unit. The Unit Detail chart X-axis must show **only Jul, Aug, Sep** (not Jan through Sep). Finance has no Q3 data so the chart area is empty with the "partial period" message. (4) **KPI Unit Detail H2** — select Year=2025, Semestral=H2; click any unit. The Unit Detail chart must show **only Jul–Dec months**, not the full year Jan–Dec. (5) **Metrics — 3 templates per type** — go to Administration → Metrics; there should now be **12 templates** visible (3 section_check, 3 keyword_check, 3 property_check, 3 date_check). Confirm `metric-005` through `metric-012` appear and have the correct applicability filters. (6) **Metrics — applicability isolation** — open `doc-013` (IT Policy Document) on the Document detail page → Metrics tab; it must show results for **metric-001 to 004 only** (the 4 global templates). Open `doc-011` (ICT Security Assessment); it must show results for **metric-001 to 008** (4 global + 4 IT-targeted). Open `doc-012` (Finance Risk Report); it must show **metric-001 to 004 + 009 to 012** (4 global + 4 Finance-targeted). (7) **Repository completeness** — after re-seeding, the Repository page must show docs in both 2025 and 2026 year accordions, with at least February 2026 bucket containing doc-009 through doc-014.

> **Release `v1.3.0.13` (2026-03-04):** Verify: (1) **KPI — Unit Detail partial period** — select Year=2025, Quarterly Q3 2025; click the **Finance Unit** row in the unit scores table. The Unit Detail line chart must show Finance's Q1–Q2 trend data (not a blank "No trend data" message). (2) **KPI — Chart 0-anchor** — open any unit detail or all-units chart for any period; all trend lines must *start at 0* (bottom-left), not at the first data value. (3) **KPI — KPI detail X-axis** — in Unit Detail, the per-KPI line chart x-axis must show month abbreviations (Jan, Feb, Mar…), not quarterly-relative labels. (4) **KPI — KPI detail table name** — KPI detail table first column must show the full **KPI name** in bold with the **code** below it in grey caption text (not just the code). (5) **Reports — Matching layout** — open Consolidated Reports, same period; the KPI Scores section all-units table must have **Color / Score / Trend / # KPIs** columns (matching the KPI module). Single-unit table must have Color, KPI name+code, and Trend columns. (6) **Reports — KPIs Requiring Attention** — select a period where any KPI has a Red or Amber band; a highlighted "KPIs Requiring Attention" table must appear between the KPI Scores section and the Document Submissions section, listing the affected KPIs with score, band, and actual value. (7) **Repository — sample docs** — with the seeded database, open `GET /api/documents/repository`; years 2025 and 2026 must each be present with at least Q1/Q2 and monthly buckets populated. (8) **User Manual** — log in as any reviewer/super_admin; navigate to `/dashboard/user-manual`; "Consolidated Reports" and "Report Repository" cards must appear in the module list and open detail dialogs with correct field descriptions.

> **Release `v1.3.0.12` (2026-03-03):** Verify: (1) **Score fix** — set Year=2025, Month=6, unit=IT, open Unit Detail for any `lower_is_better` KPI (e.g. KPI-IT-002 "Incident Resolution Time", actual=3.1, target=4); normalized score must show **77.5** (not 100). (2) **Unit Detail header** — composite score is displayed as a **colored Chip** (green/amber/red background with white bold text), no "• Band: X" text. (3) **Unit Detail incomplete period** — select Q3 2025, unit=Finance; the KPI table should show *"No KPI data available for this unit/period (partial period)"* instead of an empty table. (4) **January monthly chart** — set Month=1 (January) with any year/unit that has data; the trend line must start from 0 and go up to the January score (not a lone isolated dot). (5) **Trend arrows Q/S** — set Quarterly Q2 2025 and click any unit; the Trend column sparklines must reflect the actual H1 slope (not a flat line). (6) **KPIs by Performance Band** second pie chart appears alongside "Units by performance band" in a side-by-side layout. (7) **Reports "All Units" card** — generate a report with no unit selected; Card 2 must read "All Units / Reporting Scope" (no raw count number). (8) **Reports section title** — when a unit is selected, the KPI section heading reads "KPI Scores"; when "All Units", it reads "KPI Scores by Unit".

> **Release `v1.3.0.5` (2026-02-27):** Verify: (1) KPI Detail table Trend column sparklines are **diagonal** — when previous period has no data, the line goes from bottom-left (0) to the current score at top-right; when both periods have data and values differ, the slope reflects actual change. (2) A KPI with the same score in both periods (no change) correctly shows a **flat horizontal line** (expected). (3) Band Distribution pie chart shows **bold white numbers inside each colored slice** — no callout label text outside the pie. Legend below the pie is unchanged.

> Update (`v1.1.0-dev`, 2026-02-24): QA checks now include blob persistence validation and DOCX-to-PDF preview generation checks.

> **Release `v1.3.0.2` (2026-02-27):** Verify: (1) Dashboard → KPI opens directly to the **KPI Dashboard tab** (graphs visible on first load, no tab switching needed). (2) Unit score bar chart renders with color-coded bars (green/amber/red). (3) Overall KPI scorecard shows a colored progress bar and band label. (4) Clicking a unit row in the table populates the Unit Detail panel on the right. (5) Band Distribution pie chart shows with legend. (6) All charts show an empty-state message (not blank containers) when no data exists for the selected period. (7) KPI Master and KPI Monitoring tabs are only visible to super_admin, reviewer, section_head roles. (8) Focal users see the dashboard directly as the only tab.

> **Release `v1.2.0.4` (2026-02-26):** Verify: (1) Settings → Existing Users: name/unit/role/position/designation can be edited. (2) Staff ID is immutable — PATCH with `staffId` is rejected and Settings edit dialog keeps Staff ID disabled. (3) Settings → System Role Definitions supports add/edit role metadata (label/description/assignable). (4) Dashboard → KPI is visible; KPI Master uses `unit_id` from Units table. (5) KPI Monitoring records `entered_by_staff_id` and `entered_by_name`, and supports status `draft/locked` only. (6) KPI Dashboard enforces unit visibility for focal users and consolidated visibility for compliance/super-admin roles.

> **Release `v1.2.0.3` (2026-02-26):** Verify: (1) Documents pagination shows "Page 1 of 1" (not "Page 1-1 of 1"). (2) Login with a unit-assigned account → Settings → Account Information shows the assigned unit(s) as chips. (3) Login as focal user → Upload Document → unit auto-populates from assigned unit. (4) Settings → Create New User: error messages appear inside the modal (not below the card). (5) Unit multi-select in create user dialog shows checkboxes for each option. (6) Dashboard incident response section shows the full date (e.g., "Wednesday, February 26, 2026"). (7) All action success/error notifications are toast messages in top-right corner. (8) Creating a user with non-focal role (e.g., Reviewer) results in correct role in users table.

> **Release `v1.2.0.1` (2026-02-26):** Verify: (1) Units page shows accordion; click unit to expand and see Reportorial Document Types section with Add button. (2) Upload Document page: focal user's unit is auto-filled; selecting a doc type shows the expected filename. (3) Uploading a file with wrong name shows a validation error before submit. (4) Metrics page: "Reportorial Document Type" dropdown replaces Unit+DocType. (5) Settings → "Create New User" opens a dialog with unit multi-select. (6) Deactivate user in Settings now works (no more "Failed to update user status"). (7) Navigating to /dashboard/documents no longer highlights Dashboard in sidebar. (8) GET /api/metrics returns 16 templates.

> **Hotfix `v1.1.2.3` (2026-02-25):** DOCX document viewer fix verified — upload a `.docx` file, open Document Detail, click the viewer; it should render styled HTML inline. Verify security: `GET /api/auth/me` response must NOT contain `passwordHash`. Verify 4 metric templates at `GET /api/metrics`: section_check, keyword_check, property_check, date_check.

> Local QA tracking document (kept out of `v1.0.0` release push package).

## Purpose
This manual is for business and QA users who need to verify if core workflows are functioning correctly without reading code.

## Scope Covered
- Metrics template setup (Section, Keyword, Number Extraction, Date/Deadline)
- Submission frequency-based deadline checks
- Review workspace with inline digital document viewer and decision tagging
- Ticket issue documentation fields (`issue_type`, `resolution_steps`, `resolution_date`)
- Security baseline verification (rate limiting and protected action logging)
- CI/baseline validation checkpoints for release readiness
- Document return-for-revision workflow (remarks-required, audit-preserving)
- Super-admin management of dynamic ticket issue types and categories
- KPI Master, KPI Monitoring, KPI Dashboard, and KPI lookup table behavior (see **Section I**)

## Test Environment Prep
1. Start backend (`backend`): `npm run start:dev`
2. Start frontend (`frontend`): `npm run dev`
3. Login using a super admin or reviewer account.
4. Confirm API docs are reachable at `/api/docs`.

## Test Data Recommendation
Use one unit and one document type consistently during QA to reduce noise.

- Unit: `IT Unit` (or any existing unit)
- Document Type: `Report`
- Sample Periods:
  - Monthly: `2026-01`
  - Quarterly: `Q1`
  - Annual: `2026`

---

## A. Metrics Template Builder - How to Use

### A1. Section Rule Template
1. Go to Administration → Metrics.
2. Click `Create Template`.
3. Metric Type: `Section Rules`.
4. Add required sections (one per line), e.g. `Introduction`, `Findings`, `Recommendations`.
5. Assign Unit + Document Type.
6. Save.

Expected:
- Template appears in list.
- Type label shows `Section Rules`.

### A2. Keyword Rule Template
1. Create template with type `Keyword Rules`.
2. Enter keywords (comma/newline separated).
3. Set `Minimum Matches`.
4. Optional: enable `Case sensitive` and `Match whole words only`.
5. Save.

Expected:
- Template stores and edits correctly.
- Keyword options persist after reopening template.

### A3. Number Extraction Template
1. Create template with type `Number Extraction`.
2. Enter one or more keywords (comma/newline separated), e.g., `total incidents`, `resolved incidents`.
3. Set `Comparison` and one or more expected numbers.
4. Save.

Expected:
- Template stores and edits correctly.
- Comparison and expected number persist.

### A4. Date / Deadline Template with Submission Frequency
1. Create template with type `Date / Deadline Check`.
2. Choose submission frequency:
   - `Monthly`
   - `Quarterly`
   - `Annual` (requires Submission Month)
   - `Custom Period`
3. Set:
   - `Deadline Day` (1-28)
   - `Deadline Month Offset`
   - `Max Allowed Days Late`
4. Save.

Expected:
- Template stores and edits correctly.
- Frequency and timing values persist.

---

## B. Date/Deadline Behavior QA Matrix

Use this matrix to verify expected due-date logic:

| Frequency | Document Period Example | Meaning | Expected Baseline |
|---|---|---|---|
| Monthly | `2026-01` | January submission period | January end + offset month |
| Quarterly | `Q1` or `2026-Q1` | Quarter 1 period | March end + offset month |
| Annual | `2026` | Annual submission period | Configured submission month in year |
| Custom | Any custom string | Regex/group parsing + fallback handling | Rule-based fallback behavior using configured regex and month fallback |

Pass criteria:
- On-time documents show pass and non-negative compliance score.
- Late documents beyond configured allowance fail.

---

## C. Review Workspace QA (Inline Viewer + Decision Tagging)

1. Go to Dashboard → Reviews.
2. Pick a document in `ready` state.
3. Click `Review`.
4. Confirm inline PDF preview is visible in dialog.
5. Click each decision button once:
   - `Mark Compliant`
   - `Mark Non-Compliant`
   - `Mark Needs Revision`
6. Add remarks and submit one final decision.

Expected:
- Dialog shows digital preview without download.
- Review is submitted successfully.
- Latest review badge updates in table.

---

## C1. Document Return Workflow QA

1. Login as `super_admin` or `reviewer`.
2. Go to **Documents** and locate a `pending` document.
3. Click **Return**.
4. Attempt submit without remarks and confirm validation blocks action.
5. Enter remarks and submit.

Expected:
- Document is returned without deletion.
- Return action creates auditable review history (`needs_revision`).
- Returned document is hidden from super-admin/reviewer list views.
- Returned document remains visible to focal user for revision/update.

---

## D. Tickets QA (Issue Documentation)

### D0. Super Admin Metadata Management
1. Login as `super_admin`.
2. Open **Issues** page.
3. Create, edit, deactivate/activate, and soft-delete at least one Issue Type.
4. Repeat for Category entries.

Expected:
- New options are immediately available in ticket forms.
- Deactivated options do not appear in active-only selectors.
- Soft-delete is blocked when option is in use by an existing ticket.

### D1. Create Ticket
1. Go to Dashboard → Tickets.
2. Create ticket with fields:
   - Subject
   - Description
   - Issue Type
   - Category
   - Priority
   - Optional Resolution Steps
3. Save.

Expected:
- Ticket appears in list with Issue Type column.

### D2. Update Issue Documentation
1. Open ticket details.
2. Change `Issue Type`.
3. Set `Resolution Date`.
4. Add/modify `Resolution Steps`.
5. Save.

Expected:
- Changes persist after refresh.
- Status and resolution metadata remain consistent.

## E. Issuance Mapping QA

### E1. Link Document to Issuance
1. Login as `super_admin` or `reviewer`.
2. Go to **Issuances**.
3. Click the link icon on an issuance row.
4. Search for a document and click **Link**.

Expected:
- Document appears under **Linked Documents**.
- Issuance mapping persists after closing/reopening dialog.

### E2. Unlink Document from Issuance
1. In the same mapping dialog, click **Unlink** on a mapped document.

Expected:
- Document is removed from **Linked Documents**.
- Link is removed from `document_issuances` mapping.

---

## F. Quick Regression Checklist

- [ ] Backend and frontend both start without port conflicts.
- [ ] Metrics templates can be created, edited, and deleted.
- [ ] Date/deadline templates support monthly/quarterly/annual/custom frequencies.
- [ ] Reviews page shows inline digital viewer for ready documents.
- [ ] Manual review decisions persist and display correctly.
- [ ] Tickets support issue documentation fields end-to-end.
- [ ] No 500 errors on ticket create/update and review submit.
- [ ] Issuance link/unlink mapping works for compliance/super-admin roles.
- [ ] Return-to-focal workflow works with mandatory remarks and preserved audit trail.
- [ ] Dynamic issue type/category metadata CRUD works for super_admin only.

## G. Known Validation Constraints

- `Deadline Day` must be between 1 and 28.
- `Max Allowed Days Late` cannot be negative.
- For annual frequency, submission month must be 1–12.
- Inline preview requires processed preview availability (`ready` status).
- Issuance mapping actions are role-gated to compliance/super-admin users.

## H. Release Readiness QA Gate (v1.0.0)

- Backend build passes.
- Frontend build passes.
- Backend metric-engine tests pass.
- API smoke checks pass for login, metric template create/update, ticket create/update, and review submit.
- No blocking runtime 500 errors in tickets/reviews/metrics core paths.

---

## I. KPI Module - User Manual & QA Guide (v1.3.0.3)

### I.1 What Is a KPI Band?

A **KPI Band** is a color-coded performance classification applied to a unit or an individual KPI based on its **Normalized Score** (0-100 scale).

| Band  | Color  | Default Score Range | Meaning                                    |
|-------|--------|---------------------|--------------------------------------------|
| Green | Green  | 90 - 100            | Target met or exceeded - Performing well   |
| Amber | Amber  | 75 - 89.99          | Near target - Needs attention              |
| Red   | Red    | 0 - 74.99           | Below threshold - Immediate action needed  |

**How normalized score is calculated:**
- For *higher-is-better* KPIs: `(Actual / Target) * 100`, capped at 100.
- For *lower-is-better* KPIs: when `Actual ≤ Target` (on-track) → `(Actual / Target) * 100`; when `Actual > Target` (exceeds threshold) → `(Target / Actual) * 100`. Result capped at 100.  
  *Example: Incident Resolution Time, actual=3.1 h, target=4 h → score = 3.1/4×100 = **77.5**.*
- For *Yes/No* KPIs: `100` if actual = 1 (Yes), `0` if actual = 0 (No).

**Composite Unit Score** = Weighted average of all KPI normalized scores for a unit in a period.  
Where multiple KPIs have different weights, higher-weight KPIs influence the unit score more.

> **Example (seeded data, June 2025 Q2):**
> - IT Unit: avg score ~98.8 (GREEN) - all KPIs met target
> - Finance Unit: avg score ~95.9 (GREEN) - one KPI near amber
> - July 2025: Finance drops to RED (72.4) due to a Yes/No KPI miss (actual=0)
> - August 2025: IT drops to RED (72.0) due to a Yes/No KPI miss (actual=0)

---

### I.2 KPI Master - CRUD Steps

> Role required: `super_admin`, `reviewer`, or `section_head`

#### Create a KPI Master
1. Navigate to **KPI Monitoring & Dashboard** page.
2. Click the **KPI Master** tab (visible only to `super_admin`, `reviewer`, `section_head`).
3. Click **Add KPI**.
4. Fill the form:
   - **Code**: Unique identifier (e.g., `KPI-IT-001`). Cannot be changed after creation.
   - **KPI Name**: Descriptive name.
   - **Description**: Optional but recommended.
   - **Unit**: Select the organizational unit this KPI belongs to.
   - **Type**: `Measurement` (numeric) or `Yes/No` (binary).
   - **Unit of Measure**: e.g., `percent`, `hours`, `yes/no`.
   - **Direction**: `Higher is better` or `Lower is better`.
   - **Target Value**: Numeric goal (e.g., `99.9` for 99.9% uptime).
   - **Weight**: Relative importance within the unit's composite score (default: `1`).
   - **Frequency**: `Monthly`, `Quarterly`, `Semestral`, or `Annual`.
5. Click **Save**.

#### Edit a KPI Master
- Click **Edit** on any KPI row.
- Modify allowed fields (Code is locked).
- Click **Save**.

#### Delete a KPI Master
- Click **Delete** (restricted to `super_admin`).
- Also deletes associated monitoring records.

---

### I.3 KPI Monitoring - Encoding Periodic Values

> Role required: `super_admin`, `reviewer`, or `section_head`

#### Encode a KPI Monitoring Value
1. Navigate to **KPI Monitoring & Dashboard** > **KPI Monitoring** tab.
2. Click **Encode KPI**.
3. Select the **KPI** from the dropdown.
4. Select the **Unit**.
5. Set **Period Year** and **Period Month**.
6. Enter the **Actual Value**:
   - For `Measurement` type: enter the numeric result (e.g., `98.7`).
   - For `Yes/No` type: enter `1` for Yes, `0` for No.
7. Add optional **Remarks**.
8. Leave **Status** as `Draft` unless ready to finalize.
9. Click **Save**.

#### Lock a Monitoring Row
- Click **Lock** button on any `Draft` row to prevent further edits.
- Locked rows show a green `LOCKED` badge.
- Only `super_admin`, `reviewer`, `section_head` can lock.

---

### I.4 KPI Dashboard - Reading the Dashboard

The **KPI Dashboard** tab is visible to all roles.

#### Period Filter Controls
- **Period Year**: Select the reporting year.
- **Frequency**: Choose `Monthly`, `Quarterly`, `Semestral`, or `Annual`.
  - Monthly: select a specific month (1-12).
  - Quarterly: select Q1 (Jan-Mar, month 3), Q2 (Apr-Jun, month 6), Q3 (Jul-Sep, month 9), Q4 (Oct-Dec, month 12).
  - Semestral: select H1 (Jan-Jun, month 6) or H2 (Jul-Dec, month 12).
  - Annual: shows full-year data (uses December, month 12, as the reference month).
- Click **Refresh** to reload data after changing filters.

> **Seeded test data tip:** Set Year = `2025`, Frequency = `Monthly`, then pick
> Month `6` (June), `7` (July), or `8` (August) to see pre-loaded data.
> For quarterly simulation, set Frequency = `Quarterly` and select `Q2` - this
> maps to June 2025 and shows: IT Unit GREEN (~98.8), Finance Unit GREEN (~95.9).

#### Scorecard Row (Top)
| Scorecard           | Shows                                           |
|---------------------|-------------------------------------------------|
| Overall KPI Score   | Weighted average across all reporting units     |
| Units in Dashboard  | Count of units with at least one KPI entry      |
| Monitoring Rows     | Total KPI entries for the selected period       |

The **KPI Band Scale** legend below the scorecards shows current threshold ranges with color-coded chips.

#### Unit KPI Scores (Bar Chart)
- Each bar represents a unit's composite KPI score for the period.
- Bar color indicates the performance band (green/amber/red).
- Long unit names are truncated with `...` and shown at an angle for readability.
- Click a unit row in the table below the chart to drill into KPI details.

#### Unit Detail Panel
- Shows the selected unit's name and a **colored Chip** for the composite score (green/amber/red background). No `"• Band: X"` text displayed.
- When the unit has no KPI data for the period (partial period), shows a *"No KPI data available for this unit/period"* message instead of a table.
- Line chart displays trend of each individual KPI over the period.
- Table lists KPI code, actual value, target value, normalized score, and trend sparkline.
- Trend sparklines now use the **first** and **last** `hasData` timeseries points as prev/curr, showing correct directional slopes for multi-point periods (Q/S/Annual).

#### Band Distribution (Pie Charts)
- **Units by performance band** (left): proportion of *units* in each performance band.
- **KPIs by Performance Band** (right, new in v1.3.0.12): count of *individual KPIs* (across all units) per band, based on the last `hasData` point for each unit.
- Both pies show bold white count numbers inside colored slices.

---

### I.5 Role-Scoped Visibility Rules

| Role           | Can View Dashboard | Can Drill Unit Detail | Can Manage KPI Master | Can Encode Monitoring |
|----------------|--------------------|-----------------------|-----------------------|-----------------------|
| `super_admin`  | All units          | All units             | Yes                   | Yes                   |
| `reviewer`     | All units          | All units             | Yes                   | Yes                   |
| `section_head` | Own unit only      | Own unit only         | Yes                   | Yes                   |
| `focal`        | Own unit only      | Own unit only         | No                    | No                    |
| `auditor`      | Own unit only      | Own unit only         | No                    | No                    |
| `technician`   | Own unit only      | Own unit only         | No                    | No                    |

---

### I.7 KPI Module Smoke Checks (v1.3.0.12)

> Tests for the v1.3.0.12 bug-fix release. Run in addition to all I.6 checks.

| #  | Test Step                                                                                                             | Expected Result                                                                                        |
|----|-----------------------------------------------------------------------------------------------------------------------|--------------------------------------------------------------------------------------------------------|
| 1  | Year=2025, Month=6, click unit=IT, open Unit Detail, find KPI-IT-002 (Incident Resolution Time, actual=3.1, target=4) | Normalized score shows **77.5**, NOT 100                                                               |
| 2  | Same unit detail view: inspect the CardHeader subheader                                                               | Colored Chip with score value (e.g. "88.3" on green background); NO "• Band: green" text               |
| 3  | Set Quarterly Q3 2025, click Finance Unit → Unit Detail                                                               | "No KPI data available for this unit/period (partial period)" message instead of empty table            |
| 4  | Set Monthly, Month=January, any year with data → check all-units chart                                                | Chart line starts from 0 at the left anchor point and rises to the January score — no isolated dot      |
| 5  | Set Quarterly Q2 2025, click IT Unit → Unit Detail → Trend column                                                     | Sparklines are **diagonal** reflecting Jan→Jun slope, not flat/null lines                              |
| 6  | Scroll to Band Distribution section (any period with data)                                                            | Two pies side-by-side: "Units by performance band" (left) and "KPIs by Performance Band" (right)       |
| 7  | Open Reports page, generate report with **no unit selected**                                                          | Card 2 shows "All Units" + "Reporting Scope" label; no numeric count                                   |
| 8  | Generate report with a specific unit selected                                                                         | KPI Scores section header reads "KPI Scores" (not "KPI Scores by Unit")                                |
| 9  | Open KPI Dashboard → Unit KPI Scores table, set Quarterly Q2 2025                                                     | Trend column sparklines show directional slope (IT improved Q1→Q2, Finance dropped)                    |

---

### I.6 KPI Module Smoke Checks (v1.3.0.5)

> **Seeded data reference:** 10 KPI masters (5 for IT Unit, 5 for Finance Unit), 30 monitoring rows
> for year 2025 months 6 (June), 7 (July), 8 (August). Default dashboard period is current date
> so you must manually set Year=2025 and pick a month with data.

| #  | Test Step                                                                              | Expected Result                                         |
|----|----------------------------------------------------------------------------------------|---------------------------------------------------------|
| 1  | Load KPI page as `admin@rictms.gov.ph`                                                | No NaN SQL errors in backend; dashboard loads           |
| 2  | Set Year=2025, Frequency=Monthly, Month=6 (June), click Refresh                        | 10 monitoring rows; IT ~98.8 GREEN, Finance ~95.9 GREEN |
| 3  | Set Year=2025, Frequency=Quarterly, Q2, click Refresh                                  | Same June data shown; both units GREEN                  |
| 4  | Set Month=7 (July), Frequency=Monthly, click Refresh                                   | IT AMBER (~86.4), Finance RED (~72.4) due to Yes/No miss|
| 5  | Set Month=8 (August), click Refresh                                                    | IT RED (~72.0), Finance AMBER (~89.4) - band reversal   |
| 6  | Switch frequency to Annual, click Refresh                                              | Uses December (month 12) - no data shown (expected)     |
| 7  | Click a unit row, Month=7 (July), open Unit Detail; inspect Trend column sparklines    | Lines are diagonal: KPI-IT-002 steep drop (100→61.54); each KPI shows correct slope |
| 8  | Still in Unit Detail Month=6 (June, no May data): check sparklines                    | Sparklines start from bottom-left (0) and ascend diagonally to the June score |
| 9  | Band Distribution pie chart (any month with data)                                      | Bold white count numbers inside each colored slice; no callout text outside the pie; legend below unchanged |
| 10 | KPI Master tab: Create new KPI for any unit                                            | Saved successfully, appears in table                    |
| 11 | KPI Monitoring tab: Encode actual value for the new KPI                                | Saved as Draft                                          |
| 12 | Lock the encoded row                                                                   | Status shows LOCKED; Edit/Lock buttons hidden           |
| 13 | Login as `focal@rictms.gov.ph`, open KPI Dashboard                                    | Can view own unit only; no Master/Monitoring tabs        |
| 14 | Call `GET /api/kpi/dashboard/summary?periodYear=0&periodMonth=2` directly             | Returns HTTP 400 Bad Request (not 500 NaN SQL error)    |

