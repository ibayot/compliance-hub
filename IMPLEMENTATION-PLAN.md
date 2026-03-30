# Compliance Hub - Complete Implementation Plan

## v0.6.8 QA Fix Execution (2026-03-30)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | `auth.service.ts` | Distinct error message for deactivated accounts on login; `refresh()` checks `user.active` |
| 2 | `AuthContext.tsx` | 60 s heartbeat `setInterval` calling `getProfile()` |
| 3 | `client.ts` | Append `?reason=session_expired` to both redirect paths |
| 4 | `login/page.tsx` | Read `?reason` param from URL; show alert banner |
| 5 | `ticket.entity.ts` | `priority` column: `VARCHAR(10) NULL DEFAULT NULL` |
| 6 | `ticket.service.ts` | DB migration for nullable priority; `priority: null` default; DUPLICATE guard in `updateTicket`; busy-technician guard in `assignTicket`; DUPLICATE guard in `assignTicket`; IT Staff roles in `getTechnicianAvailability` |
| 7 | `ticket.controller.ts` | IT Staff roles added to all `@Roles` guards |
| 8 | `tickets/[id]/page.tsx` | Duplicate confirmation modal; disable Update Status / Assign on DUPLICATE; filter assign dialog to `openCount === 0`; null priority chip |
| 9 | `tickets/page.tsx` | Null priority chip; assign dialog filter to `openCount === 0` and IT Staff roles |
| 10 | `references.ts` | `priority: TicketPriority \| null` |
| 11 | `vite.config.ts` | `host: true` |
| 12 | `main.ts` | CORS `origin: true` if no env var |
| 13 | Both `package.json` | Version bumped `0.6.7` → `0.6.8` |

### Risks
- **CORS `origin: true`** (echoes request Origin) is acceptable for internal LAN dev. For production, `CORS_ORIGIN` env var should be set to explicit domain(s).
- **Nullable priority** — existing tickets will keep their current priority value; the migration only changes the column default, not existing rows.

### Status: ✅ Complete

---

## v0.6.7 QA Fix Execution (2026-03-31)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | `ticket.entity.ts` | Added `FREEZE`/`DUPLICATE` to `TicketStatus` enum; added `duplicateOfId` column |
| 2 | `ticket.service.ts` | OPEN status restriction (only freeze/duplicate); priority restriction (FOCAL/REVIEWER/SUPER_ADMIN); DUPLICATE auto-close with `resolvedAt`; `getTechnicianAvailability` FOCAL inclusion + openCount fix; `getOpenTicketsForRequester` new method |
| 3 | `ticket.controller.ts` | Added `UserRole.FOCAL` to `assignTicket`/`getTechnicians`; added `GET /tickets/requester/:requesterId/open` |
| 4 | `ticket-settings.service.ts` | Added `pantawid_ict_support` to `updateKeywordRule` type validation |
| 5 | `lib/api/client.ts` | `isRefreshing` + `failedQueue` concurrency guard for 401 token refresh |
| 6 | `app/api/references.ts` | Added `freeze`/`duplicate` to `TicketStatus`; `duplicateOfId` on `Ticket`; `targetCategory` on `TicketKeywordRule`; `getOpenTicketsForRequester` API method |
| 7 | `ticket-settings/page.tsx` | Display fix (`targetCategory ?? category`); Pantawid added to dropdown; `pantawid_ict_support` in `TYPE_LABELS` |
| 8 | `tickets/page.tsx` | STATUS_COLOR extended; `pendingSatCount`; `isFocal`/`canAssign`; `handleOpenNewTicket` unrated warning; Freeze/Duplicate filter options; FOCAL assign button |
| 9 | `tickets/[id]/page.tsx` | Comment fix (`c.content` → `c.comment`); 10 s polling; OPEN restriction in dropdown; Duplicate picker dialog; priority update field; Pantawid type label; `handleUpdateStatus` overloaded |
| 10 | Both `package.json` | Version bumped `0.6.6` → `0.6.7` |

### Status: ✅ Complete

---

## v0.6.6 QA Fix Execution (2026-03-30)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | `tickets/page.tsx` | Added 10 s `setInterval` in `useEffect` while `newDialogOpen`; silently re-fetches active categories |
| 2 | `jwt.strategy.ts` | Injected `UsersService`; added DB lookup in `validate()`; throws 401 if user not found or inactive |
| 3 | `users.service.ts` | Removed `ensureRoleDefinitions()` call from `getRoles()` |
| 4 | `users.service.ts` | Added `findByIdSafe(id)` helper returning `null` instead of throwing |
| 5 | Both `package.json` | Version bumped `0.6.5` → `0.6.6` |

