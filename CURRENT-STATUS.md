# Current Status Update - Compliance Hub
> Update (`v0.6.6` — 2026-03-30): **QA Fixes: Category Realtime in Modal, Force Logout on Deletion, Roles Re-seed.** (1) **Category realtime** — New Ticket dialog now polls active categories every 10 s while open; admin-disabled categories disappear within one polling cycle without needing to re-open the modal (`setInterval` in `useEffect`). (2) **Force logout on account deletion** — `JwtStrategy.validate()` now performs a DB lookup on every authenticated request and throws `UnauthorizedException` if the user is not found or `active = false`; the existing axios interceptor handles the resulting 401 by clearing tokens and redirecting to `/login`. (3) **Roles re-seed fixed** — removed `ensureRoleDefinitions()` call from `getRoles()`; seeding now runs only at backend startup (constructor) so deliberately-deleted custom roles remain deleted across auto-refresh cycles.

> Update (`v0.6.5` — 2026-03-27): **QA Fixes: Category Status Toggle, Office-Day Column Indicators, Silent Auto-Refresh.** (1) **Category active/inactive toggle** — `TicketCategoryConfig` entity used snake_case property names (`is_active`, `is_deleted`); TypeORM serialized JSON with those names but frontend expected camelCase (`isActive`, `isDeleted`) → toggle always showed "Inactive" and saves always wrote `false`. Fixed by renaming entity properties to camelCase with explicit `name:` column annotations; updated service `where`-clause references. (2) **Office-day column indicators** — Technician Attendance and Staff Login Activity column headers now dim non-office days using `isOfficeDayForDate()` (grey background + disabled text color). (3) **Auto-refresh flicker** — replaced `useAutoRefresh(fetchXxx)` calls (which show loading spinners) with dedicated silent-refresh callbacks that update state in the background without triggering spinners.
> Update (`v0.6.4` — 2026-03-27): **QA Fixes: Technician Type Tag, All-Techs Count, Super-Admin Login, Calendar Cascade, Auto-Refresh.** (1) **Role definition technician type** — new `technician_type` column on `role_definitions`; Settings UI gains a selector so custom-role users appear in the Technician Attendance grid. (2) **All-techs count bug fixed** — `u.ticket_technician` corrected to `u.ticketTechnician` (TypeORM property name); custom-role users now included via new `getCustomRoleValues()` helper. (3) **Super admin excluded from Staff Login Activity** — added `super_admin` to `EXCLUDED_ROLES` in `getStaffLoginsMonthly`. (4) **Calendar auto-cascades** — toggling an office day now also refreshes the attendance grid and staff login grid immediately. (5) **`useAutoRefresh` hook** — 30s polling + visibilitychange applied to Attendance, Tickets, MoV, and KPI pages.

> Update (`v0.5.0` — IT Help-Desk + Role Overhaul): **Major refactor.** (1) **IT Help-Desk Ticketing** — Ticketing module completely rewritten from compliance ticketing to a full IT help-desk system with two support types (Desktop Support / IT Support), statuses (Open → Assigned → In Progress → Resolved → Closed), auto-generated ticket numbers (TKT-YYYY-NNNN), role-scoped visibility, technician assignment, and client satisfaction ratings (1–5 stars). (2) **Role System** — Three new roles added: `user` (regular Google sign-in user), `technician_desktop`, `technician_it_support`. Admin-created accounts default to `focal` (RICTMS staff); new Google sign-in accounts receive `user` role; existing accounts preserve their role. (3) **Navigation** — `user` role sees only Dashboard and Tickets; all other modules restricted to staff. (4) **User Dashboard** — `user` role shows personalised ticket counts, satisfaction fill-rate, and a "Rate Now" button. (5) **Email Autocomplete** — Create User dialog in Settings now suggests registered email addresses via `GET /users/search-email`. (6) **Version** reset to `0.5.0`; branch `v0.5.0` created as new main.


> Update (`v1.5.0.1`, QA Fix Checkpoint 22 — 2026-03-25): **Backend startup hardening + password reset.** Root cause of all auth failures identified: backend was not running (port 4000 not listening) AND the TypeORM `entities` glob pattern resolved zero files at runtime, so no entity metadata was registered — every repository call threw `EntityMetadataNotFoundError`. Three fixes applied: (1) Replaced `entities: [__dirname + '/**/*.entity{.ts,.js}']` with `autoLoadEntities: true` in `app.module.ts` — NestJS auto-registers all entities declared via `forFeature`. (2) Wrapped `TicketService.seedDefaultConfigs()` in try-catch (non-fatal warn on failure). (3) Added `Logger` to `MovService` and wrapped `seedDefaultAssessmentArtifacts()` in try-catch. All 4 user passwords reset to `password123` (bcrypt-verified). Backend now boots cleanly, port 4000 listening, login returns valid JWT. Smoke suite: ✅ ALL SMOKE TESTS PASSED.

