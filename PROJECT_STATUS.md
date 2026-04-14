# RICMS Compliance Hub - Project Status

## 🚀 v0.0.11 — DB Naming Standardization + Attendance Table Rename + Availability UX (Current on `microservices` branch)
- **Version:** `0.0.11` in backend/frontend package metadata (patch bump only, x/y unchanged).
- **DB names standardized:** split schemas now use `compliance_hub_users`, `compliance_hub_ticketing`, and `compliance_hub`.
- **Attendance table renamed:** ticketing attendance storage and runtime references now use `attendance` instead of `tech_attendance`.
- **Migration reliability improved:** source selection is now data-aware and supports both legacy source schema names (`ricms_compliance`, `rictms_compliance`).
- **Gateway resilience UX:** downed upstream services now return explicit `503` with `Service currently unavailable` payload.
- **Frontend service-aware navigation/content:** sidebar filters by live service availability and compliance pages show clear unavailable fallback when compliance service is offline.
- **Validation:** backend build passed, frontend build passed, backend tests passed (4/4), local migration execution verified schema/table outcomes.
- **Migration impact:** one-time SQL migration needed for legacy environments; `tech_attendance` data is compatibility-copied into `attendance`.
- **Rollback:** revert `v0.0.11` commit and restore previous DB/table naming if legacy integration depends on old identifiers.

## 🚀 v0.0.10 — Attendance Legacy-Role Removal + Centralized RoleDefinition Grouping (Current on `microservices` branch)
- **Version:** `0.0.10` in backend/frontend package metadata (patch bump only, x/y unchanged).
- **Legacy role removal in attendance layer:** removed attendance usage of `FOCAL`, `TECHNICIAN`, `TECHNICIAN_DESKTOP`, `TECHNICIAN_IT_SUPPORT`, `TECHNICIAN_IT_STAFF`, and `TECHNICIAN_DESKTOP_STAFF`.
- **Centralized attendance grouping:** attendance service now uses a single grouped role map for support categories and all-attendance scope.
- **System role definitions as source of truth:** attendance role selection now queries `role_definitions` (`assignable=true`) with explicit exclusion of `user`, `super_admin`, and removed legacy roles.
- **Related layer alignment:** attendance controller and frontend attendance role gates updated to remove legacy roles.
- **Validation:** backend build passed, frontend build passed, backend tests passed, smoke suite passed.
- **Migration impact:** none (schema unchanged; relies on current `role_definitions` content).
- **Rollback:** revert `v0.0.10` commit and restart services.

## 🚀 v0.0.9 — Attendance Mapping + ITO Login Attendance + Escalation Focal Source (Current on `microservices` branch)
- **Version:** `0.0.9` in backend/frontend package metadata (patch bump only, x/y unchanged).
- **Attendance default scope corrected:** default attendance category now covers both technicians and ITO/focal-equivalent staff.
- **Category mapping corrected:** attendance category filters now isolate IT/Desktop/Pantawid/ITO groups without cross-group leakage.
- **ITO login attendance corrected:** login-based attendance auto-marking now includes ITO/focal-equivalent roles.
- **Escalation dropdown corrected:** escalation target candidates are sourced from attendance pools (`ito` + current ticket type) before configured focal-role filtering.
- **Placeholder accounts filtered:** attendance-facing queries exclude known demo placeholder users (`desktop.tech@rictms.gov.ph`, `it.tech@rictms.gov.ph`, `focal@rictms.gov.ph`).
- **Migration script cleanup extension:** `backend/database/microservices-migrate.sql` can now optionally remove non-compliance tables from source DB after copy (`@cleanup_source_tables = 1`).
- **Validation:** backend build passed, frontend build passed, backend tests passed (4/4).
- **Runtime note:** direct execution of migration SQL was blocked in this environment because neither Docker CLI (`docker`) nor MySQL CLI (`mysql`/`mariadb`) is installed on PATH.

## 🚀 v0.0.8 — Escalation Discoverability + Split-DB Data Migration (Current on `microservices` branch)
- **Version:** `0.0.8` in backend/frontend package metadata (patch bump only, x/y unchanged).
- **Escalation visibility fix:** ticket detail now includes explicit `Upload Proof Photo(s)` action in escalation dialog and includes junior technician roles in escalation action visibility.
- **Focal escalation queue visibility:** tickets API supports `escalatedToMe=true`; Tickets page now includes `Escalated To Me` toggle for focal/senior queue checking.
- **DB movement implementation:** new one-time migration script `backend/database/microservices-migrate.sql` copies legacy shared DB tables/data into service-specific schemas.
- **Compose split DB correction:** fixed users/ticketing DB env mapping and added explicit compliance DB override in `docker-compose.yml`.
- **Migration impact:** legacy environments require one-time execution of migration SQL.
- **Rollback:** revert `v0.0.8` commit and route services back to single shared DB.

## 🚀 v0.0.7 — Service DB Separation + Ticket Escalation QA Confirmation (Current on `microservices` branch)
- **Version:** `0.0.7` in backend/frontend package metadata.
- **Per-service DB separation wiring:** users, ticketing, and compliance services now support service-specific DB env overrides with fallback compatibility.
- **Compose split DB targets:** users -> `ricms_users`, ticketing -> `ricms_ticketing`, compliance -> `ricms_compliance`.
- **DB bootstrap script:** `backend/database/microservices-init.sql` creates required DBs and grants for `ricms_user` on first MariaDB initialization.
- **Escalation QA checks confirmed in code:** ticket detail already has an `Escalate Ticket` button and multipart proof image upload workflow.
- **Migration impact:** existing MariaDB volumes need one-time DB creation/grant step (or volume recreation).
- **Rollback:** revert `v0.0.7` commit and use single shared DB config.

## 🚀 v0.0.6 — Three-Service Domain Split (Current on `microservices` branch)
- **Version:** `0.0.6` in both `backend/package.json` and `frontend/package.json`.
- **Service separation completed:**
   - `users-service` for users/auth/units (`4101`)
   - `ticketing-service` for tickets/attendance/ticket-settings (`4102`)
   - `compliance-service` for all remaining compliance modules (`4103`)
- **Gateway routing updated:** all non-users/non-ticketing domains now route to compliance service.
- **Compose profile updated:** `microservices` profile now includes `compliance-service` and gateway dependency wiring.
- **Migration impact:** none.
- **Rollback:** revert `v0.0.6` commit.

## 🚀 v0.0.5 — QA Fixes for Reassign + Terminal Status Controls (Current on `microservices` branch)
- **Version:** `0.0.5` in both `backend/package.json` and `frontend/package.json`.
- **Absent technician reassignment fix:** backend now blocks assigning to technicians marked `absent`/`out_of_office` for today; frontend assignment picker also filters them out defensively.
- **Tickets table action behavior:** reassign button remains visible for `resolved`/`closed` tickets but is disabled (explicitly non-actionable).
- **Ticket detail terminal behavior:** `Update Status` is hidden for technicians, section head, compliance officer, and super admin when status is `resolved` or `closed`.
- **Split-runtime strictness:** gateway now returns explicit `503` for unsupported API paths in microservices mode to avoid false assumption that non-users/ticketing modules are active.
- **Compose strict mode:** `MICROSERVICES_STRICT=true` added to gateway container env.
- **Migration impact:** none.
- **Rollback:** revert `v0.0.5` commit and/or set `MICROSERVICES_STRICT=false`.

