# RICTMS Compliance Hub - QA User Manual

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
- KPI Master, KPI Monitoring, KPI Dashboard, and KPI lookup table behavior

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

## I. KPI Module  User Manual & QA Guide (v1.3.0.3)

### I.1 What Is a KPI Band?

A **KPI Band** is a color-coded performance classification applied to a unit or an individual KPI based on its **Normalized Score** (0100 scale).

| Band  | Color  | Default Score Range | Meaning                              |
|-------|--------|---------------------|--------------------------------------|
| Green |  Green | 90  100          | Target met or exceeded  Performing  |
| Amber |  Amber | 75  89.99        | Near target  Needs attention        |
| Red   |  Red  | 0  74.99         | Below threshold  Immediate action   |

**How normalized score is calculated:**
- For *higher-is-better* KPIs: `(Actual  Target)  100`, capped at 100.
- For *lower-is-better* KPIs: `(Target  Actual)  100`, capped at 100.
- For *Yes/No* KPIs: `100` if actual = 1 (Yes), `0` if actual = 0 (No).

**Composite Unit Score** = Weighted average of all KPI normalized scores for a unit in a period.  
Where multiple KPIs have different weights, higher-weight KPIs influence the unit score more.

---

### I.2 KPI Master  CRUD Steps

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

### I.3 KPI Monitoring  Encoding Periodic Values

> Role required: `super_admin`, `reviewer`, or `section_head`

#### Encode a KPI Monitoring Value
1. Navigate to **KPI Monitoring & Dashboard**  **KPI Monitoring** tab.
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

### I.4 KPI Dashboard  Reading the Dashboard

The **KPI Dashboard** tab is visible to all roles.

#### Period Filter Controls
- **Period Year**: Select the reporting year.
- **Frequency**: Choose `Monthly`, `Quarterly`, `Semestral`, or `Annual`.
  - Monthly: select a specific month.
  - Quarterly: select Q1 (JanMar), Q2 (AprJun), Q3 (JulSep), Q4 (OctDec).
  - Semestral: select H1 (JanJun) or H2 (JulDec).
  - Annual: shows full-year data (Dec as the end month).
- Click **Refresh** to reload data after changing filters.

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
- Long unit names are truncated with `` and shown at an angle for readability.
- Click a unit row in the table below the chart to drill into KPI details.

#### Unit Detail Panel
- Shows the selected unit's composite score and band.
- Bar chart displays each KPI's normalized score.
- Table lists KPI code, target value, actual value, normalized score, and band.

#### Band Distribution (Pie Chart)
- Shows the proportion of units in each performance band.
- Color legend is auto-rendered using band colors.

---

### I.5 Role-Scoped Visibility Rules

| Role               | Can View Dashboard | Can Drill Unit Detail | Can Manage KPI Master | Can Encode Monitoring |
|--------------------|-------------------|----------------------|-----------------------|-----------------------|
| `super_admin`      | All units          | All units            |  Yes               |  Yes                |
| `reviewer`         | All units          | All units            |  Yes               |  Yes                |
| `section_head`     | Own unit only      | Own unit only        |  Yes               |  Yes                |
| `focal`            | Own unit only      | Own unit only        |  No                |  No                 |
| `auditor`          | Own unit only      | Own unit only        |  No                |  No                 |
| `technician`       | Own unit only      | Own unit only        |  No                |  No                 |

---

### I.6 KPI Module Smoke Checks (v1.3.0.3)

| # | Test Step                                                                        | Expected Result                               |
|---|----------------------------------------------------------------------------------|-----------------------------------------------|
| 1 | Load KPI page as `admin@rictms.gov.ph`                                          | No NaN SQL errors in backend; dashboard loads |
| 2 | Default period shows May 2025 with 10 monitoring rows                            | Scorecards show data; charts render           |
| 3 | Switch frequency to **Quarterly (Q2)**  click Refresh                           | Dashboard recalculates for AprilJune data    |
| 4 | Switch frequency to **Annual**, click Refresh                                    | Full-year December data shown                 |
| 5 | Click a unit row  Unit Detail panel                                             | Unit's KPI breakdown visible, band chips show |
| 6 | KPI Master tab: Create new KPI for any unit                                      | Saved successfully, appears in table          |
| 7 | KPI Monitoring tab: Encode actual value for new KPI                              | Saved as Draft                                |
| 8 | Lock the encoded row                                                              | Status shows LOCKED, Edit/Lock buttons hide   |
| 9 | Login as `focal@rictms.gov.ph`, open KPI Dashboard                               | Can view own unit only; no Master/Monitoring tabs |
| 10| Try calling `GET /api/kpi/dashboard/unit/NaN?periodYear=NaN` directly           | Returns 400 Bad Request, not 500 NaN SQL error |
| 11| Check Unit KPI Scores bar chart with 7+ units (add more units if needed)         | Bars have angled labels, no overflow          |
| 12| Band Scale legend row shows Green/Amber/Red chips below scorecards               | Color chips visible with threshold ranges     |