> Update (`v1.5.0.1`, QA Iteration 26 — 2026-03-24): **Removed Gmail-only restriction and email/password Gmail registration flow.** `verifyGoogleIdToken` no longer enforces `@gmail.com` domain — any Google account with a verified email is accepted. Removed `POST /auth/register-gmail` endpoint + `registerGmail()` service method. Frontend login page simplified: no more register mode toggle, First Name/Last Name fields, or "Register with Gmail" button. Google sign-in button is now always visible (instead of only when not in register mode), with `locale="en"` forced. Removed `registerGmail` from frontend API client. Validation: 4/4 diagnostics clean ✅, frontend build ✅, smoke suite ✅ all tests passed.

 `verifyGoogleIdToken` no longer enforces `@gmail.com` domain — any Google account with a verified email is accepted. Removed `POST /auth/register-gmail` endpoint + `registerGmail()` service method. Frontend login page simplified: no more register mode toggle, First Name/Last Name fields, or "Register with Gmail" button. Google sign-in button is now always visible (instead of only when not in register mode), with `locale="en"` forced. Removed `registerGmail` from frontend API client. Validation: 4/4 diagnostics clean ✅, frontend build ✅, smoke suite ✅ all tests passed.

> Update (`v1.5.0.1`, QA Iteration 25 — 2026-03-24): **Runtime hotfix for Google auth startup.** Fixed `DataTypeNotSupportedError: Data type "Object" in "User.googleSub"` by adding explicit `type: 'varchar'` to the `@Column` decorator — TypeORM cannot infer SQL type from a `string | null` TypeScript union without an explicit `type`. Also populated `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` (was blank, preventing the Google sign-in button from rendering). After both fixes: server starts cleanly on port 4000, all smoke tests pass (login, roles, docs, units, metrics, tickets, KPI, auth-me), and Google sign-in button is now visible on the login page.

> Update (`v1.5.0.1`, QA Iteration 24): Implemented **Google service authentication** end-to-end for Gmail users (not just email-domain registration). Backend now supports `POST /auth/google-login` with server-side Google ID-token verification and verified `@gmail.com` gating; frontend login now includes Google sign-in when `VITE_GOOGLE_CLIENT_ID` is configured. Added token tamper-hardening by enforcing JWT `issuer`/`audience` on both sign and verify paths (auth module, strategy, refresh flow), with configurable `JWT_ISSUER` and `JWT_AUDIENCE`. User schema now supports provider identity (`auth_provider`, `google_sub`) with safe auto-add and unique index creation in startup schema guard. Validation: backend/frontend diagnostics ✅, backend build ✅, frontend build ✅. Smoke script currently blocked in this environment (`Unable to connect to the remote server`) due API reachability at run time.