## 🚀 v0.0.4 — API Gateway for Separated Services on Port 4000 (Current on `microservices` branch)
- **Version:** `0.0.4` in both `backend/package.json` and `frontend/package.json`.
- **Root issue addressed:** when users/ticketing services run separately, frontend could not connect because no process owned `4000`.
- **Gateway added:** independent gateway runtime now serves `4000` and proxies users/auth/units to users service and ticket routes/settings/attendance to ticketing service.
- **Startup scripts:** `start:gateway(:dev)`, `start:users(:dev)`, `start:ticketing(:dev)`.
- **Compose runtime:** `api-gateway` added to `microservices` profile.
- **Cleanup:** placeholder stubs under `services/` removed; backend app entrypoints are the canonical split runtime.
- **Migration impact:** none.
- **Rollback:** revert `v0.0.4` and run monolith backend only.

## 🚀 v0.0.3 — Full Users/Ticketing Microservice Runtime Split (Current on `microservices` branch)
- **Version:** `0.0.3` in both `backend/package.json` and `frontend/package.json`.
- **Users service extraction runtime:** independent backend entrypoint serving users/auth/units on port `4101`.
- **Ticketing service extraction runtime:** independent backend entrypoint serving tickets domain on port `4102`.
- **Auth decoupling:** users service no longer requires ticket module to boot.
- **Independent startup scripts:** `npm run start:users:dev` and `npm run start:ticketing:dev`.
- **Compose runtime:** `docker-compose` microservices profile runs real users/ticketing backend entrypoints.
- **Migration impact:** none.
- **Rollback:** revert `v0.0.3` or run monolith backend only.

## 🚀 v0.0.2 — Microservices Transition Kickoff (Current on `microservices` branch)
- **Version:** `0.0.2` in both `backend/package.json` and `frontend/package.json`.
- **Users service scaffold created:** `services/users-service` with standalone Nest bootstrap and `/api/health` endpoint.
- **Ticketing service scaffold created:** `services/ticketing-service` with standalone Nest bootstrap and `/api/health` endpoint.
- **Separate container readiness:** `docker-compose.yml` now includes optional `users-service` and `ticketing-service` under `microservices` profile.
- **Backward compatibility:** monolith app remains unchanged as default runtime path; microservice profile is opt-in.
- **Migration impact:** none.
- **Rollback:** revert `v0.0.2` commit or do not start microservices profile.

## 🚀 v0.6.26 — QA Fixes: Tickets Reminder Scope + Unrated Row Highlight (Current)
- **Version:** `0.6.26` in both `backend/package.json` and `frontend/package.json`.
- **Tickets reminder scope fix:** pending-satisfaction modal no longer auto-opens when user is already in Tickets module.
- **Unrated visibility:** requester unresolved satisfaction tickets are highlighted with warning-tinted rows and `Unrated` status chip.
- **How to test:** open Tickets with pending satisfaction account and confirm no auto-popup; verify highlighted unrated rows.
- **Migration impact:** none.
- **Rollback:** revert `v0.6.26` commit.

## 🚀 v0.6.25 — QA Fixes: New-Ticket Guard + Satisfaction Modal + Timeline Tie-Order + Email Freeze (Current)
- **Version:** `0.6.25` in both `backend/package.json` and `frontend/package.json`.
- **No-new-ticket enforcement:** requester cannot create a new ticket while any prior ticket remains unclosed.
- **Reminder modality upgrade:** unrated satisfaction reminders now appear as modal dialogs on account open and on each new-ticket attempt.
- **Timeline tie-order guarantee:** same-timestamp events render `created` before `auto_assigned` in ticket timeline.
- **Email freeze active:** outbound email sending paused via `EMAIL_ENABLED=false`.
- **Override rollback target:** `EMAIL_TEST_OVERRIDE` restored to `mjdibay@dswd.gov.ph`.
- **How to test:** verify modal reminder display, blocked new-ticket creation with existing unclosed ticket, same-timestamp timeline order, and suppressed email delivery.
- **Migration impact:** none (no schema change).
- **Rollback:** set `EMAIL_ENABLED=true` and revert `v0.6.25` commit.

## 🚀 v0.6.24 — QA Fixes: Attendance Completion Polling + Technician Progression + Timeline Cleanup + Port 4000 Guard (Current)
- **Version:** `0.6.24` in both `backend/package.json` and `frontend/package.json`.
- **Attendance completion polling:** Attendance tab keeps refreshing while any technician has no attendance status for the current day.
- **Technician progression unblock:** staff technicians can set priority in ticket detail, enabling required transitions to `in_progress` and `resolved`.
- **Internal note/comment ordering:** comments (including internal notes) render in chronological timestamp order.
- **Comments removed from timeline:** comment events are excluded from timeline view and no longer logged into ticket events.
- **Login auto-assign labeling fixed:** login-triggered assignment now records `auto_assigned` event type.
- **Backend dev startup hardening:** new `backend/scripts/prepare-dev.js` clears stale build artifacts and attempts to free port `4000` before watch boot.
- **Email lifecycle routing:** assignment emails notify technicians; resolved emails notify requesters with rating prompt; closed and rated events notify technicians.
- **Current QA routing override:** `EMAIL_TEST_OVERRIDE=ibayatucv@gmail.com` redirects all outbound ticket emails to a single inbox for testing.
- **Ticket creation stability hardening:** duplicate ticket-number collisions are handled via latest-sequence allocation and retry, preventing intermittent create-ticket 500 errors.
- **Migration impact:** none.
- **Rollback:** revert `v0.6.24` commit.

## 🚀 v0.6.23 — QA Fixes: Present-Only Auto Assignment + OPEN Revert Auto-Reassignment (Current)
- **Version:** `0.6.23` in both `backend/package.json` and `frontend/package.json`.
- **Auto-assignment attendance guard:** automatic assignment now requires explicit `present` attendance entries.
- **OPEN revert consistency:** reverting ticket status to `open` clears `assignedToId` first.
- **OPEN revert immediate assignment:** if an eligible PRESENT technician is available with zero active tickets, ticket is immediately auto-assigned.
- **Migration impact:** none.
- **Rollback:** revert `v0.6.23` commit.

## 🚀 v0.6.22 — QA Fixes: Login Auto-Assign, Attendance-Safe Pantawid Assignment, OPEN Unassign, Escalation Label Cleanup (Current)
- **Version:** `0.6.22` in both `backend/package.json` and `frontend/package.json`
- **Login-triggered assignment:** successful login now triggers immediate pending-ticket auto-assignment via `assignPendingTicketsOnLogin`.
- **Pantawid absent-tech prevention:** Pantawid auto-assignment now derives candidates from attendance-aware availability (`getAvailableTechnicians`) and excludes absent/out-of-office users.
- **All absent guard:** when all eligible technicians are absent, ticket remains `OPEN` and unassigned.
- **OPEN status reset:** changing ticket status to `open` now clears `assignedToId`.
- **Escalation focal dropdown cleanup:** removed role-code suffix from dropdown labels; names only.
- **Migration impact:** none (no schema change).
- **Rollback:** revert `v0.6.22` commit.