### Risks
- **JWT strategy DB lookup** adds one DB query per authenticated request. At low/medium traffic this is acceptable; for high-traffic scenarios consider a Redis user-active cache.
- **Startup-only seeding** means intentionally deleted system roles are restored on backend restart. This is by design — system roles cannot be deleted via the API anyway.

### Rollback
- Revert `jwt.strategy.ts` to payload-only return if DB lookup causes latency issues
- Re-add `ensureRoleDefinitions()` to `getRoles()` if more aggressive seeding is needed

### Status: ✅ Complete

---

## v0.6.5 QA Fix Execution (2026-03-27)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | `ticket-category.entity.ts` | Renamed `is_active` → `isActive`, `is_deleted` → `isDeleted`; added `name:` column annotations |
| 2 | `ticket-settings.service.ts` | Updated all TypeORM `where`-clause property refs to camelCase |
| 3 | `attendance/page.tsx` | Replaced `refreshTab1`/`refreshTab2`/`useAutoRefresh(fetchOfficeDays)` with silent callbacks |
| 4 | `attendance/page.tsx` | Column headers in tabs 1 & 2 now dim non-office days using `isOfficeDayForDate()` |
| 5 | `tickets/page.tsx` | Replaced `useAutoRefresh(fetchTickets)` with `silentFetchTickets` wrapper |
| 6 | Both `package.json` | Version bumped `0.6.4` → `0.6.5` |

### Status: ✅ Complete

### Notes
- No DB migration needed — column names in DB unchanged; only TypeORM entity property names changed.
- `mov/page.tsx` and `kpi/page.tsx` auto-refresh already non-flickering (those page's fetch functions don't set loading state).
- `technician` role remains hardcoded under `pantawid_ict_support`; custom roles with `technicianType` are supported alongside.

---

## v0.6.4 QA Fix Execution (2026-03-27)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | `role-definition.entity.ts` | Added `technicianType` column (`technician_type VARCHAR(30) NULL`) |
| 2 | `create-role-definition.dto.ts` | Added `technicianType` optional field with `@IsIn` validation |
| 3 | `users.service.ts` | Added `technician_type` column migration; persist `technicianType` in create + update |
| 4 | `tickets.module.ts` | Added `RoleDefinitionEntity` to `TypeOrmModule.forFeature` |
| 5 | `attendance.service.ts` | Fixed `u.ticket_technician` → `u.ticketTechnician`; added `getCustomRoleValues()`; excluded `super_admin` from staff logins |
| 6 | `frontend/src/lib/api/users.ts` | Added `technicianType` to `RoleDefinition`, `CreateRolePayload`, `UpdateRolePayload` |
| 7 | `settings/page.tsx` | Added technician type selector to create + edit dialogs |
| 8 | `useAutoRefresh.ts` | New hook: 30s polling + visibilitychange |
| 9 | `attendance/page.tsx` | Calendar toggle cascade + auto-refresh wired |
| 10 | `tickets/page.tsx`, `mov/page.tsx`, `kpi/page.tsx` | `useAutoRefresh` applied |
| 11 | Both `package.json` | Version bumped `0.6.3` → `0.6.4` |

### Status: ✅ Complete

---

## QA Fix Execution Addendum 4 (`v1.5.0.1`, 2026-03-10)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | Register Report HTML | All h2 headers centered; h3 section names centered + Arial 10pt |
| 2 | Register Report HTML | Period and summary text: Arial 10pt; th headers centered |
| 3 | Monitoring Matrix | Renamed to “ICT Compliance Register Monitoring” in report h2 and return title |
| 4 | Monitoring Matrix | Column headers Q1–Q4 Score; Source shows actual URL text |
| 5 | Monitoring Matrix | Colgroup widths added; Applicable Bases parenthetical removed |
| 6 | MoV page.tsx | KPI Gap Remarks panel shown only when lastReportKind === 'assessment' |
| 7 | MoV page.tsx | printPlan() + Print Plan button in Assessment Plan CardHeader |
| 8 | MoV page.tsx | printSchedule() + Print Schedule button in Assessment Schedule CardHeader |
| 9 | metrics.controller.ts | reportorial_doc_type_id passed through to MetricApplicability on create+update |
| 10 | document.service.ts | validateFocalSubmission skipped when reportorial_doc_type_id is present |

### Status: ✅ Complete – All builds and smoke tests passed

## QA Fix Execution Addendum 3 (`v1.5.0.1`, 2026-03-09)

### Plan Executed