> Update (`v1.5.0.1`, QA Iteration 23): Ticketing module access/governance update is complete. (1) **Ticketing visibility**: Knowledge Base/Ticketing navigation is open to all authenticated roles; ticket list/detail are no longer super-admin-only. (2) **Gmail self-registration**: new `POST /auth/register-gmail` endpoint plus login-page registration flow; only `@gmail.com` emails accepted for self-registration. (3) **Role-distinct assignment governance**: only **super admin** or users tagged as **ticket main focal** can assign tickets (`PUT /tickets/:id/assign`) and designate lower-level technicians (`PATCH /tickets/technicians/:id`). (4) **Lower-level technician eligibility**: must be active, non-super-admin, and Gmail-registered. (5) **User schema extension**: `ticket_main_focal` and `ticket_technician` columns auto-added via `IF NOT EXISTS`. (6) **Settings clarification**: explicit helper text added to explain why "Add Role Definition" can be disabled (all predefined enum role codes already used). Validation: backend/frontend diagnostics ✅, frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 22): Three improvements to MoV Builder print: (1) **Separator line overflow fixed** — switched back to `border-top: 1px solid #9ca3af` on `@bottom-center` margin box instead of `─` character counting (character advance width is font/renderer-dependent and unpredictable). Border-top is CSS-constrained to exact margin-box width. (2) **Signature block added (print-only)** — "Prepared by / Approved by" table injected at end of report body when any field is set; auto-filled from logged-in user's name/position/designation; configurable in Report Settings; included in preset save/load. (3) **`positionFull` user field** — new `position_full VARCHAR(255) NULL` column in `users` table; full position title (e.g., "Information Technology Officer I") now separate from abbreviated `position` ("ITO I"); exposed in Settings > User Management create/edit dialogs with helper text; included in auth login response and frontend types. Also added `h2 { margin-bottom: 10px !important; }` to print CSS for spacing after document main title. Validation: backend tsc ✅, frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 21): Print CSS specificity hardening — three extracted-style overrides now use `!important`. (1) `html, body { margin: 0 !important; padding: 0 !important; }` — backend report styles include `body { margin: 24px; }` which was injected after our reset and winning. (2) `.summary-block { margin: 0 !important; line-height: 1.15 !important; }` — summary section uses a `<div class="summary-block">` (not a `<p>`), so the `p/h1-h6 !important` reset did not apply; backend defines `line-height: 1.8` on this class. (3) `table { margin: 0 !important; }` — extracted styles add top/bottom margin to tables. All fixes are frontend-only, no DB migration. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iterations 18–20): MoV print header images + preset save/load + CSS layout polish. Header images (DSWD logo H1=39px, Bagong Pilipinas H2=45px) displayed in flex-row with `vertical-align:middle` for correct vertical center. Canvas JPEG compression (400px, 75%, white prefill) prevents slow load and black backgrounds on transparent PNGs. Same-file re-upload fixed via `e.target.value = ''` reset. Print preset save/load/delete backed by `MovArtifact` (`artifact_type: 'print_settings'`). Footer: single `─` separator (168 chars landscape / 114 portrait) after `Page X of Y`, no `border-top`. Line-height 1.15 applied to `.print-root` and all heading/paragraph elements with `!important`. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 17): Replaced the JS overlay footer approach with native CSS `@page @bottom-center` margin boxes. Root cause for all previous footer placement failures was the hidden iframe being `width:0; height:0` — content reflows at 0-width so `root.scrollHeight` doesn't match landscape A4 layout, making the computed `pageHeightPx` useless for positioning. Margin boxes are evaluated by the browser's print engine directly: `counter(page)` / `counter(pages)` are correct, the footer lands in the actual `@page` bottom margin zone every time, and no JS measurement is needed. Separate first-page footer uses `@page :first`. Page number offset uses CSS `counter-reset`. Footer separator uses `border-top` on the margin box. All JS overlay code removed. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 16): MoV print is now **landscape** (`A4 landscape`; `A4_HEIGHT_MM` corrected to 210 mm). Footer placement fixed: overlays are now anchored to `i * pageHeightPx - footerHeight - 4px`, placing them cleanly at the bottom of each page's content zone instead of beyond it. Row page-break rules strengthened with `!important` so document-extracted styles cannot block row splitting. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 15): Reverted the prior overreaching MoV print layout pass and replaced it with a targeted page-margin/footer-area solution. Print now uses A4 page margins (`L/R 0.5in`, `T/B 1in`) while preserving existing content placement behavior. Footer placement is computed from the bottom margin zone (`0.5in` from page bottom baseline) and dynamic bottom reserve only expands when multiline footer content requires it. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 14): MoV print layout now follows A4 with left/right `0.5in` and top/bottom `1in` margins, with footer placement anchored inside the bottom-margin area at `0.5in` upward offset. Footer block height is now measured/reserved through dynamic bottom-margin expansion so content adjusts safely for multi-line footer text. First-page header alignment is offset toward the top-margin zone, and table rows remain breakable across pages in print to reduce whitespace gaps. Validation: frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 13): Automated-check return remarks now render as explicit multiline bullets for readability. HTML document previews now enforce display-title replacement of filename-like headings (including already generated HTML previews rendered in the viewer). MoV print footer formatting now supports first-line pagination tokens (`1` or `Page 1`) and outputs `Page X of Y` + separator + footer content, including first-page footer note formatting when enabled. Validation: backend targeted tests ✅, backend build ✅, frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 12): Number-extraction metrics now support per-keyword comparison operators and emit concise failed-number remarks (`keyword: actual did not satisfy operator expected`) for returned-document guidance. Document detail fixes include focal current-version download visibility (including returned items), unit-label formatting without empty parentheses, and viewer fallback title priority toward display fields. MoV print output now centers footer content, separates page numbering with line dividers, keeps first-page header left-aligned, enforces print typography consistency, and applies sky-blue table headers to app preview + print. Validation: backend tests/build ✅, frontend build ✅, smoke suite ✅.

> Update (`v1.5.0.1`, QA Iteration 11): Document detail UX simplified by removing visible version history and refresh controls. Added compliant-only focal `Download` action, stronger return-remarks emphasis styling, and explicit display-name rendering in HTML fallback previews. Added Google Docs URL import flow (`/documents/google-doc`) that exports to DOCX and runs through the existing upload/preview/metrics pipeline. MoV printing now applies page-attached footers, first-page header anchoring, and stronger table border continuity for multi-page print output. Validation: backend build ✅, frontend build ✅, targeted metrics tests ✅.