## 🚀 v0.6.16 — QA Fixes: Office-Day Flicker, Attendance Categories, Self-Close, Timeline, Pantawid Auto-Assign, Email Notification (Current Release)
- **Version:** `0.6.16` in both `backend/package.json` and `frontend/package.json`
- **Office Days calendar no-flicker:** `toggleOfficeDay()` optimistic update — sets state instantly, replaces with server response after API call, no loading spinners.
- **Attendance Category dropdown:** label now "Category"; items: All, ITOs, IT Support (it_support_sr/jr), Desktop Support (desktop_sr/jr), Pantawid ICT Support (pantawid_ict). Same role mappings in backend attendance service.
- **User self-close button:** "Close Ticket" button added for original requester on non-terminal tickets. Calls `PATCH /tickets/:id { status: 'closed' }`.
- **Assign Technician dropdown populated:** updated role enums (desktop_sr/jr, it_support_sr/jr, pantawid_ict) in both frontend filter and backend `getAvailableTechnicians()`.
- **Assign / Reassign consistency:** dialog title, tooltip, and action button all read "Reassign" when ticket is already assigned.
- **Auto In-Progress on technician view:** assigned technician opening the ticket calls `PATCH /tickets/:id/mark-viewed`; backend transitions `assigned → in_progress` and logs timeline event. `useRef` guard prevents duplicate calls.
- **Ticket timeline:** new `ticket_events` table with `TicketEvent` entity; backend records all lifecycle events; `GET /tickets/:id/events` endpoint; frontend Timeline card shown in ticket detail below comments.
- **Clean all attendance (admin reset):** `DELETE /attendance/all` endpoint (SUPER_ADMIN only) truncates `tech_attendance`.
- **Pantawid always auto-assigned:** `createTicket()` always assigns Pantawid tickets to a `pantawid_ict` user regardless of office days.
- **Email on assignment:** `sendTicketAssignedEmail()` fires on every auto/manual assignment; `EMAIL_TEST_OVERRIDE=mjdibay@dswd.gov.ph` in `.env` redirects all outgoing email during testing.

## 🚀 v0.6.8 — QA Fixes: Force Logout Flow, IT Staff Assign, Priority Focal-Only, Duplicate Guards, Network Access
- **Version:** `0.6.8` in both `backend/package.json` and `frontend/package.json`
- **Force logout background heartbeat:** 60 s `setInterval` in `AuthContext` calls `getProfile()`; deactivated users are redirected without waiting for a page reload.
- **Login deactivation alert:** `login()` now returns a specific error for deactivated accounts; login page shows `?reason=session_expired` banner.
- **Refresh rejects deactivated users:** `AuthService.refresh()` checks `user.active` before issuing a new token.
- **IT Staff roles in assign:** `technician_it_staff` and `technician_desktop_staff` added to `getTechnicianAvailability` query and all ticket controller `@Roles` guards.
- **Busy technician guard:** `assignTicket` counts active tickets for the target; blocks if `busyCount > 0` with a clear error message. Frontend dialogs pre-filter to available-only technicians.
- **Priority nullable:** default changed from `medium` to `null`; only FOCAL/REVIEWER/SUPER_ADMIN can set it. UI shows "Not Set" chip.
- **Duplicate terminal guards:** `updateTicket` and `assignTicket` both throw if current status is `DUPLICATE`.
- **Duplicate confirmation dialog:** warning modal now precedes the Duplicate Picker.
- **LAN / network access:** Vite `host: true`; backend CORS echoes request origin. LAN URLs: `http://192.168.50.226:3000` (Ethernet) / `http://172.31.22.47:3000` (Wi-Fi).

## 🚀 v0.6.7 — QA Fixes: Freeze/Duplicate Statuses, OPEN Restriction, Comments Fix, Keyword Category, FOCAL Assign, Priority Roles
- **Version:** `0.6.7` in both `backend/package.json` and `frontend/package.json`
- **Freeze/Duplicate ticket statuses:** new `TicketStatus` enum values (`freeze`, `duplicate`) with `duplicate_of_id` column; DB migration runs on startup.
- **OPEN status restriction:** tickets in `open` can only move to `freeze` or `duplicate` (backend + frontend enforced).
- **Duplicate picker dialog:** staff select the canonical ticket when marking as duplicate; backend validates the original exists and sets `resolvedAt`.
- **Comment display fix:** `{c.content}` → `{c.comment}` in ticket detail; comments now render correctly.
- **Live updates (10 s polling):** ticket detail now polls every 10 s so comments and status refreshes without a manual reload.
- **Keyword rule Target Category bug:** frontend interface mismatch (`category` vs `targetCategory`) — fixed; `pantawid_ict_support` added to keyword rule validation.
- **Staff name in assign dialog / FOCAL assign:** `getTechnicianAvailability` includes FOCAL users with `ticketMainFocal=true`; `openCount` now counts all non-closed/non-duplicate statuses. Frontend assign button shown to FOCAL users.
- **Priority update restricted:** only FOCAL, REVIEWER, SUPER_ADMIN can change ticket priority (backend enforced + UI field shown only to those roles).
- **Unrated ticket warning:** regular users see a prompt before opening New Ticket if they have unrated resolved/closed tickets.
- **401 refresh guard:** `isRefreshing`+`failedQueue` in `client.ts` prevents flood of concurrent refresh calls and duplicate error snackbars on force logout.

## 🚀 v0.6.6 — QA Fixes: Category Realtime, Force Logout, Roles Re-seed
- **Version:** `0.6.6` in both `backend/package.json` and `frontend/package.json`
- **Category realtime in modal:** 10 s polling interval while New Ticket dialog is open; admin changes to category status reflect within one cycle.
- **Force logout on account deletion:** `JwtStrategy.validate()` performs a DB lookup on every authenticated request; deactivated users are rejected immediately.
- **Roles re-seeding fixed:** `getRoles()` no longer calls `ensureRoleDefinitions()`; seeding is startup-only so deleted roles stay deleted.
- New helper: `UsersService.findByIdSafe()` — null-safe user lookup for the JWT strategy.

## 🚀 v0.6.5 — QA Fixes: Category Status, Office-Day Columns, Silent Auto-Refresh
- **Version:** `0.6.5` in both `backend/package.json` and `frontend/package.json`
- **Category active/inactive toggle fixed:** entity properties renamed `isActive`/`isDeleted` with explicit DB column names; all service references updated.
- **Office-day column indicators:** Technician Attendance and Staff Login Activity column headers visually dim non-office days.
- **Silent auto-refresh:** `useAutoRefresh` no longer shows loading spinners on background polls. Dedicated silent callbacks replace direct fetch calls in Attendance and Tickets pages.

## 🚀 v0.6.4 — QA Fixes: Technician Type Tag, All-Techs Count, Super-Admin Login, Calendar Cascade, Auto-Refresh
- **Role definition technician type tag:** new `technician_type` column on `role_definitions`; Settings UI allows tagging a custom role as `it_support`, `desktop_support`, or `pantawid_ict_support` so its members appear in Technician Attendance grids.
- **All-techs count bug fixed:** `u.ticket_technician` → `u.ticketTechnician` (TypeORM property name) in `getAvailableTechnicians` + `listTechnicians`; custom-role users now included via `getCustomRoleValues()`.
- **Super admin excluded from Staff Login Activity** (`EXCLUDED_ROLES` in `getStaffLoginsMonthly`).
- **Calendar toggle cascade:** toggling an office day now refreshes the attendance grid and staff login grid without a page reload.
- **`useAutoRefresh` hook:** 30s polling + visibilitychange; applied to Attendance, Tickets, MoV, KPI pages.

