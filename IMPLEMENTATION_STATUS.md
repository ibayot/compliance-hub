# RICTMS Compliance Hub - Implementation Progress Report

## 🚀 v0.6.5 — QA Fixes (Current)

| Area | Status | Notes |
|------|--------|-------|
| `ticket-category.entity.ts` `isActive`/`isDeleted` | ✅ Complete | Renamed from `is_active`/`is_deleted`; explicit `name:` column annotations added |
| `ticket-settings.service.ts` where-clause updates | ✅ Complete | All TypeORM property refs use camelCase |
| Office-day column indicators (attendance + login grids) | ✅ Complete | `isOfficeDayForDate()` used in column headers for visual dimming |
| Silent auto-refresh (attendance + tickets) | ✅ Complete | `silentRefreshXxx` callbacks skip loading state on background polls |

---

## 🚀 v0.6.4 — QA Fixes

| Area | Status | Notes |
|------|--------|-------|
| `technician_type` column on `role_definitions` | ✅ Complete | `VARCHAR(30) NULL`; migrated via `ensureSchema()` |
| `CreateRoleDefinitionDto` technician type field | ✅ Complete | `@IsOptional @IsIn([...])` |
| `AttendanceService.getCustomRoleValues()` helper | ✅ Complete | Queries role_definitions for custom tech roles |
| `RoleDefinitionEntity` in TicketsModule.forFeature | ✅ Complete | Required for AttendanceService injection |
| `u.ticket_technician` → `u.ticketTechnician` bug fixed | ✅ Complete | TypeORM property name correctness |
| Super admin excluded from Staff Login Activity | ✅ Complete | Added to `EXCLUDED_ROLES` |
| Calendar toggle cascades to attendance + login grids | ✅ Complete | `fetchAttendance()` + `fetchStaffLoginStaff()` called after toggle |
| Settings UI — technician type selector | ✅ Complete | Create + Edit dialogs in `settings/page.tsx` |
| `useAutoRefresh` hook | ✅ Complete | `frontend/src/lib/utils/useAutoRefresh.ts` |
| Auto-refresh applied to Attendance, Tickets, MoV, KPI pages | ✅ Complete | 30s polling + visibilitychange |

---

## 🚀 v0.5.0 — IT Help-Desk Ticketing + Role System Overhaul (Current)

- **Branch:** `v0.5.0` (new main)
- **Version:** `0.5.0` (both backend and frontend)

### Summary of Changes
| Area | Status | Notes |
|------|--------|-------|
| IT Help-Desk Ticketing — entity, service, controller | ✅ Complete | Full rewrite; compliance ticketing removed |
| New roles: `user`, `technician_desktop`, `technician_it_support` | ✅ Complete | Backend enum + DB migration + frontend enum |
| Google sign-in → `user` role for new accounts | ✅ Complete | `auth.service.ts` |
| Admin-create → `focal` default | ✅ Complete | `users.service.ts` |
| Nav restriction: `user` sees only Dashboard + Tickets | ✅ Complete | `Sidebar.tsx` |
| User Dashboard (ticket counts + satisfaction fill %) | ✅ Complete | `dashboard/page.tsx` |
| Email autocomplete in Create User dialog | ✅ Complete | `GET /users/search-email` + `Autocomplete` in settings |
| Ticket detail page — new IT help-desk schema | ✅ Complete | `tickets/[id]/page.tsx` |
| Ticket list page — new IT help-desk UI | ✅ Complete | `tickets/page.tsx` |
| Role definitions: 8 roles with descriptions | ✅ Complete | `DEFAULT_ROLE_DEFINITIONS` |

---

## 📌 QA Fix Checkpoint 22 (2026-03-25) — Backend startup crash + TypeORM autoload + password reset

- **Release target:** `v1.5.0.1`
- **Root cause diagnosed:** Backend port 4000 not listening (process not running). Additionally, `app.module.ts` TypeORM config used a glob pattern `entities: [__dirname + '/**/*.entity{.ts,.js}']` that resolved zero files at runtime — TypeORM built no entity metadata, causing `EntityMetadataNotFoundError` for every repository call. Two `onModuleInit` hooks (`TicketService`, `MovService`) propagated this error without catching it, crashing the process before it could bind port 4000.
- **`autoLoadEntities: true` applied:** Replaced the broken glob in `TypeOrmModule.forRootAsync`. NestJS `autoLoadEntities` links all entities declared via `TypeOrmModule.forFeature()` into the root DataSource automatically.
- **`TicketService.onModuleInit` hardened:** `seedDefaultConfigs()` call wrapped in try-catch; failures emit a non-fatal WARN log.
- **`MovService.onModuleInit` hardened:** Added `Logger` field; `seedDefaultAssessmentArtifacts()` call wrapped in try-catch; failures emit a non-fatal WARN log. Pattern now matches `DocumentService`.
- **Password reset:** All 4 accounts reset to `password123`. Hash generated via isolated Node.js script (bypassing PowerShell `$` expansion). Applied via piped SQL file. Verified with `bcrypt.compare()` → `true`.

### Accounts after reset
| Email | Role | Password |
|-------|------|----------|
| admin@rictms.gov.ph | super_admin | password123 |
| reviewer@rictms.gov.ph | reviewer | password123 |
| focal@rictms.gov.ph | focal | password123 |
| jmmmaguigad@dswd.gov.ph | focal | password123 |