> Update (`v1.5.0.1`, QA Iteration 10): Upload path hardened so fallback processing does not block request completion. For DOCX uploads with successful initial extraction, status is set to `READY` and metrics are kicked off immediately in background. Added queue watchdog fallback for unconsumed jobs. Archived tab now renders archived-specific table columns (`Title`, `Type`, `Period`, `Status`, `Return Remarks`, `Archived Date`) with reduced spinner-first behavior. Verified using `cybersecurity_incident_summary_report_202603.docx`: upload returns quickly and auto-generates failed metrics leading to `needs_revision`.

> Update (`v1.5.0.1`, QA Iteration 9): Documents page now uses in-page tabs for focal users (**Active Documents** / **Archived Documents**) instead of separate archived navigation. Backend document processing now has explicit Redis reachability checks with inline fallback: when Redis/Bull is unavailable, upload/startup-recovery/reprocess still run extraction + metrics + auto-review end-to-end (no silent stuck `pending`). Metrics auto-review behavior was centralized in `MetricsService.computeMetricsAndAutoReview()` for parity between queue and fallback execution.

> Update (`v1.5.0.1`, QA Iteration 8): Bull queue startup recovery added to `DocumentService.onModuleInit` — stuck `pending`/`processing` documents are automatically re-queued on every backend restart; `reprocessDocument` now routes to `compute-metrics` (if `extracted_text` exists) instead of always running the full `process-document` pipeline. This fixes the broken metrics chain: upload → text-extract → metrics → NEEDS\_REVISION auto-review → focal can archive → archived page shows docs.

> Update (`v1.5.0.1`, QA Iteration 7): Cybersecurity metrics now auto-return correctly — `getApplicableMetrics` fixed to use `reportorial_doc_type_id` branch; new `POST /documents/:id/reprocess` endpoint recovers stuck Bull-queue documents; `getDocumentById` no longer throws 404 for archived docs; Map References button hidden for focal users; ARCHIVED info banner shown on detail page for `is_deleted=true` documents; archived page `staleTime: 30_000` + `limit: 50` + clickable rows.

> Update (`v1.5.0.1`, QA Iteration 6): Documents UX hardening — admin queue hides compliant/needs_revision/non_compliant docs; Reviews queue filters out compliant rows; focal users see no Return button, no Unit column, no Uploaded By column; document title now uses Display Name from reportorial doc types; detail page shows workflow status chip + return remarks banner; redundant "Download Current" header button removed; focal can archive returned docs (new `POST /archive` endpoint + `/documents/archived` page); upload immediately reflects in list via query invalidation; KPI unit filter auto-locked to focal's own unit; metrics auto-return works correctly with restored admin filter.

> Update (`v1.5.0.1`, QA Iteration 5): Documents workflow overhaul — focal uploads now start as `PENDING` (visible to admins); re-upload allowed after return (soft-deletes old returned doc); admin list filter no longer hides returned docs; `returnDocumentForRevision` accepts both PENDING and READY docs; focal status labels changed to Pending Review / Approved / Returned; Reviews module restricted to `super_admin` + `reviewer` with `ready` status filter; Reports module restricted to `super_admin` + `reviewer`.

> Update (`v1.5.0.1`, 2026-03-10 - Iteration 4): Report headers centered, Arial fonts on period/summary/h3/th, Monitoring Matrix renamed to “ICT Compliance Register Monitoring” with Q-score columns + URL source links + colgroup widths + removed Applicable Bases parenthetical; KPI Remarks panel hidden until Assessment Report generated; Print Plan + Print Schedule buttons added; Metrics applicability bug fixed (reportorial_doc_type_id now saved); Document upload focal path fixed (no longer throws false assignment error when using new doc-type system).

> Update (`v1.5.0.1`, 2026-03-09 - Iteration 3): Register report columns refactored (remove 2 cols, rename Effectivity, font specs, vertical-align, no-bullet summary, separate Monitoring Matrix report), MoV role-gating, Report Settings (header images + footer), KPI remarks free-form, Assessment Plan timeline design, Artifacts status edit.

> Update (`v1.5.0.1`, 2026-03-05 - Iteration 2): Issuances quarterly monitoring tags + register-added date, MoV Builder tabbed reorganization, per-register report buttons/coverage, assessment-plan/schedule editing enhancements, and print reliability fix.

> Update (`v1.5.0.1`, 2026-03-05): QA polish pass applied for KPI validation stability, Issuances seed/context enrichment, and MoV Builder HTML register output with print/save-PDF support.

> Update (`v1.5.0.1`, 2026-03-04): KPI MoV major update implemented with MoV Planner, assessment/review templates, and KPI action-plan automation.

> Update (`v1.1.0-dev`, 2026-02-24): document upload/preview now runs on blob-first persistence with backward compatibility.