## 🚀 v0.5.0 — IT Help-Desk Ticketing + Role System Overhaul
- **Branch:** `v0.5.0` (new main branch on GitHub `ibayot/compliance-hub`)
- **Version:** `0.5.0` in both `backend/package.json` and `frontend/package.json`
- **Ticketing module** completely rewritten as an IT help-desk system (Desktop Support / IT Support ticket types, 5 statuses, auto-numbered tickets, satisfaction ratings).
- **Role system** overhauled: new `user`, `technician_desktop`, `technician_it_support` roles. `user` role sees only Dashboard + Tickets in nav.
- **Google sign-in** new accounts receive `user` role; existing accounts preserve their role.
- **Admin-created accounts** default to `focal` (RICTMS staff).
- **Email autocomplete** in Create User dialog (Settings > User Management).
- **User Dashboard** personalised with ticket stats and satisfaction fill-rate.
- **DB migrations** performed in-place via `onModuleInit` `ALTER TABLE … ADD COLUMN IF NOT EXISTS`.

## 🚀 QA Fix Checkpoint 22 (`v1.5.0.1`) — Backend startup hardening + TypeORM autoload + password reset
- **Root cause of auth failures:** Backend process was not running (port 4000 not listening). The `entities` glob in `TypeOrmModule` resolved to zero files at runtime, so TypeORM had no entity metadata — every repository call threw `EntityMetadataNotFoundError`. Two `onModuleInit` hooks propagated this error uncaught, crashing the process before it could bind port 4000.
- **`autoLoadEntities: true`** replaces the broken glob in `app.module.ts`; NestJS auto-registers all `forFeature` entities into the root DataSource.
- **`TicketService` and `MovService` hardened:** seed calls wrapped in try-catch with non-fatal WARN logging.
- **Password reset:** all 4 accounts (`admin`, `reviewer`, `focal`, `jmmmaguigad`) reset to `password123` via bcrypt-verified database update.
- **Validation status:** backend startup clean ✅, port 4000 listening ✅, login 200 with JWT ✅, smoke suite ✅ ALL SMOKE TESTS PASSED.

### Migration and rollback
- No DB schema migration.
- Rollback config: reinstate glob pattern (not recommended — known broken).
- Rollback passwords: apply new bcrypt hash via direct SQL update.

## 🚀 QA Polish Checkpoint 21 (`v1.5.0.1`) — Remove Gmail-only restriction; Google sign-in as sole registration path
- **Any Google account now accepted:** `@gmail.com` domain restriction removed from `verifyGoogleIdToken()`; only verified email is required.
- **Email+password Gmail registration removed:** `POST /auth/register-gmail` and its service method are gone; the register mode toggle on the login page is removed.
- **Cleaner login page:** email/password form for existing local accounts + Google sign-in button (always visible, `locale="en"` enforced). No registration form UI.
- **Validation status:** diagnostics ✅, frontend build ✅, smoke suite ✅ all tests passed.

### Migration and rollback
- No DB migration.
- Rollback: restore backend `register-gmail` endpoint + domain check + frontend register mode.

## 🚀 QA Polish Checkpoint 20 (`v1.5.0.1`) — Runtime hotfix: TypeORM googleSub type + frontend env
- **Backend error eliminated:** fixed `DataTypeNotSupportedError: Data type "Object" in "User.googleSub"` by adding `type: 'varchar'` to the `@Column` decorator. TypeORM can only infer simple scalar types from TypeScript reflection metadata; `string | null` unions require an explicit `type:` option.
- **Cascade cleared:** fixing the entity type error also eliminated the downstream `EntityMetadataNotFoundError` for `TicketIssueType` and `Document` that occurred in `onModuleInit` hooks.
- **Frontend Google button now visible:** populated `VITE_GOOGLE_CLIENT_ID` in `frontend/.env`; `hasGoogleClient` now evaluates to `true` and the Google sign-in button renders on the login / registration page.
- **Validation status:** backend build ✅, backend startup clean ✅, frontend build ✅, smoke suite ✅ (`ALL SMOKE TESTS PASSED`).

### Migration and rollback
- No DB migration — annotation-only fix.
- Rollback: remove `type: 'varchar'` from entity (not recommended).

## 🚀 QA Polish Checkpoint 19 (`v1.5.0.1`) — Google service auth + JWT integrity hardening
- **Google service login implemented:** backend now accepts Google ID tokens (`/auth/google-login`) and verifies them server-side before issuing local JWTs.
- **Gmail eligibility enforced through Google claims:** only verified `@gmail.com` identities are accepted in Google-login flow.
- **Token integrity controls strengthened:** JWT issuer/audience are now consistently applied in token sign and verify paths; strategy verification also enforces algorithm.
- **Auth-provider schema support added:** user model now tracks provider (`local|google`) and Google subject (`google_sub`) with uniqueness protection.
- **Env and client wiring completed:** backend/frontend env templates now include Google + JWT issuer/audience settings; frontend login supports Google button when client ID is set.
- **Validation status:** backend/frontend diagnostics ✅, backend build ✅, frontend build ✅, smoke test ⚠️ blocked in local run due API reachability.

### Migration and rollback
- Migration impact: `users` table auto-adds `auth_provider` and `google_sub` (+ unique index).
- Rollback: revert Google auth integration + JWT claim constraints and optionally drop provider fields/index.

## 🚀 QA Polish Checkpoint 18 (`v1.5.0.1`) — Ticketing rollout governance + Gmail registration
- **Ticketing access model aligned to requirement:** module is visible to all authenticated users, with role-distinct controls retained for configuration/assignment actions.
- **Self-service onboarding added:** Gmail-only ticketing registration (`/auth/register-gmail`) implemented and surfaced from login UI.
- **Assignment least-privilege enforced:** ticket assignment moved to dedicated governed endpoint; only super admin or main focal technicians can assign.
- **Lower-level technician roster management:** authorized users can tag/un-tag Gmail registrants as ticket technicians via dedicated endpoints; assignment target is validated server-side.
- **Settings clarity improvement:** Add Role Definition disabled-state now explicitly explains enum-code exhaustion rather than appearing unexplained.
- **Validation status:** backend/frontend diagnostics ✅, frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: `users` table auto-adds `ticket_main_focal` and `ticket_technician` columns.
- Rollback: revert auth/ticket/settings/frontend changes and optionally drop the two columns.