| # | Area | Change |
|---|------|--------|
| 1 | Register Report | Removed Responsible Unit + Review Frequency columns |
| 2 | Register Report | Added Applicable Provisions + Evidence of Compliance columns |
| 3 | Register Report | Effectivity date format → `mmm-dd-yyyy` |
| 4 | Register Report | Type header superscript `¹`, legend comma-separated, no bullets in Summary |
| 5 | Register Report | Cell vertical-align: middle; font specs (Arial 11pt h2, Helvetica 9/10/8pt) |
| 6 | Monitoring Matrix | Separated into standalone report (backend endpoint + frontend button) |
| 7 | MoV Builder | Role-gated to `super_admin` + `reviewer` only |
| 8 | Report Settings | Header image 1 + 2 upload, page footer, optional first-page footer |
| 9 | KPI Remarks | All remarks overridable; new Additional Manual Remarks free-form field |
| 10 | Assessment Plan | Timeline redesign: Avatar badges, accent-bordered cards, year Chips |
| 11 | Artifacts | Inline status edit with Edit/Save/Cancel icons |

### Status: ✅ Complete – All builds and smoke tests passed

## QA Fix Execution Addendum 2 (`v1.5.0.1`, 2026-03-05)

### Plan Executed
1. Keep all implementation work on feature branch `feature/kpi-mov-major-update-1.5.0.1` and avoid `master` mutation.
2. Extend Issuances as register + monitoring source by adding per-quarter compliance tags and register-added date.
3. Reorganize MoV Builder to reduce scrolling and expose discrete register generation controls.
4. Ensure register generation includes all issuances by issuance-type register grouping (legal/standards/internal) and non-issue-date basis for added-entry metrics.
5. Refine assessment report generation (plan-based checklist, human-readable conformance text, remarks handling, icon updates).
6. Add assessment plan CRUD (with bullet items) and schedule status/remarks updates.
7. Revalidate with build/tests/smoke.

### Risk Notes
- **Data schema risk:** low; issuance schema changes are additive and nullable.
- **Behavioral risk:** medium; MoV UI was significantly reorganized, mitigated with route/API compatibility and end-to-end smoke pass.
- **Printing risk:** low; popup-print dependence removed via iframe print to reduce browser blocking issues.

### Rollback
- Revert these areas if rollback is needed:
  - `backend/src/modules/references/*` (quarter-status/register date)
  - `backend/src/modules/mov/*` (register/assessment generation behavior)
  - `frontend/src/app/dashboard/mov/page.tsx`
  - `frontend/src/app/dashboard/issuances/page.tsx`
  - `frontend/src/app/api/mov.ts`
  - `frontend/src/app/api/references.ts`
  - `backend/src/database/schema.sql`
  - `backend/src/database/seed-data.sql`

## QA Fix Execution Addendum (`v1.5.0.1`, 2026-03-05)

### Plan Executed
1. Stabilize KPI query validation path to eliminate numeric-string parse failures without changing scoring behavior.
2. Enrich Issuances seed context for register governance fields (`binding_nature`, `adoption_basis`, `applicable_provisions`, `compliance_obligations`).
3. Convert Issuances `Process Owner` to a users/focals dropdown sourced from active app users.
4. Refactor MoV Builder register generation to HTML visual output with QA-required header, summary, table structure, and section splits.
5. Add print/save-to-PDF workflow for generated MoV reports.
6. Re-run backend/frontend build, backend unit tests, and smoke script.

### Risk Notes
- **Regression risk (KPI):** low; service validation logic remains unchanged, controller parsing hardened only.
- **Data risk (seed updates):** low; enrichment updates are additive content updates to nullable fields.
- **Report rendering risk:** medium; HTML rendering and print behavior can vary by browser, mitigated by plain HTML/CSS and fallback report storage.

### Rollback
- Revert files touched by this addendum:
  - `backend/src/modules/kpi/controllers/kpi.controller.ts`
  - `backend/src/modules/mov/controllers/mov.controller.ts`
  - `backend/src/modules/mov/services/mov.service.ts`
  - `backend/src/database/seed-data.sql`
  - `frontend/src/app/api/mov.ts`
  - `frontend/src/app/dashboard/mov/page.tsx`
  - `frontend/src/app/dashboard/issuances/page.tsx`
  - `frontend/src/components/layout/Sidebar.tsx`

## KPI MoV Execution Tranche (`v1.5.0.1`, 2026-03-04)

### Scope
- Implement quality-first MoV coverage from `KPI-MOV-AUDIT-2026-03-04.md` with minimal, backward-compatible diffs.

### Implemented Work Pack
1. **MoV planning capability**
  - New backend `mov` module for artifact CRUD and report generation.
  - New frontend `MoV Planner` route/page refocused as report builder.
2. **KPI recommendation automation**
  - New `/api/kpi/action-plans` endpoint to generate recommendation items from KPI bands + remarks context.
  - Reports and KPI dashboard UI integration for generated action plans.
3. **Persistence support**
  - Added `mov_artifacts` table in schema + seed support.