### Validation snapshot
- Backend startup: ✅ `Nest application successfully started` — no crash, no `EntityMetadataNotFoundError`
- Port 4000: ✅ listening
- Login test (`admin@rictms.gov.ph` / `password123`): ✅ 200 with valid JWT
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED`

### Migration / rollback notes
- No schema migration required.
- Rollback entity config: restore `entities: [__dirname + '/**/*.entity{.ts,.js}']` (not recommended — glob doesn't work in this environment).
- Rollback passwords: re-run `UPDATE users SET passwordHash = 'new-hash'` with desired bcrypt hash.

## 📌 QA Fix Checkpoint 21 (2026-03-24) — Remove Gmail-only restriction; remove email/password Gmail registration

- **Release target:** `v1.5.0.1`
- **`@gmail.com` domain check removed:** `verifyGoogleIdToken()` now only requires a verified email; any Google-hosted account is accepted.
- **`POST /auth/register-gmail` endpoint removed** from controller and service. Email+password Gmail self-registration is no longer a supported path.
- **Frontend login page simplified:** register mode, First Name/Last Name fields, `handleRegister`, and "Register with Gmail" toggle all removed. Google sign-in is the sole non-password registration path.
- **Google button always visible:** `{hasGoogleClient && <GoogleLogin ...>}` is no longer guarded by `!registerMode`.
- **`locale="en"` enforced** on `GoogleLogin` component.
- **`registerGmail` API function removed** from `lib/api/auth.ts`.

### Validation snapshot
- Diagnostics (`get_errors` on 4 changed files): ✅ no errors
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED`
- Frontend build: ✅ exit code 0

### Migration / rollback notes
- No DB migration needed.
- Rollback: restore `@gmail.com` domain check, re-add `register-gmail` endpoint + service method + DTO import, restore register mode UI.

## 📌 QA Fix Checkpoint 20 (2026-03-24) — Runtime hotfix: TypeORM entity type + frontend env

- **Release target:** `v1.5.0.1`
- **Root cause diagnosed:** `DataTypeNotSupportedError: Data type "Object" in "User.googleSub"` — TypeORM could not infer SQL type from `string | null` union without explicit `type:` on the `@Column` decorator. This blocked all TypeORM entity metadata from being built, causing cascading `EntityMetadataNotFoundError` on `TicketIssueType` and `Document` in their `onModuleInit` hooks.
- **Entity fix applied:** Added `type: 'varchar'` to `User.googleSub` column decorator.
- **Frontend env fix applied:** Populated `VITE_GOOGLE_CLIENT_ID` in `frontend/.env` (was blank), enabling the Google sign-in button to render on the login page.
- **No schema changes required:** The user schema migration (`auth_provider`, `google_sub`, unique index) was already correct from Checkpoint 19; only the TypeScript entity annotation needed fixing.

### Validation snapshot
- Backend build: ✅ `nest build` exit code 0
- Backend startup: ✅ port 4000 listening, no TypeORM errors in boot log
- Frontend build: ✅ `vite build` exit code 0
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED`

### Migration / rollback notes
- No new DB migrations; fix is a code annotation only.
- Rollback: remove `type: 'varchar'` from `User.googleSub` (reverts to broken state — not recommended).

## 📌 QA Fix Checkpoint 19 (2026-03-24)

- **Release target:** `v1.5.0.1`
- **Google service login delivered:** Added backend Google authentication endpoint (`POST /auth/google-login`) and frontend Google sign-in integration.
- **Verified Gmail-account gating:** Google login path requires verified `@gmail.com` claim from Google token payload.
- **JWT tamper-hardening completed:** issuer/audience are now enforced for token creation and verification (auth module, strategy, refresh verification), plus algorithm guard (`HS256`).
- **User auth-provider support:** added `auth_provider` + `google_sub` fields in user model and schema guard, including unique index for `google_sub`.
- **Config/env coverage:** added `JWT_ISSUER`, `JWT_AUDIENCE`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`, `GOOGLE_CALLBACK_URL`, `FRONTEND_URL`, and frontend `VITE_GOOGLE_CLIENT_ID` entries.

### Validation snapshot
- Backend diagnostics (`get_errors` on changed auth/security files): ✅ no errors
- Frontend diagnostics (`get_errors` on changed login/auth files): ✅ no errors
- Backend build: ✅ `npm --prefix backend run build`
- Frontend build: ✅ `npm --prefix frontend run build`
- Smoke script: ⚠️ `./smoke-test.ps1` blocked (`Unable to connect to the remote server`; API was not reachable in this run context)

### Migration / rollback notes
- Schema auto-migration on startup:
  - `auth_provider ENUM('local','google') NOT NULL DEFAULT 'local'`
  - `google_sub VARCHAR(255) NULL`
  - `uq_users_google_sub` unique index
- Rollback: revert Google auth endpoint/UI wiring + JWT issuer/audience verification and optionally drop provider columns/index.

## 📌 QA Fix Checkpoint 18 (2026-03-24)

- **Release target:** `v1.5.0.1`
- **Ticketing access:** frontend ticketing pages are no longer super-admin-only; sidebar visibility changed to all authenticated users.
- **Gmail self-registration:** backend `POST /auth/register-gmail` + frontend login registration flow added; domain restricted to `@gmail.com`.
- **Assignment governance:** implemented dedicated `PUT /tickets/:id/assign`; only super admin or `ticketMainFocal=true` users are authorized.
- **Lower-level technician governance:** added `GET /tickets/technicians/list`, `GET /tickets/technicians/candidates`, and `PATCH /tickets/technicians/:id` endpoints; eligibility is active + non-super-admin + Gmail address.
- **Schema extension:** added `ticket_main_focal` and `ticket_technician` fields on users (entity + DTO + service persistence + auth payload + settings UI).
- **Settings UX clarity:** explicit message added when Add Role Definition is disabled because all predefined enum role codes are consumed.

### Validation snapshot
- Backend diagnostics (`get_errors` on changed files): ✅ no errors
- Frontend diagnostics (`get_errors` on changed files): ✅ no errors
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `.\smoke-test.ps1` (all passed)

### Migration / rollback notes
- User schema auto-migration on startup:
  - `ticket_main_focal TINYINT(1) NOT NULL DEFAULT 0`
  - `ticket_technician TINYINT(1) NOT NULL DEFAULT 0`
- Rollback: revert new ticket governance endpoints + registration endpoint + UI wiring; optionally drop both columns.

## 📌 QA Fix Checkpoint 17 (2026-03-24)

