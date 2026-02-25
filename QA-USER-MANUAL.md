# RICTMS Compliance Hub - QA User Manual

> Update (`v1.1.0-dev`, 2026-02-24): QA checks now include blob persistence validation and DOCX-to-PDF preview generation checks.

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