4. **Register source-of-truth enhancement**
  - Expanded Issuances with governance/evidence/action/readiness fields required for register-level reporting.
5. **Assessment lifecycle support**
  - Seeded year-1 to year-5 assessment roadmap entries.
  - Seeded quarterly schedule samples and enabled schedule entry creation in UI.
  - Implemented assessment report/checklist generation based on plan + schedule + KPI monitoring comparison.

### Risk Notes
- **Data migration risk:** low (additive table only, no destructive schema changes).
- **Behavioral regression risk:** low (new routes/features are additive; no existing route contract removed).
- **Operational risk:** medium for smoke automation in environments where API host is not running during script execution.

### Rollback Plan
- Revert `mov` module files and frontend route/page wiring.
- Revert KPI action-plan endpoint and reports rendering block.
- Revert schema/seed `mov_artifacts` additions.

> Update (`v1.1.0-dev`, 2026-02-24): plan now tracks blob-based document persistence and conversion pipeline validation as mandatory stabilization work.

**Date Created:** February 23, 2026  
**Status:** In Progress  
**Objective:** Complete MVP Phase 1, 2, and 3 with thorough testing and documentation

## Update Addendum (2026-02-24)

### Execution Focus Shift
- Active execution is now centered on **Sprints 5-8 continuation** with mandatory hardening and test integration, not initial MVP scaffolding.

### Completed During This Window
- Added backend hardening baseline (rate limiting + env validation + privileged-action audit logs).
- Added CI baseline (`.github/workflows/ci.yml`) with build/test/audit checks.
- Added integrated metric-engine test suites for section/keyword/property/date checks.
- Finalized submission-frequency support for deadline templates.
- Implemented issuance-to-document mapping manager in frontend using existing backend link endpoints.
- Applied role-aware issuance module UX: compliance/super-admin CRUD + mapping actions, read-only fallback for others.

### Immediate Remaining Plan Steps
1. Selectively stage files for release packaging (include public docs, exclude local tracking docs).
2. Create release commit and tag `v1.0.0`.
3. Push branch and tag to configured remote.
4. Continue Sprint 8 hardening tasks after release baseline is published.

### New Governance Adjustments (2026-02-24)
1. Replace document delete workflow with non-destructive return-for-revision action.
2. Enforce mandatory remarks and reviewer identity capture on return events.
3. Hide returned documents from super-admin/compliance list while keeping focal visibility.
4. Introduce dynamic ticket issue type/category masters with super-admin CRUD and soft-delete protection.
5. Ensure in-app user manual route is fully wired and role-accessible in the Vite router.

---

## Current State Assessment

### ✅ Working Features (Phase 1 Partial)
- [x] User authentication + JWT tokens
- [x] RBAC (roles: super_admin, reviewer, focal_person, technician, auditor)
- [x] Database schema with 14 tables
- [x] Document upload + versioning (backend API)
- [x] Basic dashboard UI
- [x] Documents listing page
- [x] Issuances page
- [x] Tickets page (traditional ticketing structure)
- [x] Backend APIs operational on http://localhost:4000/api

### ❌ Missing/Broken Features

#### Critical UI Issues
1. **No Navigation Menu** - Cannot navigate back to dashboard from sub-pages
2. **No Back Buttons** - Stuck on pages after navigation
3. **Container Width** - Should be 90% browser width, currently smaller
4. **Cybersecurity Metrics** - Not visible on dashboard

#### Missing Phase 1 (MVP Must-Have)
5. **Units Management UI** - Cannot add/edit/delete units (super_admin)
6. **Metrics Template Builder UI** - Cannot configure compliance rules
7. **Manual Compliance Review UI** - Cannot manually check document compliance
8. **Ticket Structure Wrong** - Should be Issue Documentation, not ticketing system
9. **No Swagger UI** - Cannot test backend APIs visually
10. **Period/Month Tagging** - Not implemented in UI
11. **Compare Previous Version** - Text diff view missing
12. **Laws/Standards Tracker** - Basic CRUD missing

#### Missing Phase 2 (Expansion)
13. **Advanced Metric Template Builder** - No UI for complex rules
14. **Traceability Mapping** - Issuance → Metrics → Evidence Report
15. **Notifications** - No email/in-app notifications
16. **Period Lock/Closeout Workflow** - Not implemented
17. **Cybersecurity Metrics API Integration** - No caching, no data fetching
18. **Advanced Diff View** - No change summaries by headings

#### Missing Phase 3 (Enterprise)
19. **SSO Integration** - Not implemented
20. **Multi-Region Support** - Not implemented
21. **Offline Export Packs** - No audit export functionality
22. **Advanced Reporting** - No scheduled exports
23. **AI Assist** - No change summarization

---

## Implementation Plan