- **Release target:** `v1.5.0.1`
- **Separator fix:** Removed `─` char counting from `@bottom-center` CSS content; restored `border-top: 1px solid #9ca3af` on `@bottom-center` and `@page :first @bottom-center`. Character-counting overflows right margin due to variable font advance widths. CSS border-top is always exact.
- **`h2` spacing:** Added `h2 { margin-bottom: 10px !important; }` to print CSS for gap after main report title.
- **Signature block:** Print-only "Prepared by / Approved by" two-column table. 6 state vars. useEffect auto-fills from current user. Included in preset save/load. Report Settings UI section added.
- **`positionFull` field:** `position_full VARCHAR(255) NULL` added via `IF NOT EXISTS`. Entity, DTO, service create/update, auth login response, frontend types, and Settings UI all updated.

### Validation snapshot
- Backend type-check: ✅ `npx tsc --noEmit` (0 errors)
- Frontend build: ✅ `npm run build` (20.36s)
- Smoke script: ✅ `.\smoke-test.ps1` (all passed)

### Migration / rollback notes
- `position_full` column added automatically on backend restart via `IF NOT EXISTS`. Safe for zero-downtime deploy.
- Rollback: revert entity + service + DTO, `ALTER TABLE users DROP COLUMN position_full`, revert `buildPrintHtml()` separator and signature block.

## 📌 QA Fix Checkpoint 16 (2026-03-24)

- **Release target:** `v1.5.0.1`
- Print CSS specificity hardening applied to `buildPrintHtml()` in `mov/page.tsx`.
- `html, body { margin: 0 !important; padding: 0 !important; }` — backend report `<style>` tags contain `body { margin: 24px; }` which was re-injected after our CSS and winning without `!important`.
- `.summary-block { margin: 0 !important; line-height: 1.15 !important; }` — Summary section uses `<div class="summary-block">` (not `<p>`); backend sets `line-height: 1.8` on this class; prior `p/h1-h6` reset missed it.
- `table { margin: 0 !important; }` — extracted styles add vertical margin to tables in print.

### Validation snapshot
- Frontend build: ✅ `npm run build` (15.39s)
- Smoke script: ✅ `.\smoke-test.ps1` (all passed)

### Migration / rollback notes
- No schema migration required.
- Rollback: remove three `!important` additions and `.summary-block` rule from `buildPrintHtml()` CSS block in `mov/page.tsx`.

## 📌 QA Fix Checkpoint 15 (2026-03-24)

- **Release target:** `v1.5.0.1`
- Footer border-top removed; single `─` separator (168 chars landscape, 114 portrait) after page counter.
- DSWD logo set to 39px (87% of Bagong Pilipinas 45px); `vertical-align:middle` added to both header img elements.
- Line-height 1.15 applied with `!important` to `p, h1-h6`; `.print-root` base line-height set.
- Same-file image re-upload bug fixed (`e.target.value = ''` reset in `handleImageUpload`).
- Print preset feature: save/load/delete via `MovArtifact` with `artifact_type: 'print_settings'`; DTO `period_year >= 2000` and `content_markdown` non-empty constraints handled.
- Canvas JPEG image compression (400px max, 75% quality, white prefill for transparent PNG alpha).

### Validation snapshot
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `.\smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback: revert `buildPrintHtml()` header/footer/preset sections in `mov/page.tsx`.

## 📌 QA Fix Checkpoint 13 (2026-03-23)

- **Release target:** `v1.5.0.1`
- Replaced JS overlay footer approach with CSS `@page @bottom-center` margin boxes.
- Root cause: hidden iframe at `width:0; height:0` caused `scrollHeight` to reflect 0-width reflow, making `pageHeightPx` geometry unreliable for `position:absolute` overlay placement.
- `counter(page)` / `counter(pages)` evaluated natively by print engine in margin boxes — correct and reliable.
- `@page :first { @bottom-center }` for separate first-page footer.
- CSS `counter-reset` on `<html>` for `startPage` offset support.
- All JS overlay code and geometry calculation removed.

### Validation snapshot
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `.\smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback: revert `buildPrintHtml()` in `mov/page.tsx`.

## 📌 QA Fix Checkpoint 12 (2026-03-23)

- **Release target:** `v1.5.0.1`
- Landscape print orientation applied: `@page { size: A4 landscape; }`, `A4_HEIGHT_MM` corrected from `297mm` to `210mm`.
- Footer overlay placement corrected: top is now `i * pageHeightPx - footerHeight - 4px` (inside the content area bottom), replacing the prior formula that placed footers beyond the content zone into the inaccessible browser margin band.
- Row-break CSS hardened: `table`, `tr`, `td`, `th` now use `page-break-inside: auto !important; break-inside: auto !important;` to prevent extracted document styles from blocking row splits.
- Removed unused JS variables (`bottomMarginPx`, `footerStartFromBottomPx`) from the print script.

### Validation snapshot
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `.\smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback by reverting `frontend/src/app/dashboard/mov/page.tsx` orientation, footer top formula, and break-inside rules.

## 📌 QA Fix Checkpoint 11 (2026-03-23)

- **Release target:** `v1.5.0.1`
- Reverted prior MoV print overreach that altered content placement beyond QA scope.
- Reimplemented print behavior with page-margin-focused approach:
  - A4 + page margins (`0.5in` side, `1in` top/bottom),
  - footer placement computed inside bottom margin geometry,
  - footer baseline starts `0.5in` from page bottom,
  - multiline footer triggers minimal dynamic bottom reserve expansion.
- Maintained existing report container/content flow to avoid layout breakage.

### Validation snapshot
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `./smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback by reverting `frontend/src/app/dashboard/mov/page.tsx` print-margin/footer placement logic introduced in this checkpoint.

## 📌 QA Fix Checkpoint 10 (2026-03-23)