**Date:** February 24, 2026  
**Sprint Window:** Sprints 5-8 (hardening + test integration + release prep)  
**Status:** 🟢 Release Candidate Prepared (`v1.0.0`)

## 🔒 Local-Only Tracking Note

This file is part of local project tracking and is **not intended for the `v1.0.0` git push**.


## ✅ Current Release-Prep Highlights (2026-02-24)

### Major KPI MoV update delta (2026-03-04)

  - Register report auto-generates from saved Issuances records.
  - Assessment report/checklist auto-generates from assessment plan + schedule + KPI monitoring.
  - Assessment schedule entries are user-settable in UI with seeded sample entries.
  - backend build ✅
  - backend tests ✅
  - frontend build ✅
  - smoke script ✅ passed end-to-end.

### QA polish delta (2026-03-05)

  - now rendered in HTML visuals (not markdown-only),
  - header and summary structure aligned to QA specification,
  - table output aligned to legal/regulatory/standard reporting scope,
  - split sections: Legal Register, Standards Register, Internal Policy Register,
  - includes monitoring matrix table,
  - notes section removed.

### How to test this QA polish quickly

  - Open a compliant focal-uploaded document and verify `Download` appears.
  - Verify no `Refresh` button and no visible `Version History` panel.
  - Confirm return remarks banner is high-contrast and urgent.
  - In Upload Document, provide a valid Google Docs URL and import.
  - Verify imported document appears in list and preview renders in Document Viewer.
  - Generate a report, set header image/footer, then Print.
  - Confirm footer is page-attached, header is anchored to first page, and long tables print with stronger page-border continuity.
- Backend build: `cd backend && npm run build`
- Backend tests: `cd backend && npm test -- --runInBand`
- Frontend build: `cd frontend && npm run build`
- Smoke: `./smoke-test.ps1` from repo root
- Manual UI checks:
  - KPI dashboard/reports should no longer throw numeric-string validation errors.
  - Issuances Add/Edit dialog should show Process Owner dropdown values from app users.
  - MoV Builder register generation should render HTML report, show 3 register sections, and support `Print / Save PDF`.

### Migration / rollback notes

- Seed migration in this pass is content enrichment only (no destructive schema modifications).
- Rollback by reverting updated files in KPI controller, MoV service/controller/UI/API, Issuances page, sidebar label, and `backend/src/database/seed-data.sql`.

### QA iteration 2 delta (2026-03-05)

- Issuances now supports explicit quarterly monitoring tags in-register:
  - `Q1 Compliance`, `Q2 Compliance`, `Q3 Compliance`, `Q4 Compliance`
  - `Register Added Date` for monitoring/reporting basis.
- MoV Builder reduced vertical scroll load by splitting workflow into tabs:
  - Reports
  - Assessment Plan
  - Assessment Schedule
  - Artifacts
- Register reporting now has three dedicated actions:
  - `Generate Legal Register Report`
  - `Generate Standards Register Report`
  - `Generate Internal Policy Register Report`
- Register report generation now uses issuance-type categorization and includes all applicable issuances for the selected register type.
- Added-entry summary in reports now uses `register_added_at` (fallback `created_at`) within the selected quarter window.
- Print/PDF workflow moved to iframe-based browser print (prevents popup-open failures).
- Assessment report generation improvements:
  - button renamed to `Generate Assessment Report`
  - checklist sourced from assessment-plan bullet items
  - conformance text rewritten in plain language (no dash-list output)
  - failed checks use `❌`
  - `Assessment Schedule` section now includes remarks
  - manual KPI remarks override available before report generation
- Assessment Plan now supports edit/add/delete and bullet-item authoring per year.
- Assessment Schedule now supports status and remarks updates per row.

### How to test this iteration quickly

- Backend build: `cd backend && npm run build`
- Backend tests: `cd backend && npm test -- --runInBand`
- Frontend build: `cd frontend && npm run build`
- Smoke: `./smoke-test.ps1` from repo root
- Manual UI checks:
  - Issuances Add/Edit should show quarter compliance selectors and register-added date.
  - MoV Builder should show tabbed layout and three register generate buttons.
  - Assessment Plan entries should support edit/add/delete with bullet lists.
  - Assessment Schedule rows should allow status/remarks updates and save.
  - Print/Save PDF should launch print dialog without popup error.

### Migration / rollback notes (iteration 2)

- DB migration is additive:
  - new issuance columns: `q1_compliance_status`, `q2_compliance_status`, `q3_compliance_status`, `q4_compliance_status`, `register_added_at`.
- Rollback by reverting:
  - Issuances entity/service/UI/API and schema/seed updates,
  - MoV service/controller/API/UI updates,
  - related status-doc entries.

### Post-release patch delta (2026-02-24 PM)