## 🚀 QA Polish Checkpoint 17 (`v1.5.0.1`) — Separator overflow + signature block + positionFull user field
- **Separator line overflow corrected:** `─` character counting replaced with CSS `border-top: 1px solid #9ca3af` on `@bottom-center`. Border-top is constrained to the margin box content zone — always fills left-to-right margin exactly with no overflow. Character counting is font/renderer-specific and cannot be reliable.
- **`h2` bottom margin:** `h2 { margin-bottom: 10px !important; }` added to print CSS so the main report title has visible breathing space below it.
- **Print-only signature block:** "Prepared by" and "Approved by" columns appear at the bottom of printed reports when the fields are populated. Auto-filled from current user; configurable in Report Settings; persisted in print presets.
- **`positionFull` field:** New column `position_full` in `users` table for the official full position title. Separated from abbreviated `position` field used in signatures. Exposed in Settings User Management dialogs with clear helper text distinguishing abbreviated vs full.
- **Validation status:** backend tsc ✅, frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: `position_full` column added automatically via `IF NOT EXISTS`.
- Rollback: revert entity/service/DTO changes, drop column, revert `mov/page.tsx` separator and signature block.

## 🚀 QA Polish Checkpoint 16 (`v1.5.0.1`) — Print CSS specificity hardening (body margin + summary-block + table margin)
- **Root cause:** Backend report HTML embeds inline `<style>` blocks with `body { margin: 24px; }`, `.summary-block { line-height: 1.8; margin: 8px 0 16px; }`, and `table { margin: 10px 0 ...; }`. These are extracted and re-injected into the print iframe after our reset CSS. Without `!important`, CSS cascade (last-rule-wins for equal specificity) meant the extracted rules dominated the reset.
- **Fix:** Added `!important` to `html, body { margin: 0; padding: 0; }` reset. Added `.summary-block { margin: 0 !important; line-height: 1.15 !important; }` override. Added `margin: 0 !important` to print CSS table block.
- **No regressions:** frontend-only change; no backend/DB impact; all smoke tests passed.
- **Validation status:** frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none.
- Rollback: remove `!important` from body margin reset and `.summary-block` override in `mov/page.tsx`.

## 🚀 QA Polish Checkpoint 15 (`v1.5.0.1`) — Header images, print presets, logo alignment, separator, line-height
- **Header images in print:** Two images (DSWD H1=39px, Bagong Pilipinas H2=45px) rendered in flex-row header. `vertical-align:middle` on both img elements ensures vertical centering within flex container.
- **Image compression:** Canvas JPEG compression (400px max, 75% quality, white prefill) prevents large base64 payloads and black backgrounds on transparent PNGs.
- **Same-file re-upload:** `e.target.value = ''` reset in upload handler allows re-selecting the same file after clearing.
- **Print presets:** Save/Load/Delete backed by `MovArtifact` with `artifact_type: 'print_settings'`.
- **Footer layout:** `─` separator (168 chars landscape) after `Page X of Y`, no border-top. Line-height 1.15 with `!important` on paragraph/heading elements.
- **Validation status:** frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none.
- Rollback: revert header images, preset handlers, and separator changes in `mov/page.tsx`.
## 🚀 QA Polish Checkpoint 14 (`v1.5.0.1`) — CSS margin-box footer (root cause fix for all footer placement failures)

- **Root cause identified and fixed:** All previous JS overlay footer attempts failed because the hidden print iframe (`width:0; height:0`) caused `root.scrollHeight` to reflect a 0-width content reflow, not a landscape A4 layout. Every computed `pageHeightPx` and derived footer `top` was wrong.
- **CSS `@page @bottom-center`** is now used. The browser's print engine places this in the actual margin zone on every page automatically. `counter(page)` and `counter(pages)` work correctly with no JS.
- First-page separate footer via `@page :first`. Page-number offset via `counter-reset`.
- All JS geometry code and overlay divs removed.
- **Validation status:** frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none.
- Rollback: revert `buildPrintHtml()` in `frontend/src/app/dashboard/mov/page.tsx`.

## 🚀 QA Polish Checkpoint 13 (`v1.5.0.1`) — Landscape orientation, corrected footer placement, hardened row-break

- **Landscape orientation:** MoV Builder print now uses `A4 landscape`; `A4_HEIGHT_MM` updated to `210mm` (landscape short axis) so all page-height math is accurate.
- **Footer placement corrected:** footer overlays anchored at `i * pageHeightPx - footerHeight - 4px` — bottom of the content area per page. Prior formula (`i * pageHeightPx + margin offset`) placed footers past the content zone into the browser margin band (inaccessible to `position:absolute`), causing random/missed rendering.
- **Row-break hardened:** `!important` added to `page-break-inside` and `break-inside` rules for `table`, `tr`, `td`, `th` so extracted document CSS cannot block row splitting across pages.
- **Validation status:** frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none (no DB/schema change).
- Rollback: revert `frontend/src/app/dashboard/mov/page.tsx` — restore `size: A4`, `A4_HEIGHT_MM=297`, old footer top formula, remove `!important` flags.

## 🚀 QA Polish Checkpoint 12 (`v1.5.0.1`) — Revert-overreach and page-margin-first print correction

- **Rollback applied**: reverted the overreaching MoV print layout changes that introduced broad content-placement regressions.
- **Page-margin-first correction**: print now applies A4 with page-level margins (`0.5in` side, `1in` top/bottom) without reflowing report container geometry.
- **Footer placement adjustment**: footer top is computed from bottom-margin geometry with `0.5in` start-from-bottom behavior and measured footer height compensation.
- **Content protection**: dynamic bottom reserve only expands when footer multiline content requires it, preserving prior page content placement.
- **Validation status**: frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none (no DB/schema change).
- Rollback: revert `frontend/src/app/dashboard/mov/page.tsx` print-margin/footer computations from this checkpoint.

## 🚀 QA Polish Checkpoint 11 (`v1.5.0.1`) — A4 footer-area placement and dynamic content adjustment

- **A4 margin compliance**: MoV print output now enforces side margins `0.5in` and baseline top/bottom margins `1in`.
- **Footer-area anchoring**: footer blocks are positioned within bottom margin area using `0.5in` upward offset from paper bottom.
- **Dynamic content safety**: multi-line footer height now expands bottom print margin reserve so body content adjusts and avoids overlap.
- **Header offset alignment**: first-page header is shifted toward top margin zone for `0.5in`-down start behavior.
- **Print whitespace control**: table rows remain allowed to break across pages, preventing unnecessary large blank regions.
- **Validation status**: frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none (no DB/schema change).
- Rollback: revert MoV print A4 margin constants and dynamic footer placement/reserve logic from this checkpoint.

## 🚀 QA Polish Checkpoint 10 (`v1.5.0.1`) — Bulleted return remarks + viewer title enforcement + MoV pagination format

- **Remarks readability**: automated flagged checks now persist and render as explicit multiline bullets in return remarks.
- **Viewer title correction**: HTML preview displays are normalized to show document display title rather than filename-like headings.
- **MoV footer format alignment**: footer text parsing now supports first-line page token (`1` or `Page 1`) and prints pagination line (`Page X of Y`) followed by separator and content.
- **First-page pagination visibility**: first-page footer note adopts the same pagination/separator/content format when separate first-page footer is enabled.
- **Validation status**: backend tests ✅, backend build ✅, frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none (no DB/schema change).
- Rollback: revert metrics remarks formatting, preview title normalization, document remarks multiline rendering, and MoV footer formatting updates from this checkpoint.

## 🚀 QA Polish Checkpoint 9 (`v1.5.0.1`) — Number-extraction precision + document detail UX + MoV print alignment