- **Release target:** `v1.5.0.1`
- MoV print layout now applies A4 geometry with side margin `0.5in` and baseline top/bottom margins `1in`.
- Footer placement logic now computes page-top offsets into the bottom margin zone (starting `0.5in` above page bottom), preventing footer drift into content rows.
- Dynamic bottom-margin reserve added for multi-line footer content so printable content adjusts upward to avoid overlap.
- First-page header is offset toward top margin region to align with `0.5in`-down header start expectation.
- Table rows remain splittable across pages (`page-break-inside: auto`) to minimize print whitespace.

### Validation snapshot
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `./smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback by reverting MoV print margin constants and dynamic footer placement/reserve logic from this checkpoint.

## 📌 QA Fix Checkpoint 9 (2026-03-11)

- **Release target:** `v1.5.0.1`
- Automated-check remarks now emit and display explicit multiline bullets for readability.
- HTML preview title display hardened for both newly generated fallback previews and existing rendered HTML previews (filename-like headings replaced with display title).
- MoV print/footer formatting updated:
  - footer input supports first-line page token (`1` or `Page 1`),
  - output format is `Page X of Y` + separator + footer content,
  - first-page footer note uses the same format when separate first-page footer is enabled.

### Validation snapshot
- Backend tests: ✅ `property-check.engine.spec.ts`, `date-check.engine.spec.ts`
- Backend build: ✅ `npm run build`
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `./smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback by reverting metrics remarks formatting, document remarks rendering/preview title normalization, and MoV footer formatting changes from this checkpoint.

## 📌 QA Fix Checkpoint 8 (2026-03-11)

- **Release target:** `v1.5.0.1`
- Number extraction now supports per-keyword comparisons (`comparisons[]`) in addition to per-keyword expected values (`expected_numbers[]`).
- Automated return remarks for number extraction now focus on failed extracted-number checks only (keyword + actual + operator + expected).
- Document detail updates:
  - focal download action restored for current version (including returned items),
  - unit display no longer renders empty parentheses when code is missing.
- Preview fallback title priority updated to prefer display fields before filename fallback.
- MoV print/style updates:
  - centered footer with separator lines and page-number segment,
  - first-page header left aligned,
  - print typography normalized,
  - sky-blue table header in preview and print.

### Validation snapshot
- Backend tests: ✅ `property-check.engine.spec.ts`, `date-check.engine.spec.ts`
- Backend build: ✅ `npm run build`
- Frontend build: ✅ `npm run build`
- Smoke script: ✅ `./smoke-test.ps1`

### Migration / rollback notes
- No schema migration required.
- Rollback by reverting metrics engine/service and metrics-page comparison mapping, plus document detail/preview/MoV print styling edits from this checkpoint.

## 📌 QA Fix Checkpoint 7 (2026-03-11)

- **Release target:** `v1.5.0.1`
- Removed visible document version history panel and header refresh action from document detail page.
- Added focal-compliant-only `Download` action in document detail header (current version).
- Strengthened return remarks container emphasis using high-contrast filled error alert.
- Added Google Docs URL import path:
  - Frontend upload form now supports `Import from Google Docs`.
  - Backend endpoint `POST /documents/google-doc` exports Google Doc to DOCX and reuses existing upload validation, processing, preview, and metrics flow.
- Updated preview fallback header labeling to display-name wording.
- Improved MoV print output:
  - first-page header anchoring,
  - page-attached footer styling,
  - enhanced table border continuity for multi-page print.

### Validation snapshot
- Backend build: ✅ `npm run build`
- Frontend build: ✅ `npm run build`
- Targeted backend tests: ✅ `property-check.engine.spec.ts`, `date-check.engine.spec.ts`

### Migration / rollback notes
- No schema migration required; API addition is additive only.
- Rollback by reverting document-detail/upload/API changes in frontend and Google-Docs/preview adjustments in backend documents module.

## 📌 QA Fix Checkpoint 6 (2026-03-10)

- **Release target:** `v1.5.0.1`
- Upload request path no longer blocks on fallback processing (`upload` returns immediately)
- DOCX uploads with non-empty initial extraction now skip full process queue and trigger metrics directly in background
- Added queue watchdogs for `process-document` and `compute-metrics` to recover unconsumed jobs
- Upload response now returns reloaded entity instead of heavy in-memory object
- Archived tab now renders archived-specific table columns:
  - `Title`, `Type`, `Period`, `Status`, `Return Remarks`, `Archived Date`
- Archived query uses placeholder/stale settings to avoid spinner-first UX
- Backend type-check: ✅ `npx tsc --noEmit`
- Frontend build: ✅ `npm run -s build`
- E2E verification (provided file): ✅ upload fast + metrics auto-run + expected fail (`needs_revision`)

## 📌 QA Fix Checkpoint 5 (2026-03-10)

- **Release target:** `v1.5.0.1`
- Documents page (focal): replaced separate archived-page navigation with in-page tabs (`Active Documents`, `Archived Documents`)
- Archived tab uses existing `documents` endpoint with `archived=true`; no archive rules changed
- Metrics fallback hardening: `DocumentService` now checks Redis reachability before queueing
- When queue infra is unavailable, service runs inline processing + `computeMetricsAndAutoReview` fallback
- `MetricsProcessor` now delegates to `MetricsService.computeMetricsAndAutoReview()` (single source of truth)
- Startup recovery + manual reprocess now also use enqueue-or-fallback path
- Backend type-check: ✅ `npx tsc --noEmit`
- Frontend build: ✅ `npm run -s build`
- Runtime note: local API startup currently blocked by existing `TicketIssueType` metadata error in this environment (non-QA9 code path)

## 📌 QA Fix Checkpoint 4 (2026-03-10)

- **Release target:** `v1.5.0.1`
- All HTML report headers centered; period/summary/h3/th font: Arial 10pt
- Monitoring Matrix: renamed “ICT Compliance Register Monitoring”, Q-score column headers, actual URL links for Source, colgroup widths, parenthetical removed from Applicable Bases
- KPI Gap Remarks Override panel visibility gated on `lastReportKind === 'assessment'`
- Assessment Plan: Print Plan button (iframe-based standalone HTML print)
- Assessment Schedule: Print Schedule button (same mechanism)
- Metrics controller: `reportorial_doc_type_id` now included in applicability `appData` on create and update
- Document service: focal upload skips legacy `validateFocalSubmission` when `reportorial_doc_type_id` is provided
- Backend build: ✅ clean | Frontend build: ✅ clean | Smoke tests: ✅ 15/15 passed