<!-- Last updated: 2026-03-09 — Register Report QA Iteration 3 complete. All register table column fixes, monitoring matrix separation, MoV role gate, report settings panel, KPI remarks, plan timeline, artifact status edit implemented and smoke-test verified. -->
### **PHASE 1A: Critical UI Fixes** (Priority: URGENT)

#### Task 1.1: Add Navigation Menu
- **Files to Create:**
  - `frontend/src/components/layout/Sidebar.tsx` - Main navigation sidebar
  - `frontend/src/components/layout/AppBar.tsx` - Top app bar with breadcrumbs
  - `frontend/src/components/layout/DashboardLayout.tsx` - Layout wrapper
- **Files to Modify:**
  - `frontend/src/app/dashboard/layout.tsx` - Use new DashboardLayout
- **Features:**
  - Persistent sidebar with: Dashboard, Documents, Issuances, Tickets, Units (admin), Metrics (admin), Settings
  - Breadcrumb navigation showing current path
  - Mobile-responsive drawer
  - User profile menu in top-right
  - Logout button

#### Task 1.2: Adjust Container Widths
- **Files to Modify:**
  - All page files: `dashboard/page.tsx`, `documents/page.tsx`, `issuances/page.tsx`, `tickets/page.tsx`
- **Change:** `maxWidth="lg"` → `maxWidth={false}` + `sx={{ width: '90%', mx: 'auto' }}`

#### Task 1.3: Add Cybersecurity Metrics Cards
- **Files to Modify:**
  - `frontend/src/app/dashboard/page.tsx`
- **Features:**
  - New card: "Cybersecurity Compliance" with status indicators
  - Sample metrics: Firewall Status, Antivirus Updates, User Training, Incident Response
  - Status colors: Green (compliant), Yellow (warning), Red (non-compliant)

---

### **PHASE 1B: Core Missing Features** (Priority: HIGH)

#### Task 1.4: Units Management UI
- **Files to Create:**
  - `frontend/src/app/dashboard/units/page.tsx` - Units list + CRUD
  - `frontend/src/components/units/UnitForm.tsx` - Add/Edit unit form
  - `frontend/src/lib/api/units.ts` - API client
- **Backend:**
  - Already exists: `backend/src/modules/units/` (verify CRUD endpoints)
- **Features:**
  - List all units with data table
  - Add new unit (super_admin only)
  - Edit unit details
  - Activate/deactivate units
  - Assign focal persons to units

#### Task 1.5: Metrics Template Builder UI
- **Files to Create:**
  - `frontend/src/app/dashboard/metrics/page.tsx` - Metrics templates list
  - `frontend/src/app/dashboard/metrics/[id]/page.tsx` - Edit template
  - `frontend/src/components/metrics/MetricBuilder.tsx` - Drag-and-drop rule builder
  - `frontend/src/components/metrics/RuleForm.tsx` - Individual rule configuration
- **Backend Files to Create:**
  - `backend/src/modules/metrics/dto/create-template.dto.ts`
  - `backend/src/modules/metrics/services/template.service.ts`
  - `backend/src/modules/metrics/controllers/template.controller.ts`
- **Features:**
  - List metric templates (section_check, keyword_check, date_check, number_range_check)
  - Create new template with rules:
    - **Section Check:** Define required sections/headings
    - **Keyword Check:** List keywords + minimum occurrences
    - **Number Check:** Extract numbers near keywords (e.g., "Budget: $50,000")
    - **Date Check:** Verify document dates within reporting period
  - Assign templates to units and issuances
  - Test template against sample document

#### Task 1.6: Manual Compliance Review UI
- **Files to Create:**
  - `frontend/src/app/dashboard/reviews/page.tsx` - Pending reviews list
  - `frontend/src/app/dashboard/reviews/[documentId]/page.tsx` - Review interface
  - `frontend/src/components/reviews/ComplianceChecklist.tsx` - Checklist UI
- **Features:**
  - List documents pending manual review
  - Open document viewer + compliance checklist side-by-side
  - Automated metric results displayed (pass/warning/fail)
  - Manual override: Mark as compliant/non-compliant
  - Add reviewer remarks
  - Submit review → Update document status

#### Task 1.7: Restructure Tickets System
- **Database Changes:**
  ```sql
  -- New structure for Issue Documentation
  ALTER TABLE tickets 
    ADD COLUMN issue_type VARCHAR(100),
    ADD COLUMN resolution_steps TEXT,
    ADD COLUMN resolution_date TIMESTAMP,
    MODIFY COLUMN category VARCHAR(100) -- More flexible categories
  ```
- **Backend Files to Modify:**
  - `backend/src/modules/tickets/entities/ticket.entity.ts`
  - `backend/src/modules/tickets/dto/create-ticket.dto.ts`
  - `backend/src/modules/tickets/services/ticket.service.ts`