- Added issuance document-mapping manager in frontend (link/unlink flow) backed by `document_issuances`.
- Enforced explicit role visibility in Issuances module: compliance + super admin can CRUD/map; other roles get read-only messaging.
- Fixed issuance filter parsing for `is_active` query when omitted.
- Revalidated builds/tests after patch: backend build ✅, backend tests ✅, frontend build ✅.
- Corrected document workflow from delete to non-destructive return:
  - Added `POST /documents/:id/return` with mandatory remarks.
  - Return allowed only for pending documents.
  - Returned docs are hidden from super-admin/compliance list view and remain visible to focal users.
- Added dynamic ticket metadata management:
  - Super-admin CRUD + activate/deactivate + soft-delete for issue types and categories.
  - Backward compatibility maintained via legacy enum fallback on tickets.
- Fixed in-app user manual access by registering `/dashboard/user-manual` route in frontend router.

- Security hardening baseline added:
  - API throttling/rate limiting on `/api` routes
  - environment schema validation
  - privileged-action audit logging for Metrics, Reviews, and Tickets workflows
- CI baseline added via `.github/workflows/ci.yml`:
  - backend build
  - backend tests
  - frontend build
  - dependency audit check
- Integrated backend tests added for metric engines:
  - section check
  - keyword check
  - property/number extraction check
  - date/deadline check (including frequency-aware behavior)
- Core feature stabilization validated:
  - submission-frequency date checks (`monthly`, `quarterly`, `annual`, `custom`)
  - review inline viewer + in-viewer decision tagging
  - ticket issue documentation fields and controller identity mapping fixes

---

## ✅ Completed Features

### Sprint 1: Critical UI Fixes (COMPLETE)

#### 1. Navigation Menu ✅
- **Location:** `frontend/src/components/layout/`
- **Files Created:**
  - `Sidebar.tsx` - Persistent sidebar navigation (260px width)
  - `AppBar.tsx` - Top app bar with breadcrumbs and back button
  - `DashboardLayout.tsx` - Layout wrapper component
- **Features Implemented:**
  - Persistent sidebar with icons and labels
  - Role-based menu items (admin sections only visible to authorized users)
  - Breadcrumb navigation showing current path
  - Back button on all pages
  - Mobile-responsive drawer
  - User profile menu (top-right) with logout
  - Active page highlighting
  - AppBar compile issue fixed (`MuiAppBar` JSX syntax error resolved)
  - Sidebar component rebuilt after syntax corruption; build now green
  - Frontend migrated from Next.js to Vite + React Router for improved stability and faster local development startup
- **Navigation Items:**
  - Main: Dashboard, Documents, Issuances, Tickets (Issues)
  - Admin: Units, Metrics, Reviews (super_admin + reviewer)
  - Settings: User settings (all roles)

#### 2. Container Widths Adjusted ✅
- **Change:** All pages now use 90% browser width
- **Implementation:** `DashboardLayout` wrapper applies `width: '90%'` and `mx: 'auto'`
- **Affected Pages:** Dashboard, Documents, Issuances, Tickets, Units, Metrics, Reviews, Settings

#### 3. Cybersecurity Metrics Cards ✅
- **Location:** `frontend/src/app/dashboard/page.tsx`
- **Display:** Dedicated card section on dashboard
- **Metrics Shown:**
  - Firewall Status (Compliant - Active)
  - Antivirus Updates (Compliant - Up to date)
  - User Training (Warning - 85% Complete)
  - Incident Response (Compliant - Plan Active)
- **Styling:** Color-coded status indicators (Green/Yellow/Red)
- **Note:** Currently using placeholder data. Will be connected to real API in Phase 2.

#### 3.1 Incident Posture Analytics ✅
- **Location:** `frontend/src/app/dashboard/incidents/page.tsx`
- **Backend Endpoint:** `GET /api/incidents/period-stats`
- **New Statistics Windows:** Daily, Weekly, Monthly, Quarterly, Yearly
- **Per-Window Data:** total reported, status mix, severity mix, critical-open count, resolved-within-period
- **Purpose:** Better organizational cybersecurity posture visibility over multiple time scales

### Sprint 2: Placeholder Pages (COMPLETE)

#### 4. Units Management Page ✅
- **URL:** `/dashboard/units`
- **File:** `frontend/src/app/dashboard/units/page.tsx`
- **Status:** Fully functional CRUD UI
- **Planned Features Listed:**
  - Create and manage organizational units
  - Assign focal persons
  - Configure unit-specific settings
  - View compliance statistics

#### 5. Metrics Template Builder Page ✅
- **URL:** `/dashboard/metrics`
- **File:** `frontend/src/app/dashboard/metrics/page.tsx`
- **Status:** Functional list + create/edit/delete + applicability mapping
- **Upgrade (Latest):** Date-check now supports submission frequency (`monthly`, `quarterly`, `annual`, `custom`) with annual submission-month control
- **Planned Features Listed:**
  - Section checks (required headings)
  - Keyword checks (with minimum occurrences)
  - Number extraction near keywords
  - Date validation
  - Unit assignment
  - Issuance linking