## 📌 QA Fix Checkpoint 3 (2026-03-09)

- **Release target:** `v1.5.0.1`
- Register report columns refactored (removed Responsible Unit + Review Frequency, added Applicable Provisions + Evidence of Compliance, Effectivity date formatted `mmm-dd-yyyy`, Type superscript, legend comma-separated, summary bullets removed, all cells `vertical-align: middle`)
- Register Monitoring Matrix split into separate standalone report endpoint + UI button
- MoV Builder page restricted to `super_admin` + `reviewer` roles only
- Report Settings panel added (2 header images, page footer, optional separate first-page footer)
- KPI Gap Remarks: all remarks overridable + new free-form "Additional Manual Remarks" field
- Assessment Plan tab redesigned as visual timeline (colored Avatar badges, accent-bordered cards, year Chips)
- Artifacts tab: inline status edit (Edit icon → Select dropdown → Save/Cancel)
- Backend build: ✅ clean | Frontend build: ✅ clean | Smoke tests: ✅ 15/15 passed

## 📌 QA Fix Checkpoint 2 (2026-03-05)

- **Release target:** `v1.5.0.1`
- **Theme:** Issuances monitoring extension + MoV Builder workflow alignment
- **Status:** ✅ Implemented and validated

### Delivered in this checkpoint
- Issuances now supports quarterly compliance tagging (`Q1`..`Q4`) and explicit `register_added_at` tracking.
- Issuances UI now captures and displays quarter compliance + register-added date in add/edit/detail flows.
- MoV Builder reorganized into tabbed workflow to reduce long scrolling.
- Register generation split into three dedicated controls:
  - Legal Register report
  - Standards Register report
  - Internal Policy Register report
- Register grouping now follows issuance type/category and includes all applicable issuances in selected register tables.
- Register “Added Entries” summary now uses `register_added_at` (fallback `created_at`) within selected quarter boundaries.
- Assessment report updates:
  - checklist based on assessment-plan items,
  - conformance narrative made human-readable,
  - failed items use `❌`,
  - schedule section renamed and remarks-enabled,
  - manual KPI remarks override supported.
- Assessment plan now supports edit/add/delete with bullet-item authoring.
- Assessment schedule now supports status + remarks updates per entry.
- Print/PDF action migrated to iframe print flow to avoid popup-window failures.

### Validation snapshot
- Backend build: ✅
- Backend unit tests: ✅
- Frontend build: ✅
- Smoke script (`smoke-test.ps1`): ✅ passed end-to-end

### Migration / rollback notes
- DB impact is additive only (new nullable issuance columns).
- Rollback by reverting MoV + Issuances backend/frontend/schema/seed changes included in this checkpoint.

## 📌 QA Fix Checkpoint (2026-03-05)

- **Release target:** `v1.5.0.1`
- **Theme:** KPI + Issuances + MoV Builder QA compliance fixes
- **Status:** ✅ Implemented and validated

### Delivered in this checkpoint
- KPI query handling hardened to prevent `Validation failed (numeric string is expected)` on dashboard/action-plan query paths.
- Issuances seed text/context enriched for:
  - `binding_nature`
  - `adoption_basis`
  - `applicable_provisions`
  - `compliance_obligations`
- Issuances `Process Owner` changed to dropdown sourced from active app users (focal/reviewer/section_head/super_admin-focused).
- MoV report generation switched to HTML visual output and aligned with requested reporting structure:
  - Required ISMS register header + period/summary bullets
  - Register table aligned to requested compliance columns
  - Split sections: Legal Register / Standards Register / Internal Policy Register
  - Monitoring matrix added (`Applicable Bases | Description/Link | Compliance Score (Q1-Q4)`)
  - Notes removed from register output
- MoV UX updates:
  - Rename to **MoV Builder**
  - Optional Unit field now text-based (not numeric ID)
  - Print/save-PDF support via browser print action

### Validation snapshot
- Backend build: ✅
- Backend unit tests: ✅
- Frontend build: ✅
- Smoke script (`smoke-test.ps1`): ✅ passed end-to-end

### Migration / rollback notes
- DB impact in this checkpoint is seed-data enrichment only (non-destructive).
- Rollback by reverting KPI controller, MoV service/controller/UI/API, Issuances page, sidebar label, and seed-data updates.

## 📌 Release Checkpoint (2026-03-04)

- **Release target:** `v1.5.0.1`
- **Theme:** KPI MoV Major Update (quality-first)
- **Status:** ✅ Implemented and build-validated

### Delivered in this checkpoint
- Added backend `mov` module with artifact CRUD + MoV template generation endpoints.
- Added `mov_artifacts` schema/seed support.
- Added frontend `MoV Planner` page and dashboard navigation entry, now refocused as a report builder.
- Added register report auto-generation from Issuances data.
- Added assessment report/checklist generation using plan + schedule + KPI monitoring comparison.
- Added 5-year assessment roadmap seed and quarterly schedule sample seeds.
- Added visible KPI dashboard action-plan recommendations.
- Expanded Issuances register fields for governance/evidence/action tracking.

### Validation snapshot
- Backend build: ✅
- Backend unit tests: ✅
- Frontend build: ✅
- Smoke script (`smoke-test.ps1`): ✅ passed end-to-end.

> Update (`v1.1.0-dev`, 2026-02-24): blob-backed document version storage and preview conversion hardening applied.

## 📌 Release Checkpoint (2026-02-24)

- **Release target:** `v1.0.0`
- **State:** Candidate build validated and ready for selective staging/tag/push.
- **Push policy:** Core code + public docs are included; status-tracking docs remain local-only.