- **Metric precision improvements**: Number Extraction templates now allow per-keyword operators (`>=`, `<=`, `>`, `<`, `=`) with aligned expected numbers.
- **Returned-remarks clarity**: auto-review remarks now emphasize only failed extracted-number comparisons.
- **Document detail fixes**: focal download restored for current version (including returned docs), and unit label no longer displays empty parentheses.
- **Viewer display-name fallback hardening**: preview headers prioritize display-oriented fields before filename fallback.
- **MoV print fidelity**: centered footer with separator/page-number segment, first-page header left alignment, and sky-blue table headers in app preview and print.
- **Validation status**: backend tests ✅, backend build ✅, frontend build ✅, smoke tests ✅.

### Migration and rollback
- Migration impact: none (no DB/schema change).
- Rollback: revert metric engine/service/UI mapping updates and document/MoV print styling changes from this checkpoint.

## 🚀 QA Polish Checkpoint 8 (`v1.5.0.1`) — Document UX simplification + Google Docs import + MoV print hardening

- **Document detail simplification**: removed visible `Version History` panel and removed `Refresh` button from document detail header.
- **Compliant download path retained**: focal users can download compliant documents directly from detail header.
- **Return remarks emphasis increased**: return-remarks banner now uses high-contrast filled error styling for urgency in both themes.
- **Viewer title/label consistency**: HTML fallback preview now explicitly labels document display name.
- **Google Docs import support**: upload page now supports URL-based import from Google Docs; backend exports to DOCX and processes through existing document pipeline.
- **MoV print fixes**: report print output now has page-attached footer behavior, first-page header anchoring, and improved table border continuity across multi-page tables.
- **Build/test health**: backend build ✅, frontend build ✅, targeted metrics tests ✅.

### Migration and rollback
- Migration impact: additive endpoint only (`POST /documents/google-doc`), no destructive schema changes.
- Rollback: revert frontend document detail/upload/API changes and backend documents controller/service/preview updates from this checkpoint.

## 🚀 QA Polish Checkpoint 7 (`v1.5.0.1`) — Upload Flow Recovery + Archived Table Refinement

- **Upload responsiveness fixed**: document upload endpoint now responds immediately even when fallback processing is needed.
- **Auto-metrics on DOCX upload**: successful initial DOCX extraction now transitions document to `READY` and triggers metrics directly in background.
- **Queue watchdog recovery**: fallback watchdogs added for both process and metrics jobs to recover enqueued-but-unconsumed scenarios.
- **Archived tab rendering refined**: archived tab table now displays archived-specific business columns (`Title`, `Type`, `Period`, `Status`, `Return Remarks`, `Archived Date`).
- **Reduced spinner-first behavior**: archived query now uses placeholder/stale strategy for smoother tab experience.
- **E2E evidence**: with `cybersecurity_incident_summary_report_202603.docx`, upload returned ~0.18s and produced expected metric outcome (`failed=1`, `passed=1`, compliance `needs_revision`).
- **Build health**: backend type-check ✅, frontend build ✅.

## 🚀 QA Polish Checkpoint 6 (`v1.5.0.1`) — Documents Tabs + Queue-Outage Hardening

- **Documents IA simplification**: focal workflow now uses a single Documents page with two tabs (`Active Documents`, `Archived Documents`), replacing separate-page archived navigation.
- **Archived behavior preserved**: archive rules and API contract remain unchanged; archived records are filtered via `archived=true` in the same table flow.
- **Queue outage resilience**: document upload/recovery/reprocess paths now perform Redis reachability checks before enqueue.
- **Inline fallback path**: if Redis/Bull is unavailable, system executes extraction + metrics + auto-review inline to prevent permanent `pending` state.
- **Metrics logic consolidation**: auto-review side effects moved into `MetricsService.computeMetricsAndAutoReview` and reused by both processor and fallback.
- **Build health**: backend type-check ✅, frontend build ✅.
- **Environment blocker noted**: local runtime startup currently hits `EntityMetadataNotFoundError` for `TicketIssueType` in this workstation context.

## 🚀 QA Polish Checkpoint 5 (`v1.5.0.1`) — Documents Workflow + Role Gates

- **Focal upload status**: documents now created as `PENDING`; processor moves them to `READY` after text extraction so they appear to admins and in the Review queue.
- **Re-upload after return**: both legacy and reportorial upload paths now allow re-upload when the existing submission was returned (`needs_revision`/`non_compliant`); old doc is soft-deleted.
- **Admin visibility**: removed the review-decision filter that was hiding returned documents from super admin/compliance officer list view.
- **Return gate**: `returnDocumentForRevision` now allows returning `READY` documents (not just `PENDING`), fixing the inability to return text-extracted submissions.
- **Focal status labels**: Documents page now shows `Pending Review` / `Approved` / `Returned` chips for focal users.
- **Default filter**: Documents page default status filter changed to "All" so admins immediately see new uploads.
- **Reviews role gate**: Reviews module restricted to `super_admin` and `reviewer`; Review queue filter changed to `ready` to surface text-extracted documents.
- **Reports role gate**: Reports module restricted to `super_admin` and `reviewer`.
- All builds clean (backend `tsc --noEmit` ✅, frontend `tsc --noEmit` ✅).

## 🚀 QA Polish Checkpoint 4 (`v1.5.0.1`, 2026-03-10)

- All HTML report headers (h2, h3) now centered; period/summary/th elements use Arial 10pt
- Register Monitoring Matrix renamed “ICT Compliance Register Monitoring”; quarter columns renamed Q1–Q4 Score; source links display actual URLs; Applicable Bases column cleaned up; responsive colgroup widths
- KPI Gap Remarks Override panel only shown when an Assessment Report is previewed
- Assessment Plan and Assessment Schedule each have a standalone Print button
- Metrics: `reportorial_doc_type_id` now correctly saved in `metric_applicability` (was silently dropped)
- Document Upload: focal users using new Reportorial Doc Type system no longer blocked by stale legacy assignment check
- All builds clean; all 15 smoke tests passed; pushed to `feature/kpi-mov-major-update-1.5.0.1`

## 🚀 QA Polish Checkpoint 3 (`v1.5.0.1`, 2026-03-09)

- MoV Builder: Register report fully restructured (columns, fonts, date format, legend, no bullets)
- Monitoring Matrix promoted to its own report with dedicated backend endpoint
- MoV page access restricted to `super_admin` + `reviewer` roles
- Report Settings panel: dual header image upload + page footer (with optional first-page variant)
- KPI Gap Remarks: fully overridable per-gap + additional free-form remarks field
- Assessment Plan: visual timeline redesign using MUI Avatar, Chip, and accent-bordered Cards
- Artifacts: inline status edit (Edit → Select → Save/Cancel) per artifact row
- All builds clean; all 15 smoke tests passed; pushed to `feature/kpi-mov-major-update-1.5.0.1`

## 🚀 QA Polish Checkpoint 2 (`v1.5.0.1`, 2026-03-05)

- Issuances module now supports quarter-level compliance monitoring tags (`Q1`..`Q4`) directly in the register record.
- Added `register_added_at` tracking so report-added metrics are based on register onboarding date, not issuance date.
- MoV Builder was reorganized into tabs to reduce scrolling and improve task-focused flow.
- Register generation now provides three dedicated actions (Legal / Standards / Internal Policy), each using issuance-type grouping and full applicable row coverage.
- Assessment report generation now:
   - uses plan-derived checklist items,
   - presents conformance in plain narrative,
   - uses `❌` for failed checks,
   - includes schedule remarks,
   - accepts manual KPI gap remarks overrides.