- **Frontend Files to Modify:**
  - `frontend/src/app/dashboard/tickets/page.tsx`
  - `frontend/src/app/dashboard/tickets/[id]/page.tsx`
- **New Structure:**
  - **Issue:** Title/summary of the problem
  - **Category:** Document-related, System, Compliance, Training, Other
  - **Description:** Detailed explanation
  - **Resolution Steps:** Numbered steps taken to resolve (markdown)
  - **Date Reported:** Auto-generated
  - **Date Resolved:** When marked as resolved
  - **Status:** Open, In Progress, Resolved, Documented

#### Task 1.8: Enable Swagger UI
- **Backend Files to Modify:**
  - `backend/package.json` - Add `@nestjs/swagger` dependency
  - `backend/src/main.ts` - Configure SwaggerModule
- **Installation:**
  ```bash
  cd backend && npm install @nestjs/swagger swagger-ui-express
  ```
- **Configuration:**
  - Swagger available at: `http://localhost:4000/api/docs`
  - Add API decorators to all controllers
  - Document DTOs with `@ApiProperty()`

#### Task 1.9: Version Comparison Text Diff
- **Files to Create:**
  - `frontend/src/components/documents/TextDiffViewer.tsx`
  - `frontend/src/lib/utils/textDiff.ts` - Diff algorithm
- **Features:**
  - Side-by-side comparison
  - Highlight additions (green) and deletions (red)
  - Show line numbers
  - Jump to next/previous change
  - Export comparison as PDF

---

### **PHASE 2: Expansion Features** (Priority: MEDIUM)

#### Task 2.1: Advanced Metric Template Builder
- **Features Beyond Basic:**
  - Conditional rules (IF section exists THEN check keywords)
  - Weighted scoring (assign points to each rule)
  - Template inheritance (base template + unit-specific overrides)
  - Formula builder for calculated metrics
  - Import/export templates as JSON

#### Task 2.2: Traceability Mapping
- **Files to Create:**
  - `frontend/src/app/dashboard/traceability/page.tsx`
  - `backend/src/modules/traceability/` - New module
- **Features:**
  - Visual flowchart: Issuance → Metrics → Documents → Results
  - Click any node to see details
  - Generate traceability report for audits
  - Show which documents satisfy which issuance requirements

#### Task 2.3: Notifications System
- **Backend:**
  - Install: `npm install @nestjs-modules/mailer nodemailer`
  - Create: `backend/src/modules/notifications/`
  - Configure email templates
- **Frontend:**
  - Bell icon in app bar with unread count
  - Notification drawer
  - Mark as read/unread
- **Triggers:**
  - Document uploaded
  - Review assigned
  - Compliance check failed
  - Ticket assigned
  - Deadline approaching

#### Task 2.4: Period Lock/Closeout Workflow
- **Database:**
  - New table: `reporting_periods` (id, name, start_date, end_date, status: open/locked/closed)
  - Add `period_id` to documents table
- **Features:**
  - Create reporting periods (e.g., Q1 2024, Annual 2023)
  - Lock period → No more document uploads for that period
  - Closeout → Generate final compliance report
  - Reopen if needed (with audit trail)

#### Task 2.5: Cybersecurity Metrics API Integration
- **Backend:**
  - Create: `backend/src/modules/cybersecurity/`
  - Integrate with external APIs (configurable endpoints)
  - Implement caching with Redis (or in-memory if Redis unavailable)
  - Schedule periodic fetches (cron job)
- **Frontend:**
  - Dashboard cards pull from `/api/cybersecurity/metrics`
  - Real-time status indicators
  - Drill-down to detailed metrics

#### Task 2.6: Advanced Diff View
- **Features:**
  - Group changes by document section/heading
  - Show summary: "5 changes in Section 2.1"
  - Semantic diff (understands document structure)
  - Track major changes vs minor edits
  - Version comparison report (PDF export)

---

### **PHASE 3: Enterprise Hardening** (Priority: LOW)

#### Task 3.1: SSO Integration
- **Technologies:** OAuth 2.0 / SAML 2.0
- **Providers:** Azure AD, Google Workspace, Okta
- **Backend:** Install `passport-saml` or `passport-oauth2`
- **Config:** Environment variables for SSO endpoints

#### Task 3.2: Multi-Region Support
- **Database:** Add `region` field to units and users
- **Backend:** Filter data by user's region(s)
- **Frontend:** Region selector for super_admin

#### Task 3.3: Offline Export Packs
- **Features:**
  - Package all compliance docs for a period as ZIP
  - Include: Documents, reviews, metrics results, audit trail
  - Self-contained HTML viewer (no internet required)
  - Digital signatures for authenticity