### Validation Snapshot
- Backend build: ✅
- Backend tests (metric engines): ✅
- Frontend build: ✅ (non-blocking warnings remain: `pdfjs` eval/chunk-size)
- API smoke checks (auth/metrics/tickets/reviews): ✅

### Post-checkpoint patch (2026-02-24 PM)
- Added issuance document mapping manager UI with link/unlink operations.
- Confirmed mapping persistence through backend `document_issuances` relation endpoints.
- Added explicit role-based visibility on issuance CRUD/mapping actions for compliance + super-admin users.
- Regression validation rerun: backend build/tests and frontend build passed.
- Replaced destructive document action flow with non-destructive return-for-revision workflow and mandatory remarks.
- Added role-aware document list behavior (super-admin/compliance hide returned; focal sees returned for revision).
- Added dynamic ticket issue type/category metadata management with super-admin CRUD and soft-delete safeguards.
- Fixed User Manual access by wiring `/dashboard/user-manual` route in frontend router.

---

## ✅ COMPLETED SPRINTS

### Security + DevOps Baseline Patch (2026-02-24) - ✅ COMPLETE
**Security:**
- Added API rate limiting middleware for `/api` routes in backend bootstrap.
- Configurable controls via environment values:
  - `RATE_LIMIT_WINDOW_MS`
  - `RATE_LIMIT_MAX_REQUESTS`

**DevOps:**
- Added first CI pipeline: `.github/workflows/ci.yml`.
- CI jobs now include:
  - backend build
  - frontend build
  - backend test hook (`jest --passWithNoTests`)
  - dependency scanning via `npm audit --audit-level=high` for backend and frontend

**Documentation/QA:**
- Added `QA-USER-MANUAL.md`.
- Expanded `WALKTHROUGH.md` with Metrics how-to and QA flow.

### Stabilization Patch: Deadlines + Metrics + Reviews + Tickets (2026-02-23) - ✅ COMPLETE
**Backend:**
- Fixed `/documents/:id/metrics` to resolve document ID to current version ID before fetching metric results.
- Enhanced metric engines:
  - Section check now handles escaped/flexible heading matching.
  - Keyword check now escapes regex input and supports config fallback for minimum matches.
  - Property check now supports `number_extraction` mode.
  - Date check now supports configurable deadline rules (`deadline_day`, `deadline_month_offset`, `max_days_late`).
- Added ticket issue documentation fields (`issue_type`, `resolution_steps`, `resolution_date`).
- Fixed JWT identity mapping in ticket/review controllers (`req.user.id` fallback).

**Frontend:**
- Reworked Metrics page to typed rule builders (Section/Keyword/Number Extraction/Date Deadline).
- Added submission-frequency controls to Date/Deadline templates (`monthly`, `quarterly`, `annual`, `custom`).
- Added inline digital viewer to Reviews page with direct compliance decision tagging.
- Updated document detail preview flow to authenticated blob-based loading.
- Updated ticket pages to include issue type and resolution documentation controls.

**User/QA Documentation:**
- Added `QA-USER-MANUAL.md` for step-by-step feature validation.
- Expanded `WALKTHROUGH.md` with Metrics Template Builder and QA workflow sections.

**Validation:**
- Backend build ✅
- Frontend build ✅
- API smoke tests:
  - login ✅
  - metrics template create (date_check with deadline fields) ✅
  - ticket create/update with issue fields ✅
  - review submit ✅

### Hotfix Patch: Frontend Compile + Incident Analytics (2026-02-23) - ✅ COMPLETE
**Frontend:**
- Fixed `AppBar.tsx` syntax regression that blocked frontend compilation.
- Repaired `Sidebar.tsx` and preserved collapsed/expanded navigation UX.
- Added period posture section to `/dashboard/incidents`.
- Migrated frontend framework to **Vite + React Router** and removed dependency on Next.js runtime.

**Backend:**
- Added `GET /api/incidents/period-stats` endpoint.
- Implemented period aggregation logic for daily/weekly/monthly/quarterly/yearly windows.

**Validation:**
- `backend`: `npm run build` ✅
- `frontend`: `npm run build` ✅

### Sprint 0: Project Setup (22h) - ✅ COMPLETE
- Backend: NestJS with TypeORM, MariaDB configuration
- Frontend: Vite + React Router with Material-UI v5
- Authentication: JWT with refresh tokens, bcrypt
- Database: MariaDB 11 setup and connection
- Docker: compose file for Redis and MariaDB
- Build verification: Both stacks compile successfully

### Sprint 1: Auth & Core Entities (61h) - ✅ COMPLETE
**Backend:**
- User authentication (login, register, token refresh)
- Role-based access control (SUPER_ADMIN, REVIEWER, FOCAL, TECHNICIAN, AUDITOR)
- User CRUD with profile management
- Units module with hierarchy support
- DocumentType configuration

**Frontend:**
- Login page with JWT token management
- Dashboard layout with navigation
- Protected routes
- User context and authentication flow

### Sprint 2: Document Management (73h) - ✅ COMPLETE
**Backend:**
- Document entity with versioning support
- File upload with Multer
- Storage service (filesystem-based)
- Document processor (Bull queue for background processing)
- Text extraction from DOCX files (Mammoth.js)
- PDF preview generation (LibreOffice conversion)
- Version service for managing document versions

**Frontend:**
- Document upload form with validation
- Document list with filtering and pagination
- Document detail page with version history
- PDF viewer component (react-pdf)
- Version timeline visualization

### Sprint 3: Compliance Engine (58h) - ✅ COMPLETE
**Backend:**
- MetricTemplate entity for rule definitions
- MetricApplicability for unit/document type mapping
- MetricResult for storing computation results
- 4 Metric Engines Implemented:
  1. **SectionCheckEngine**: Verify required sections exist
  2. **KeywordCheckEngine**: Check for required/prohibited keywords
  3. **PropertyCheckEngine**: Validate metadata properties
  4. **DateCheckEngine**: Check submission timeliness