#### 6. Manual Compliance Review Page ✅
- **URL:** `/dashboard/reviews`
- **File:** `frontend/src/app/dashboard/reviews/page.tsx`
- **Status:** Functional review queue + submit decision/remarks workflow
- **Upgrade (Latest):** Added embedded digital document viewer in review dialog and direct in-viewer decision tagging (`compliant`, `non_compliant`, `needs_revision`)
- **Planned Features Listed:**
  - View pending documents
  - Side-by-side document viewer + checklist
  - Override automated results
  - Add remarks
  - Approve/request revisions

#### 7. Settings Page ✅
- **URL:** `/dashboard/settings`
- **File:** `frontend/src/app/dashboard/settings/page.tsx`
- **Status:** Basic page showing user information
- **Displays:** Name, email, role

### Sprint 3: Backend Improvements (COMPLETE)

#### 8. Swagger UI Enabled ✅
- **URL:** http://localhost:4000/api/docs
- **Package:** `@nestjs/swagger@^7.0.0`
- **Configuration:** `backend/src/main.ts`
- **Features:**
  - Interactive API documentation
  - JWT Bearer authentication support
  - Organized by tags (Authentication, Documents, Issuances, Tickets, Units, Metrics, Reviews)
  - "Try it out" functionality
  - Request/response examples
  - Schema definitions
- **Endpoints Documented:**
  - Authentication: `/api/auth/login`, `/api/auth/refresh`, `/api/auth/me`, `/api/auth/logout`
  - Documents: 36+ endpoints (CRUD, versions, metrics, reviews)
  - Units: `/api/units`, `/api/units/{id}`
  - Issuances: `/api/issuances`, `/api/issuances/{id}`
  - Tickets: `/api/tickets`, `/api/tickets/statistics`, `/api/tickets/{id}/comments`
  - Metrics: `/api/metrics`, `/api/documents/{id}/metrics`
  - Reviews: Review submission and evidence reports

---

## 🔄 In Progress

### Sprint 2: Units Management UI (NEXT)
- **Task:** Build full CRUD interface for units
- **Components Needed:**
  - Data table with search/filter
  - Add/Edit unit modal/form
  - Unit details view
  - Assign focal persons interface
- **Backend:** Already implemented, just needs frontend integration

---

## 📋 Pending Tasks

### Phase 1 MVP (Must Complete)

#### Sprint 2 Remaining:
1. **Units Management UI** - Full implementation (currently placeholder)
2. **Metrics Template Builder** - Full implementation (currently placeholder)
3. **Manual Compliance Review** - Full implementation (currently placeholder)

#### Sprint 3:
4. **Ticket System Restructure** - Change from ticketing to issue documentation
   - Database changes: Add `issue_type`, `resolution_steps`, `resolution_date`
   - Update entity, DTOs, service
   - Rebuild frontend UI
5. **Period/Month Tagging** - Not yet implemented
6. **Version Text Diff Viewer** - Compare documents side-by-side
7. **Laws/Standards Tracker** - Basic CRUD for issuances (partially done)

### Phase 2 Expansion (Future)
8. Advanced Metric Template Builder UI
9. Traceability Mapping (Issuance → Metrics → Evidence Report)
10. Notifications System (Email/In-app)
11. Period Lock/Closeout Workflow
12. Cybersecurity Metrics API Integration + Caching
13. Advanced Diff View with Change Summaries

### Phase 3 Enterprise (Future)
14. SSO Integration (OAuth 2.0/SAML)
15. Multi-Region Support
16. Offline Export Packs for Audits
17. Advanced Reporting + Scheduled Exports
18. AI Assist for Change Summarization

---

## 🧪 Testing Status

### ✅ Tested & Working
- Backend startup: Port 4000 ✅
- Frontend startup: Port 3002 ✅
- Vite frontend startup tested: boots in <1s after warm install (port auto-fallback observed) ✅
- Backend API endpoints: All operational ✅
- API smoke tests for Units/Metrics/Reviews/Incidents ✅
- Authentication: Login with JWT ✅
- Swagger UI: Accessible and functional ✅
- Database: 14 tables with seed data ✅
- Navigation: Sidebar, breadcrumbs, back button ✅
- Frontend production build (`npm run build` via Vite) ✅
- Backend production build (`nest build`) ✅
- Incident period statistics route mapped: `/api/incidents/period-stats` ✅
- Metrics endpoint mapping fixed and validated: `/api/documents/:id/metrics` now resolves current version correctly ✅
- Ticket issue workflow fields validated (`issue_type`, `resolution_steps`, `resolution_date`) via create + update API smoke test ✅
- Review submission validated after JWT reviewer-id mapping fix ✅
- Submission-frequency deadline metric creation smoke-tested (`date_check` template with annual frequency) ✅