#### Task 3.4: Advanced Reporting
- **Features:**
  - Report builder UI (select metrics, filters, date ranges)
  - Schedule reports (daily, weekly, monthly)
  - Email reports to stakeholders
  - Dashboard widgets (customizable)
  - Export formats: PDF, Excel, CSV

#### Task 3.5: AI Assist for Change Summaries
- **Technology:** OpenAI API / Anthropic Claude
- **Features:**
  - Summarize document changes in plain language
  - Highlight compliance-relevant changes
  - Suggest review focus areas
  - NOT a replacement for manual review (assist only)

---

## Testing Strategy

### Unit Testing
- All backend services: Jest tests (aim for >80% coverage)
- All frontend components: React Testing Library
- Critical paths: Authentication, file upload, compliance checks

### Integration Testing
- API endpoint testing with Supertest
- Database transactions
- File storage operations

### End-to-End Testing
- Playwright for full user workflows:
  1. Login → Upload Document → Run Compliance Check → Review → Approve
  2. Create Ticket → Assign → Resolve → Document
  3. Create Unit → Assign Metrics → Upload Doc → Verify Metrics Applied
  4. Create Metric Template → Test Against Sample Doc → Verify Results

### Manual Testing Checklist
- [ ] Navigation: All links work, back buttons functional
- [ ] Forms: Validation errors display correctly
- [ ] File upload: Various file types and sizes
- [ ] Permissions: Each role can only access allowed features
- [ ] Responsive: Works on desktop, tablet, mobile
- [ ] Performance: Pages load within 2 seconds
- [ ] Security: XSS, CSRF, SQL injection tests
- [ ] Accessibility: Keyboard navigation, screen reader compatibility

---

## Documentation Requirements

### 1. README.md
- Project overview
- Technology stack
- Quick start guide
- Demo credentials
- Screenshots

### 2. INSTALLATION.md
- Prerequisites (Node.js, MySQL, etc.)
- Step-by-step setup
- Environment variables explained
- Database setup
- Troubleshooting common issues

### 3. USER-GUIDE.md (New)
- How to use each feature
- Role-specific guides
- Compliance workflow walkthrough
- Screenshots with annotations
- FAQ

### 4. API-DOCUMENTATION.md (New)
- All endpoints documented
- Request/response examples
- Authentication instructions
- Error codes
- Postman collection link

### 5. CHANGELOG.md
- Version history
- New features
- Bug fixes
- Breaking changes
- Migration guides

---

## Execution Timeline

### Sprint 1 (Days 1-2): Critical UI Fixes
- Navigation menu + back buttons
- Container widths
- Cybersecurity metrics cards
- **Deliverable:** Users can navigate the app smoothly

### Sprint 2 (Days 3-5): Core Admin Features
- Units management UI
- Basic metrics template builder
- Manual compliance review UI
- **Deliverable:** Super admin can configure the system

### Sprint 3 (Days 6-8): Tickets + Swagger
- Restructure tickets system
- Enable Swagger UI
- Version comparison text diff
- **Deliverable:** Issue documentation works, APIs testable

#### Sprint 3 Clarification (Current Baseline)
Sprint 3 is focused on **platform operability and issue/governance tooling**:
1. **Issue workflow maturity** (tickets/incident tracking surfaces ready for operations)
2. **API operability** (Swagger and testable endpoints for frontend-backend parity)
3. **Auditability support** (version diff and evidence traceability)

This sprint is considered complete when operational users can document issues, engineers can validate APIs quickly, and reviewers can inspect change history reliably.

### Sprint 4 (Days 9-12): Phase 2 Features
- Advanced metric builder
- Traceability mapping
- Notifications system
- Period lock/closeout
- **Deliverable:** Advanced compliance workflows operational

### Sprint 5 (Days 13-15): Phase 2 Completion
- Cybersecurity metrics API integration
- Advanced diff view
- **Deliverable:** All Phase 2 features complete

### Sprint 6 (Days 16-18): Phase 3 Features
- SSO integration
- Multi-region support
- Offline export packs
- Advanced reporting
- AI assist (optional)
- **Deliverable:** Enterprise-ready features

### Sprint 7 (Days 19-20): Testing & Bug Fixes
- Run all tests
- Fix discovered bugs
- Performance optimization
- Security hardening
- **Deliverable:** Stable, production-ready app

### Revamp Execution Update (2026-02-23)

Completed in this execution cycle:
1. Critical frontend compile/runtime bug fixes (`AppBar`, `Sidebar`, layout offseting)
2. Cybersecurity incidents period analytics (daily/weekly/monthly/quarterly/yearly)
3. Full Units/Metrics/Reviews page implementation (from placeholders to working flows)
4. Build + runtime + API smoke-test validation loop (Nest build + Vite build verified)
5. Documentation updates across the five primary markdown files
6. Frontend framework migration to Vite + React Router to improve local performance and stability