- Assessment Plan now supports edit/add/delete with bulletized yearly content.
- Assessment Schedule now supports direct status + remarks updates.
- Print/save-PDF reliability improved via iframe print flow.
- Validation complete: backend build ✅, backend tests ✅, frontend build ✅, smoke ✅.

### Migration and rollback
- Migration impact: additive issuance columns only (`q1_compliance_status`..`q4_compliance_status`, `register_added_at`).
- Rollback: revert Issuances/MoV backend+frontend changes and schema/seed updates from this checkpoint.

## 🚀 QA Polish Checkpoint (`v1.5.0.1`, 2026-03-05)

- KPI module validation path hardened; resolved numeric-string parse failures on KPI dashboard/action-plan query handling.
- Issuances seed baseline enriched with contextual content for binding/adoption/provisions/obligations fields.
- Issuances `Process Owner` now uses user-driven dropdown values from active app users.
- MoV module polished to **MoV Builder** behavior:
   - Register report rendered as HTML visual document,
   - required ISMS header + period + summary bullets,
   - sectioned output (Legal / Standards / Internal Policy),
   - monitoring matrix table for quarterly scoring,
   - notes removed per QA.
- MoV Builder supports `Print / Save PDF` through browser print pipeline.
- Validation run complete: backend build ✅, backend tests ✅, frontend build ✅, smoke script ✅.

### Migration and rollback
- Migration impact: seed text enrichment only (no destructive schema edits).
- Rollback: revert KPI controller parsing updates, MoV builder/report files (backend+frontend), Issuances dropdown/seed changes, and sidebar label update.

## 🚀 Major Update Checkpoint (`v1.5.0.1`, 2026-03-04)

- KPI MoV quality-first implementation is now integrated in-app.
- New MoV Planner capability now acts as a report builder:
   - Register report auto-generated from saved Issuances register data.
   - Assessment report/checklist auto-generated from plan + schedule + KPI monitoring data.
- KPI action-plan recommendations are now generated by backend logic and surfaced in Reports.
- KPI action-plan recommendations are also visible in KPI dashboard area.
- Database baseline now includes `mov_artifacts` for MoV artifact persistence.
- Issuances register now includes additional governance/evidence/readiness fields required for quarterly MoV completeness tracking.
- Validation completed with backend/frontend builds, backend tests, and passing smoke script.

> Update (`v1.1.0-dev`, 2026-02-24): backend now stores document binaries/previews in DB blobs with fallback compatibility for legacy file paths.

**Last Updated**: February 24, 2026  
**Methodology**: BMAD (Breakthrough Method for Agile AI-Driven Development)  
**Phase**: MVP Stabilization + Hardening (Release Candidate)

## 🚀 Release Candidate Summary (`v1.0.0`)

- Security hardening baseline implemented (rate limiting, env validation, action audit logs).
- Metrics/reviews/tickets stabilization patch validated in build + smoke tests.
- Backend integrated tests added for metric engine behaviors.
- CI pipeline added for build/test/audit baseline checks.
- Public-facing documentation set updated (`README`, `INSTALLATION`, `WALKTHROUGH`, `CAPABILITIES`, `CHANGELOG`).

## 🔄 Post-Release Patch Delta (2026-02-24 PM)

- Added issuance mapping manager UI for linking/unlinking documents to issuances.
- Mapping persists through `document_issuances` many-to-many table.
- Added explicit role visibility behavior for issuance CRUD/mapping (compliance + super admin).
- Revalidated backend build/tests and frontend build after patch.
- Corrected document workflow semantics from delete to return-for-revision (pending-only, remarks-required, audit-preserving).
- Added dynamic issue type/category super-admin management with activate/deactivate and soft-delete safeguards.
- Fixed user-manual access by registering `/dashboard/user-manual` route in application router.

## 🔒 Local Tracking Scope

This project status file is maintained as a local tracking artifact and is excluded from the release push package.

## 🔄 Current Execution Delta (2026-02-23)

- ✅ **Deadline-capable Date Checks:** Super admins/reviewers can configure date-check metric templates with unit + document-type applicability and explicit deadline rules.
- ✅ **Metrics Reliability Fixes:** Section/keyword matching robustness improved; number extraction now supported through metric property engine mode.
- ✅ **Review Workspace Upgrade:** Manual review now supports digital inline document viewing and in-viewer compliance tagging.
- ✅ **Ticket Workflow Alignment:** Added issue documentation fields (`issue_type`, `resolution_steps`, `resolution_date`) in backend + frontend.
- ✅ **Critical API Bug Fixes:** Fixed JWT user-id mapping in ticket/review controllers and fixed document metrics endpoint version resolution.

---

## 📊 Overall Progress: 40% Complete

### ✅ Completed Sprints

#### Sprint 0: Project Setup (100% Complete)
- ✅ NestJS backend initialized with TypeScript
- ✅ Vite frontend with React Router
- ✅ PostgreSQL + Redis Docker configuration
- ✅ Project structure following BMAD architecture
- ✅ Development environment setup
- ✅ BMAD documentation (PRD, ARCH, TASKS)

#### Sprint 1: Authentication & Core Entities (100% Complete)
- ✅ User entity with role-based access control
- ✅ JWT authentication with refresh tokens
- ✅ Auth module (login, logout, profile)
- ✅ Units module (CRUD operations)
- ✅ Users module (CRUD operations)
- ✅ Role-based guards and decorators
- ✅ Frontend AuthContext and login page
- ✅ Protected routes middleware
- ✅ Basic dashboard layout

---

## 🚧 In Progress

### Sprint 2: Document Management (0% Complete)
**Target**: Enable document upload, storage, versioning, and preview

**Remaining Tasks**:
- [ ] Document & DocumentVersion entities
- [ ] File storage service (local/S3)
- [ ] Document upload API endpoint
- [ ] DOCX text extraction (Mammoth.js)
- [ ] PDF preview generation (LibreOffice)
- [ ] Background job processing (Bull queue)
- [ ] Version management endpoints
- [ ] Frontend: Upload component
- [ ] Frontend: Document list and viewer

---

## 📋 Upcoming Sprints

### Sprint 3: Compliance Engine (0% Complete)
- Metric templates entity and CRUD
- Metric computation engines (section, keyword, property, date checks)
- Automated metrics processing job
- Metric results storage and retrieval
- Admin metric builder UI

### Sprint 4: Manual Review & Version Comparison (0% Complete)
- Manual review entity and workflow
- Evidence report generation
- Version comparison with diff highlighting
- Review submission UI
- Compare versions UI

### Sprint 5: Reference Tracker & Tickets (0% Complete)
- Issuances entity (laws, regulations, standards)
- Reference search and management
- Ticket categories and tickets entities
- Ticket logging and analytics
- Frontend: Reference tracker pages
- Frontend: Tickets management

### Sprint 6: Dashboard & Reporting (0% Complete)
- Compliance dashboard with KPIs
- Ticket analytics dashboard
- Audit log viewer
- Export functionality (CSV, PDF)
- Charts and visualizations