### ⏳ Pending Testing
- Frontend UX pass on very large datasets (pagination and batching)
- Ticket system (needs restructure)
- File upload/download
- Version comparison
- Role-based permissions in UI

---

## 🎯 Current Focus

### Immediate Next Steps:
1. **Role-based UI hardening**
  - Hide/disable privileged actions in Units/Metrics/Reviews for non-admin/non-reviewer roles.

2. **Performance tuning (Phase 1.5)**
  - Add pagination and request batching for review dashboard.
  - Introduce lightweight cache windows for dashboard widgets.

3. **Ticket system alignment**
  - Continue ticket/issue workflow restructuring per operational language.

---

## 📊 Progress Metrics

### Sprint Completion:
- **Sprint 1:** 100% ✅ (Critical UI Fixes)
- **Sprint 2:** 30% 🟡 (Placeholders created, full implementation pending)
- **Sprint 3:** 50% 🟡 (Swagger done, tickets restructure pending)

### Phase Completion:
- **Phase 1 MVP:** ~40% complete
- **Phase 2 Expansion:** 0% (not started)
- **Phase 3 Enterprise:** 0% (not started)

### Overall Project:
- **Completed:** 8 major features
- **In Progress:** 1 feature
- **Pending:** 20+ features
- **Estimated Completion:** MVP by end of Sprint 3 (2-3 days)

---

## 🐛 Known Issues

### Active Notes
- Frontend build logs include an ESLint configuration warning for `prettier` extend resolution; build still completes.
- Vite build output includes a large chunk-size warning and `pdfjs-dist` eval warning; build still completes successfully.
- Metrics are now configured through guided forms; legacy raw JSON assumptions may differ from previous templates.

---

## 🔗 Quick Links

### Development Servers:
- **Backend API:** http://localhost:4000/api
- **Swagger UI:** http://localhost:4000/api/docs
- **Frontend:** http://localhost:3002

### Login Credentials (Test):
- **Super Admin:** admin@rictms.edu.ph / password123
- **Reviewer:** reviewer@rictms.edu.ph / password123
- **Focal Person:** focal1@rictms.edu.ph / password123

### Documentation:
- [Implementation Plan](IMPLEMENTATION-PLAN.md)
- [Database Setup](DATABASE-SETUP-COMPLETE.md)
- [README](README.md)
- [Installation Guide](INSTALLATION.md)
- [Walkthrough Guide](WALKTHROUGH.md)
- [QA User Manual](QA-USER-MANUAL.md)

---

## 📝 Next Actions

1. ✅ Review current progress with user
2. 🔲 Get approval to continue with Sprint 2 full implementation
3. 🔲 Build Units Management UI
4. 🔲 Build Metrics Template Builder UI
5. 🔲 Build Manual Review Interface
6. 🔲 Restructure Tickets System
7. 🔲 Test all Phase 1 features thoroughly
8. 🔲 Fix bugs as discovered
9. 🔲 Update all documentation files

---

**Last Updated:** February 23, 2026 1:45 PM  
**Updated By:** AI Development Assistant  
**Status:** Awaiting user feedback on progress

---

## KPI MoV Audit Delta (2026-03-04, Documentation-Only)

- Branch isolation confirmed for audit work: `audit/kpi-mov-gap-assessment-2026-03-04`.
- Applied quality-focused audit clarification (Efficiency ignored in this pass per user direction).
- Published concrete recommendations for Register content completeness (including applicability scope + relevance notes + binding/adoption distinctions).
- Added planning templates for:
  - Assessment artifacts (plan/schedule/report/checklist framing)
  - ICT Document Review Report (national + regional coverage)
- No backend/frontend/database/config code changes performed in this stage.

**Status:** Ready for implementation-phase scoping and change execution in a separate coding pass.

---

## QA Iteration Update (2026-03-11)

### Completed in this pass
- Implemented viewer/title/period UX fixes across Documents and preview flows.
- Improved upload filename validation messaging and added Google Docs export guidance.
- Hardened metric parsing and result messaging for clearer failed-flag diagnostics.
- Enforced compliant-only filtering in Repository output.
- Renamed Issues module to Knowledge Base and restricted access to super admins.
- Fixed MoV generated report preview contrast issue in dark mode.

### Validation results
- Backend targeted metric-engine tests: **PASS**.
- Frontend production build: **PASS**.
- Backend build: **PASS**.

### Operational note
- Port `4000` listener cleanup requested by user remains part of post-run housekeeping.