Next optimization track:
1. Add pagination/batching for review-heavy document sets
2. Add dashboard cache windows for slower endpoints
3. Continue ticket/issue UX language alignment

### Security/DevOps Execution Update (2026-02-24)

Completed in this execution cycle:
1. Added backend API throttling via `express-rate-limit` in bootstrap (`/api` scoped)
2. Added first CI pipeline at `.github/workflows/ci.yml`:
  - backend build
  - frontend build
  - backend test hook (`--passWithNoTests`)
  - dependency scanning (`npm audit --audit-level=high`) for backend/frontend
3. Added QA user guidance artifacts:
  - `QA-USER-MANUAL.md`
  - expanded metrics and QA sections in `WALKTHROUGH.md`
4. Added submission-frequency support for date checks (`monthly`, `quarterly`, `annual`, `custom`)

Next phases executable from current baseline:
1. Add integration tests for metrics/reviews/tickets API paths and wire into CI gate
2. Add dashboard/review pagination + batching to reduce load spikes
3. Add structured audit logs for privileged actions (metrics/tickets/reviews)
4. Add production-safe env parity checks (`NODE_ENV`, secrets, CORS origin whitelist)

### Sprint 8 (Days 21-22): Documentation
- Update all 5 markdown files
- Create video walkthroughs
- Document deployment process
- **Deliverable:** Comprehensive documentation

---

## Success Criteria

### Phase 1 MVP Complete When:
- [x] All navigation works (back buttons, menu)
- [x] Super admin can add/edit units
- [x] Super admin can create metric templates
- [x] Focal persons can manually review documents
- [ ] Tickets system documents issues properly
- [ ] Swagger UI accessible
- [ ] Version comparison shows text diff
- [ ] All UI containers are 90% width

### Phase 2 Expansion Complete When:
- [ ] Advanced metric builder with conditional rules
- [ ] Traceability map visualizes compliance chain
- [ ] Notifications sent for key events
- [ ] Periods can be locked and closed out
- [ ] Cybersecurity metrics display real data
- [ ] Advanced diff groups changes by section

### Phase 3 Enterprise Complete When:
- [ ] SSO login works with Azure AD
- [ ] Multi-region filtering operational
- [ ] Offline export pack generates successfully
- [ ] Scheduled reports email stakeholders
- [ ] AI assist summarizes doc changes

### Production Ready When:
- [ ] All automated tests pass
- [ ] Manual testing checklist 100% complete
- [ ] Zero critical or high-priority bugs
- [ ] All 5 documentation files updated
- [ ] Performance benchmarks met
- [ ] Security audit passed

---

## Risk Mitigation

### Risk: Scope Creep
- **Mitigation:** Stick to this plan, defer non-essential features

### Risk: Complex Features Take Too Long
- **Mitigation:** Timebox tasks, implement MVP version first, enhance later

### Risk: Database Migration Issues
- **Mitigation:** Test migrations on copy of database, have rollback plan

### Risk: Frontend-Backend API Mismatches
- **Mitigation:** Use Swagger docs as contract, validate with integration tests

### Risk: User Confusion with New Features
- **Mitigation:** Add tooltips, help icons, comprehensive user guide

---

**Next Step:** Begin Sprint 1 - Critical UI Fixes

---

## KPI MoV Quality Planning Track (2026-03-04, No-Code Stage)

This addendum captures audit-approved planning inputs for the next stage. No feature code changes are part of this update.

### Objectives (Quality-first)

1. Ensure complete MoV packages are available per quarter.
2. Strengthen artifact readiness for Register, Assessment, KPI, and Review evidence.
3. Preserve backward compatibility and avoid behavior changes in this stage.

### Planned Fix Set (for implementation stage, not executed yet)

1. Register governance enhancement (binding nature, adoption basis, scope/relevance completeness).
2. Assessment artifact workflow foundations (Plan, Schedule/Roadmap, Checklist, Report).
3. Recommendation/action-plan traceability extension for KPI gaps.
4. Review-report formalization for national/regional scope.

### Risk Notes

- Main risk is over-expanding legal registry without clear binding/adoption tagging.
- Main execution risk is adding new fields/workflows that could disrupt existing forms unless introduced behind backward-compatible defaults.
- Main reporting risk is artifact incompleteness at quarter-close due to unclear ownership; mitigate by mandatory owner fields and review cadence.

### Explicit Stage Boundary

- ✅ Completed in this pass: audit refinement, templates, and implementation planning.
- ❌ Not executed in this pass: backend/frontend/db/config runtime code changes.