- Automatic metrics computation after document text extraction
- Weighted scoring system
- Pass/fail determination with evidence collection

**Frontend:**
- Metrics CRUD interface
- Metric results visualization
- Compliance score display

### Sprint 4: Reviews & Comparison (57h) - ✅ COMPLETE
**Backend Entities:**
- ManualReview:
  - ReviewDecision enum (compliant, non_compliant, needs_revision)
  - Findings array with severity levels
  - Remarks and reviewer tracking
  - Timestamp tracking
- VersionComparison:
  - Document version diff tracking
  - Diff statistics (additions, deletions, unchanged)
  - HTML diff output for visualization

**Backend Services:**
- ReviewService:
  - submitReview(): Submit manual compliance review
  - getLatestReview(): Get most recent review
  - getReviewHistory(): Get all reviews for a document
  - getEvidenceReport(): Generate comprehensive report with metrics + review data
- ComparisonService:
  - compareVersions(): Use diff-match-patch library for text comparison
  - getComparison(): Retrieve comparison by ID
  - getDocumentComparisons(): Get all comparisons for a document
  - calculateDiffStats(): Compute change statistics

**Backend Controllers:**
- ReviewController with endpoints:
  - POST /documents/:documentId/reviews (submit review)
  - GET /documents/:documentId/reviews/latest
  - GET /documents/:documentId/reviews (history)
  - GET /documents/:documentId/reviews/evidence-report
- ComparisonController:
  - POST /comparisons (create version comparison)
  - GET /comparisons/:id
  - GET /comparisons/document/:documentId

**Frontend Components:**
- ReviewForm: Form for submitting manual reviews with findings
- ReviewDisplay: Display review decision, remarks, and findings
- VersionComparison: Split-pane diff viewer with stats

**Dependencies Installed:**
- diff-match-patch: Text differencing library
- @types/diff-match-patch: TypeScript definitions

### Sprint 5: References & Tickets (60h) - ✅ BACKEND COMPLETE
**Backend Entities:**
- Issuance:
  - Track regulatory documents (CMO, DBM, CSC issuances)
  - Fields: issuance_number, title, issuing_authority, issue_date, effectivity_date
  - Many-to-many relationship with Documents
  - Source URL tracking
- Ticket:
  - Support ticket system for issues and queries
  - Categories: document_related, system_issue, compliance_query, training_request, other
  - Status: open, in_progress, resolved, closed
  - Priority: low, medium, high, urgent
  - Auto-generated ticket numbers (TICK-2024-0001)
  - Assigned to, reported by tracking
- TicketComment:
  - Comment thread for tickets
  - User and timestamp tracking

**Backend Services:**
- IssuanceService:
  - createIssuance(): Add new regulatory reference
  - getIssuances(): List with filtering (authority, search, active status)
  - linkDocument() / unlinkDocument(): Manage document-issuance relationships
  - updateIssuance() / deleteIssuance(): CRUD operations
- TicketService:
  - createTicket(): Auto-generate ticket number
  - getTickets(): List with filters (status, priority, category, unit, assignee)
  - updateTicket(): Update status, assign, change priority
  - addComment(): Add comment to ticket thread
  - getStatistics(): Get ticket stats by status and priority

**Backend Controllers:**
- IssuanceController:
  - Full CRUD REST endpoints
  - Link/unlink document endpoints
- TicketController:
  - Ticket CRUD with automatic reporter tracking
  - Comment addition
  - Statistics endpoint

**Database Schema Updates:**
- Added extracted_text field to DocumentVersion entity
- Added issuances Many-to-Many relationship to Document entity

### Sprint 2 UI Completion Patch (2026-02-23) - ✅ COMPLETE
**Frontend:**
- Units page upgraded from placeholder to full CRUD operations.
- Metrics page upgraded from placeholder to functional template management.
- Reviews page upgraded from placeholder to review queue + review submission.

**UI/UX Fixes:**
- Dashboard/sidebar overlap resolved with responsive content offset based on sidebar width.
- Login input label overlap fixed.

**Performance:**
- Dashboard data requests now execute in parallel with graceful fallback handling.

**Verification:**
- Backend and frontend production builds succeed.
- Runtime API smoke tests passed for incidents period stats, units CRUD, metrics CRUD, and reviews submit/read.

## 📋 REMAINING WORK

### Sprint 5: References & Tickets - Frontend (Pending)
- Issuance management UI
  - List issuances with filters
  - Create/edit issuance form
  - Link documents to issuances
  - View issuance details
- Ticket management UI
  - Create ticket form
  - Ticket list with filters
  - Ticket detail page with comments
  - Status and priority management
  - Ticket statistics dashboard

### Sprint 6: Dashboard & Reporting (56h)
**Backend:**
- Compliance KPIs aggregation service
  - Overall compliance score
  - Pass/fail rates by unit
  - Document status breakdown
  - Metric performance trends
- Report generation service
  - PDF report generation (pdfkit or puppeteer)
  - CSV export for data analysis
  - Scheduled report generation

**Frontend:**
- Dashboard page with widgets:
  - Compliance score trends (Chart.js or Recharts)
  - Document submission status
  - Ticket status distribution
  - Recent activity feed
  - Unit performance comparison
- Report export functionality
- Drill-down capability for detailed analysis

### Sprint 7: Testing & Deployment (119h)
**Testing:**
- Unit tests for services (Jest)
- Integration tests for API endpoints (supertest)
- E2E tests for critical flows (Playwright or Cypress)
- Test coverage reporting

**Security:**
- Rate limiting (express-rate-limit) ✅ baseline implemented
- Input validation and sanitization
- SQL injection prevention
- XSS protection
- CORS configuration
- Security headers (Helmet.js)

**Performance:**
- Query optimization (indexes, eager loading)
- Caching (Redis for frequently accessed data)
- File upload size limits
- Pagination for large datasets