### Sprint 7: Testing & Deployment (0% Complete)
- Unit and integration tests
- E2E tests (Playwright/Cypress)
- Security hardening
- Performance optimization
- Documentation
- Production deployment

---

## 🏗️ Architecture Status

### Backend (NestJS)
**Status**: Foundation Complete ✅

**Implemented**:
- ✅ Main application setup
- ✅ TypeORM database configuration
- ✅ Bull queue configuration
- ✅ Auth module with JWT
- ✅ Users module
- ✅ Units module
- ✅ Common guards and decorators

**Pending**:
- ⏳ Documents module
- ⏳ Metrics module
- ⏳ Reviews module
- ⏳ Comparison module
- ⏳ References module
- ⏳ Tickets module
- ⏳ Dashboard module
- ⏳ Audit module
- ⏳ Background jobs (document processing)

### Frontend (Vite + React Router)
**Status**: Foundation Complete ✅

**Implemented**:
- ✅ Vite + React Router setup
- ✅ Material-UI theme
- ✅ React Query configuration
- ✅ Auth context and login flow
- ✅ Protected route middleware
- ✅ API client with token refresh
- ✅ Basic dashboard page

**Pending**:
- ⏳ Document upload component
- ⏳ Document list and viewer
- ⏳ Version comparison component
- ⏳ Metric results display
- ⏳ Review form component
- ⏳ Reference tracker pages
- ⏳ Tickets pages
- ⏳ Admin configuration pages
- ⏳ Dashboard charts and KPIs

### Database Schema
**Status**: Partial ✅

**Implemented**:
- ✅ Users table
- ✅ Units table
- ✅ User-Unit many-to-many relation

**Pending**:
- ⏳ Document types table
- ⏳ Documents table
- ⏳ Document versions table
- ⏳ Metric templates table
- ⏳ Metric results table
- ⏳ Manual reviews table
- ⏳ Comparisons table
- ⏳ Issuances table
- ⏳ Tickets and categories tables
- ⏳ Audit logs table

---

## 📈 Metrics

### Code Statistics
- **Backend Files Created**: ~30
- **Frontend Files Created**: ~15
- **Total Lines of Code**: ~3,500+
- **Modules Implemented**: 3 (Auth, Users, Units)
- **API Endpoints**: 15+

### Test Coverage
- **Backend Tests**: Not yet written (Sprint 7)
- **Frontend Tests**: Not yet written (Sprint 7)
- **Target Coverage**: 70%+

---

## 🎯 Next Immediate Steps

1. **Install backend dependencies**:
   ```powershell
   cd backend
   npm install
   ```

2. **Install frontend dependencies**:
   ```powershell
   cd frontend
   npm install
   ```

3. **Start Docker services**:
   ```powershell
   docker-compose up -d postgres redis
   ```

4. **Start backend**:
   ```powershell
   cd backend
   npm run start:dev
   ```

5. **Start frontend**:
   ```powershell
   cd frontend
   npm run dev
   ```

6. **Create admin user** (see SETUP.md)

7. **Test login** at http://localhost:3000

8. **Begin Sprint 2**: Document Management implementation

---

## 🚀 Team Capacity & Timeline

**Estimated Remaining Work**: ~350 hours (44 days with 1 developer)

**Sprint Breakdown**:
- Sprint 2: 73 hours (~9 days)
- Sprint 3: 58 hours (~7 days)
- Sprint 4: 57 hours (~7 days)
- Sprint 5: 60 hours (~8 days)  
- Sprint 6: 56 hours (~7 days)
- Sprint 7: 119 hours (~15 days)

**Total MVP Timeline**: ~64 days (13 weeks) with 1 full-time developer  
**With 2 developers**: ~7-8 weeks

---

## 📚 Documentation

All BMAD documentation is in the `.bmad/` directory:

- **[01_PRD.md](.bmad/01_PRD.md)**: Complete product requirements, user stories, acceptance criteria
- **[02_ARCH.md](.bmad/02_ARCH.md)**: System architecture, tech stack, database schema, API design
- **[03_TASKS.md](.bmad/03_TASKS.md)**: Sprint-by-sprint task breakdown with estimates

Additional docs:
- **[README.md](README.md)**: Project overview and quick start
- **[SETUP.md](SETUP.md)**: Detailed setup instructions

---

## ⚠️ Known Issues / Technical Debt

1. **Database Synchronization**: Currently using TypeORM `synchronize: true` for development. Need to switch to migrations for production.
2. **No seed data**: Need to create seed scripts for initial users, units, and categories.
3. **LibreOffice**: Need to install and configure LibreOffice for DOCX→PDF conversion (Sprint 2).
4. **File storage**: Currently set for local filesystem; need S3 setup for production.
5. **No tests**: Unit and integration tests to be written in Sprint 7.
6. **No API documentation**: Swagger/OpenAPI docs to be added.

---

## 🔐 Security Considerations

**Implemented**:
- ✅ JWT authentication with refresh tokens
- ✅ Password hashing with bcrypt
- ✅ Role-based access control
- ✅ CORS configuration
- ✅ Helmet.js security headers

**Pending**:
- ⏳ Rate limiting on auth endpoints
- ⏳ Input sanitization (XSS protection)
- ⏳ CSRF protection
- ⏳ File upload validation (virus scanning)
- ⏳ Security audit

---

## 📞 Support & Contact

For questions or issues:
- Review BMAD documentation in `.bmad/`
- Check [SETUP.md](SETUP.md) for troubleshooting
- Contact: Development Team

---

**Status Legend**:
- ✅ Complete
- 🚧 In Progress
- ⏳ Not Started
- ⚠️ Blocked
- 🐛 Bug/Issue

---

**Last Build**: Successful ✅  
**Last Test Run**: N/A (Sprint 7)  
**Deployment**: Local Development Only

---

## KPI MoV Quality Alignment Delta (2026-03-04)

### Scope Decision
- Current checkpoint is documentation/planning only; no application code changes executed.
- Quality and MoV completeness prioritized over Efficiency scoring for this cycle.

### Outputs Produced
- KPI audit addendum with quality-first interpretation and actionable artifact strategy.
- Register completeness recommendations, including support for standards/plans/executive issuances with binding/adoption tagging.
- Assessment planning structure with Year 1 baseline and succeeding-year maturity guidance.
- ICT Document Review Report template for dual scope (national + regional).

### Project Impact
- Provides implementation-ready blueprint for the next coding stage.
- Reduces ambiguity in MoV packaging for quarterly reporting deadlines.

---

## QA Execution Snapshot - 2026-03-11

### Delivered
- Documents UX polish: viewer title consistency, period formatting normalization, improved returned-remarks visibility.
- Upload UX polish: concise invalid-filename error and Google Docs export/upload guidance.
- Metrics reliability: compact-period parsing support + richer failure explanations.
- Repository policy alignment: compliant-only contents enforced.
- Module governance: Issues renamed to Knowledge Base and restricted to super-admin only.
- MoV dark-mode preview readability fixed.

### Build/Test Health
- Backend targeted unit tests passed.
- Frontend build completed successfully.
- Backend build completed successfully.

### Remaining user-requested ops
- Ensure port `4000` is clear after completion.