**Deployment:**
- Production Docker containers
- Environment configuration
- Database migration strategy
- Backup and recovery procedures
- Monitoring and logging (Winston, PM2)
- CI/CD pipeline setup ✅ baseline implemented (build + test hook + dependency scanning)

## 📊 PROGRESS SUMMARY

| Sprint | Status | Completion % |
|--------|--------|-------------|
| Sprint 0: Project Setup | ✅ Complete | 100% |
| Sprint 1: Auth & Core | ✅ Complete | 100% |
| Sprint 2: Document Management | ✅ Complete | 100% |
| Sprint 3: Compliance Engine | ✅ Complete | 100% |
| Sprint 4: Reviews & Comparison | ✅ Complete | 100% |
| Sprint 5: References & Tickets | 🟡 Backend Complete | 80% |
| Sprint 6: Dashboard & Reporting | ⏳ Pending | 0% |
| Sprint 7: Testing & Deployment | 🟡 In Progress | 30% |

**Overall Progress: ~84% Complete**

## 🔧 TECHNICAL STACK

### Backend
- **Framework**: NestJS 10
- **Database**: MariaDB 11 with TypeORM
- **Queue System**: Redis 7 + Bull (document processing, metrics computation)
- **Authentication**: JWT with refresh tokens, Passport-JWT
- **File Processing**: Multer (uploads), Mammoth.js (text extraction), LibreOffice (PDF preview)
- **Text Comparison**: diff-match-patch

### Frontend
- **Framework**: Vite 5.x + React Router 6 (React 18)
- **UI Library**: Material-UI v5
- **State Management**: React Query + Context API
- **PDF Viewing**: react-pdf (PDF.js)
- **Forms**: React Hook Form (recommended for next components)
- **Charts**: Chart.js or Recharts (to be added in Sprint 6)

### Infrastructure
- **Containerization**: Docker + Docker Compose
- **Reverse Proxy**: Potential Nginx (deployment phase)
- **Process Management**: PM2 (deployment phase)

## ✅ BUILD STATUS
- ✅ Backend: Compiles successfully with no errors
- ✅ Frontend: Builds successfully with 8 routes
- ✅ All TypeScript errors resolved
- ✅ Both NestJS and Vite frontend builds verified

## 📁 PROJECT STRUCTURE
```
Compliance Hub/
├── backend/
│   ├── src/
│   │   ├── modules/
│   │   │   ├── auth/           ✅ Complete
│   │   │   ├── users/          ✅ Complete
│   │   │   ├── units/          ✅ Complete
│   │   │   ├── documents/      ✅ Complete (11 files)
│   │   │   ├── metrics/        ✅ Complete (12 files)
│   │   │   ├── reviews/        ✅ Complete (7 files)
│   │   │   ├── references/     ✅ Complete (3 files)
│   │   │   └── tickets/        ✅ Complete (5 files)
│   │   ├── common/             ✅ Guards & Decorators
│   │   └── app.module.ts       ✅ All modules registered
│   └── package.json            ✅ Dependencies installed
│
└── frontend/
    ├── src/
    │   ├── app/
    │   │   ├── api/            ✅ API clients
    │   │   ├── dashboard/      ✅ Document pages
    │   │   └── login/          ✅ Auth page
    │   └── components/
    │       ├── documents/      ✅ Upload, List, Viewer, Timeline
    │       └── reviews/        ✅ ReviewForm, ReviewDisplay, VersionComparison
    └── package.json            ✅ Dependencies installed
```

## 🎯 NEXT STEPS

1. **Sprint 7 hardening continuation** (~16-24h):
  - Add integration tests for metrics/reviews/tickets APIs
  - Add production env validation checks
  - Add privileged-action audit logs

2. **Sprint 6: Dashboard & Reporting** (~56h):
   - Implement KPI aggregation service
   - Create dashboard with charts
   - Add report generation and export

3. **Deployment readiness** (~24-32h):
  - Add rollback/runbook documentation
  - Add staging parity validation checklist
  - Add monitoring/alerting baseline

---

## KPI MoV Quality Checkpoint (2026-03-04)

### Completed (No-Code)
- Updated KPI audit to quality-first scope (Efficiency explicitly deprioritized for this pass).
- Confirmed registry scope guidance: include applicable laws, regulations, executive issuances, plans, and adopted standards/frameworks (with binding/adoption classification).
- Added improved Register table-content recommendation set (including applicability scope and relevance notes).
- Added Assessment MoV planning structure (Year 1 phased plan + succeeding-year maturity cycle guidance).
- Added ICT Document Review Report template supporting national and regional scope.

### Deferred to Implementation Stage
- Backend/frontend/db/config changes required to operationalize templates and additional governance fields.
- End-to-end testing for new flows (to be executed only after code implementation).

## 📝 NOTES
- All branding changed from RICMS to RICTMS
- Database switched from PostgreSQL to MariaDB per user request
- Both builds tested and verified per user requirement
- Ready to continue with remaining phases

---

## Incremental Implementation - 2026-03-11

### Frontend
- Added `formatDocumentPeriod` utility and integrated it into document list/detail displays.
- Updated `DocumentViewer` with configurable viewer title.
- Updated document detail/review/repository preview usage to pass display-title context.
- Simplified invalid filename toast and added Google Docs upload instruction.
- Improved archived remarks readability and MoV report preview text contrast.
- Renamed sidebar module label to **Knowledge Base** and restricted it to `super_admin`.
- Enforced `super_admin` access guards in Knowledge Base list/detail pages.

### Backend
- Repository grouping now returns compliant-only enriched documents.
- Preview generator now prefers document display title in HTML fallback headers.
- Metrics period inference/parser updated for compact formats (`YYYYMM`, `YYYYMM-MM`).
- Property/keyword/date engines now emit clearer actual-vs-expected failure messages.

### Verification
- `npm test -- metrics/engines/property-check.engine.spec.ts metrics/engines/date-check.engine.spec.ts` ✅
- Frontend `npm run build` ✅
- Backend `npm run build` ✅
