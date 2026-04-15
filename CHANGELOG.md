# RICTMS Compliance Hub - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [0.0.19] - 2026-04-14 — Clickable Email Links, Redirect-After-Login, 3-DB Seed, File Cleanup

### Added
- **Clickable ticket links in emails:** All 4 email templates now include a clickable ticket number heading and a "View Ticket" CTA button linking to `${FRONTEND_URL}/dashboard/tickets/${ticketId}`.
- **Resolve email with dual CTAs:** `sendTicketResolvedEmailToRequester` now shows side-by-side "Close Ticket" and "Rate Technician" action buttons, with a session-expiry note.
- **Redirect-after-login:** `ProtectedDashboard` (App.tsx) now encodes the current path as `?redirect=<path>` when redirecting unauthenticated users to `/login`. `AuthContext.login` and `loginWithGoogle` accept optional `redirectTo?: string` param and use it for post-login navigation. Login page reads and passes the `redirect` query param.
- **EMAIL_TEST_OVERRIDE env var:** Documented in `.env.example` with clear removal instructions in `email.service.ts`.
- **SMTP_FROM_NAME and EMAIL_ENABLED:** Added to `.env.example`.
- **seed-data.sql 3-DB restructure:** Reorganized into 4 USE sections covering `compliance_hub_users`, `compliance_hub`, and `compliance_hub_ticketing`. Removed reviewer/focal test accounts (id=2, id=3 now are `cybersec.test` and `lead.infra`).
- **ticket_categories seed:** 6 default IT support categories seeded in `compliance_hub_ticketing`.
- **ticket_keyword_rules seed:** 6 default keyword rules for auto-type detection seeded.
- **role_definitions copy in ticketing DB:** `compliance_hub_ticketing.role_definitions` now seeded alongside the primary `compliance_hub_users.role_definitions`.

### Changed
- **email.service.ts:** Added `ticketId: string` to all 4 email data interfaces. Added `frontendUrl` read from `FRONTEND_URL` env var. All 4 email templates updated with structured HTML, clickable ticket number, action buttons.
- **ticket.service.ts:** All 7 `emailService.*` call sites now pass `ticketId`.
- **seed-data.sql:** Single `USE compliance_hub` replaced with proper 3-section layout. Sample tickets moved to `compliance_hub_ticketing` section.

### Removed
- **Unnecessary project files deleted:** `IMPLEMENTATION-PLAN.md`, `IMPLEMENTATION_STATUS.md`, `CURRENT-STATUS.md`, `DATABASE-SETUP-COMPLETE.md`, `PROJECT_STATUS.md`, `RELEASE-NOTES-v1.2.0.4.md`, `KPI-FEATURE-PLAN.md`, `KPI-MOV-AUDIT-2026-03-04.md`, `ICT-ISSUANCE-RELEVANCE-MAP.md`, `smoke-test.ps1`, `smoke-artifacts/`, `tentative-compliance-report/`, `services/`, `scripts/reset-for-uat.*`.

### How To Test
- Email: Create a ticket, check email — ticket number should be a link to the ticket detail URL.
- Email: Resolve a ticket, check requester email — Close Ticket and Rate Technician buttons should appear.
- Auth: Log out while on `/dashboard/tickets/:id`, go back to that URL — should redirect to `/login?redirect=...` and land on the ticket after login.
- Seed: Run `seed-data.sql` against the 3-DB microservices setup — all 4 sections should succeed without foreign key errors.

### Rollback Steps
- Revert `backend/src/modules/tickets/services/email.service.ts` and `ticket.service.ts` to remove `ticketId` if email format causes issues.
- Revert `frontend/src/App.tsx` `ProtectedDashboard` redirect if redirect loop is observed.
- Restore deleted files from git if needed: `git checkout HEAD~1 -- <file>`.

- **Patch version bump only** — `0.0.18` -> `0.0.19` (x/y unchanged).

---

## [0.0.14] - 2026-04-14 - DB Reference Hardening + Attendance Route Ownership Correction

### Changed
- **Runtime DB reference hardening:** replaced remaining runtime/config/script defaults that used `rictms_compliance` with `compliance_hub`.
- **Users/Ticketing/Compliance DB env alignment:** added explicit split DB variables in backend env templates.
- **Attendance API ownership corrected:** gateway now routes `/api/attendance` to users service.
- **Ticketing attendance route removed:** attendance controller is no longer exposed by ticketing service.
- **Users service attendance API added:** users service now serves attendance endpoints via a dedicated attendance module import.
- **Auth module decoupled from static ticket-module import:** prevents users-service from loading ticket routes by static module resolution.
- **Patch version bump only** - `0.0.13` -> `0.0.14` (x/y unchanged).

### How To Test
- Build backend and frontend.
- Run backend unit tests.
- Start users, ticketing, compliance, and gateway services.
- Verify `/api/attendance/*` works through users service routing.
- Verify direct ticketing `/api/attendance` returns 404 (route ownership check).

### Migration Steps
- Ensure split schemas and compatibility objects are present (`compliance_hub`, `compliance_hub_users`, `compliance_hub_ticketing`).
- Run `backend/database/microservices-init.sql` and `backend/database/microservices-migrate.sql` using a MariaDB/MySQL client in environments that have not been migrated.

### Rollback Steps
- Revert this release commit.
- Restore previous gateway attendance proxy target if needed.
- Redeploy users, ticketing, compliance, and gateway services.

## [0.0.13] - 2026-04-14 - Inactivity Re-Authentication + Deployment/Documentation Baseline

### Added
- **15-minute inactivity lock workflow (frontend):** authenticated sessions are locked after 15 minutes of no user activity and require explicit unlock before continuing.
- **Session unlock UI:** added password re-entry dialog in auth context flow for local-auth users, including validation and clear failure messaging.
- **Backend re-auth endpoint:** added `POST /auth/reauthenticate` for password verification without full logout/login cycle.
- **Provider-aware unlock behavior:** Google-authenticated users are prompted to sign in again when session lock is triggered.
- **Deployment guide:** added root `deployment.md` with step-by-step, repo-based split-container deployment procedure.
- **In-house QA user stories:** added `INHOUSE-QA-USER-STORIES.md`.
- **Main system documentation:** added `MAIN-SYSTEM-DOCUMENTATION.md` with context diagram, system profile, specs table, DB dictionary, ERD overview, manuals, and web app link section.

### Changed
- **Auth profile payload extended:** `GET /auth/me` now includes `authProvider` for client-side lock/unlock decisioning.
- **Patch version bump only** - `0.0.12` -> `0.0.13` (x/y unchanged).

### How To Test
- Build backend and frontend.
- Run backend unit tests.
- Authenticate as local account, wait 15 minutes without activity, verify lock dialog appears and valid password unlocks session.
- Authenticate as Google account, wait 15 minutes without activity, verify sign-in-again flow prompt appears.

### Migration Steps
- No database schema migration required.

### Rollback Steps
- Revert this release commit and redeploy backend/frontend.

## [0.0.12] - 2026-04-14 — Split-DB Ownership Enforcement + Federated User Access

### Changed
- **Single-table ownership enforced (no duplicated base tables):**
  - `users` is now owned only by `compliance_hub_users`.
  - `units` is now owned only by `compliance_hub`.
  - `attendance` is now owned only by `compliance_hub_users`.
- **Backward-compatible cross-db access added via passthrough views:**
  - `compliance_hub_ticketing.users` (VIEW) -> `compliance_hub_users.users`
  - `compliance_hub_ticketing.units` (VIEW) -> `compliance_hub.units`
  - `compliance_hub_ticketing.attendance` (VIEW) -> `compliance_hub_users.attendance`
  - `compliance_hub.users` (VIEW) -> `compliance_hub_users.users`
  - `compliance_hub_users.units` (VIEW) -> `compliance_hub.units`
- **Migration hardening:** microservice migration SQL now supports repeated runs safely with view-aware cleanup and base-table checks.
- **Ticketing runtime hardening:** startup migration now ensures attendance ownership in users DB and regenerates ticketing compatibility views for `users`, `units`, and `attendance`.
- **Fallback API for cross-db user retrieval:** added `GET /api/users/federated` to return users with unit context through DB objects (works with base tables or views).
- **Patch version bump only** — `0.0.11` -> `0.0.12` (x/y unchanged).

### How To Test
- Build backend and frontend.
- Run backend unit tests.
- Run migration SQL and verify ownership state:
  - `compliance_hub_users.users` = BASE TABLE
  - `compliance_hub.units` = BASE TABLE
  - `compliance_hub_users.attendance` = BASE TABLE
  - corresponding objects in other DBs are views, not duplicated tables.
- Call `GET /api/users/federated` and verify user + unit output still resolves.

### Migration Steps
- Run `backend/database/microservices-migrate.sql` once (idempotent).
- Restart users, ticketing, compliance, and gateway services.

### Rollback Steps
- Revert this release commit.
- Re-run prior migration version if you need previous table-placement behavior.
- Restart all services.

## [0.0.11] - 2026-04-14 — DB Rename + Attendance Table Rename + Service Availability UX

### Changed
- **Split database naming standardized** — updated split DB naming to `compliance_hub_users`, `compliance_hub_ticketing`, and `compliance_hub` in init/migration scripts and compose service env wiring.
- **Attendance table renamed** — ticketing attendance table now uses `attendance` instead of `tech_attendance`; backend entity/query references and UAT reset scripts were updated accordingly.
- **Migration source DB detection hardened** — migration now selects a source schema with actual data and supports both legacy names (`ricms_compliance` and `rictms_compliance`) when `compliance_hub` exists but is empty.
- **Service unavailable handling improved** — gateway now returns clear `503` responses with `Service currently unavailable` message for downed services and exposes per-service health booleans.
- **Frontend availability behavior added** — dashboard/sidebar now hide or replace service-scoped views when corresponding microservice is offline.
- **Patch version bump only** — `0.0.10` -> `0.0.11` (x/y unchanged).

### How To Test
- Build backend/frontend.
- Run backend unit tests.
- Run migration SQL and verify schema names include `compliance_hub*` and ticketing contains `attendance`.
- Stop compliance service and verify compliance routes show unavailable messaging while users/ticketing routes remain accessible.

### Migration Steps
- Run `backend/database/microservices-init.sql` (for DB creation/grants).
- Run `backend/database/microservices-migrate.sql` once to copy legacy data into split DBs with attendance compatibility copy (`tech_attendance` -> `attendance`).

### Rollback Steps
- Revert this release commit.
- Restore previous split DB names and `tech_attendance` mapping if required by legacy runtime.

## [0.0.10] - 2026-04-14 — QA Findings Closure: Attendance Legacy-Role Removal + RoleDefinition-Driven Grouping

### Changed
- **Removed legacy attendance roles from attendance logic** — eliminated direct use of `FOCAL`, `TECHNICIAN`, `TECHNICIAN_DESKTOP`, `TECHNICIAN_IT_SUPPORT`, `TECHNICIAN_IT_STAFF`, `TECHNICIAN_DESKTOP_STAFF` in attendance service/controller/frontend attendance role gates.
- **Centralized attendance role grouping** — implemented grouped attendance role map (`desktop_support`, `it_support`, `pantawid_ict_support`, `ito`, `all`) in attendance service.
- **RoleDefinition-driven attendance role selection** — attendance role resolution now reads from `role_definitions` (`assignable=true`) while excluding `user` and `super_admin`, plus legacy roles above.
- **Attendance custom-role path cleanup** — removed legacy `customRoles` branching from attendance role filtering and replaced with centralized role-group resolution.
- **Patch version bump only** — `0.0.9` -> `0.0.10` (x/y unchanged).

### How To Test
- Build backend/frontend.
- Run backend unit tests.
- Run repository smoke tests.
- Verify attendance category filters return only expected role groups and legacy role accounts are not included by attendance role filters.

### Migration Steps
- No DB schema migration required.
- Ensure `role_definitions` contains the current assignable roles used for attendance.

### Rollback Steps
- Revert this release commit.
- Restart backend/frontend services.

## [0.0.9] - 2026-04-14 — QA Findings Closure: Attendance Mapping + ITO Login Marking + Escalation Focal List

### Changed
- **Attendance default scope fixed** — default attendance category now consistently means `All (Technicians + ITOs)` in backend filtering and UI label.
- **Support-category isolation fixed** — attendance category filters no longer leak cross-category technicians due to broad fallback technician-flag inclusion.
- **ITO login attendance automation fixed** — auto-attendance on login now includes ITO/focal-equivalent roles.
- **Escalation dropdown focal sourcing fixed** — ticket detail escalation dialog now builds candidate users from attendance category pools (`ito` + ticket type), then filters by configured escalation focal roles.
- **Placeholder attendance users removed from operational views** — attendance queries now exclude seeded demo placeholder identities (`desktop.tech@rictms.gov.ph`, `it.tech@rictms.gov.ph`, `focal@rictms.gov.ph`).
- **Migration script cleanup extension** — `backend/database/microservices-migrate.sql` now includes optional post-copy cleanup that drops non-compliance tables from the source DB when `@cleanup_source_tables = 1`.
- **Patch version bump only** — `0.0.8` -> `0.0.9` (x/y unchanged).

### How To Test
- In Attendance page, verify default category shows `All (Technicians + ITOs)` and includes ITO/focal-equivalent accounts.
- Switch categories (`IT Support`, `Desktop Support`, `Pantawid ICT Support`, `ITOs`) and verify no cross-category leakage.
- Login as ITO/focal-equivalent account and verify today attendance auto-marks present.
- Open ticket detail escalation dialog and verify configured focal users are selectable.
- Run backend/frontend build and backend tests.

### Migration Steps
- Run: `mysql -h <host> -u <user> -p < backend/database/microservices-migrate.sql`
- Keep `SET @cleanup_source_tables = 1;` to remove users/ticketing tables from source DB after copy.

### Rollback Steps
- Revert this release commit.
- Set `@cleanup_source_tables = 0` if you need copy-only behavior without source-table removal.

## [0.0.8] - 2026-04-14 — QA Findings Closure: Escalation Visibility + Split-DB Data Migration

### Added
- **Escalated queue filter for focal accounts** — added `escalatedToMe` query support in ticket listing API and frontend toggle button `Escalated To Me` so focal/senior accounts can explicitly view escalated tickets.
- **One-time split DB data migration script** — added `backend/database/microservices-migrate.sql` to copy existing tables/data from legacy shared DB into `ricms_users`, `ricms_ticketing`, and `ricms_compliance`.

### Changed
- **Escalation UI discoverability** — ticket detail now shows explicit `Upload Proof Photo(s)` button in the escalate dialog (instead of raw file input only).
- **Escalation role visibility alignment** — frontend escalation eligibility now includes junior technician roles (`desktop_jr`, `it_support_jr`) to match backend-authorized escalation roles.
- **Compose split DB wiring correction** — fixed swapped service DB env mappings in `docker-compose.yml`:
  - `users-service` -> `USERS_DB_DATABASE=ricms_users`
  - `ticketing-service` -> `TICKETING_DB_DATABASE=ricms_ticketing`
  - `compliance-service` -> `COMPLIANCE_DB_DATABASE=ricms_compliance`
- **Patch version bump only** — `0.0.7` -> `0.0.8` (x/y unchanged).

### How To Test
- Build backend and frontend.
- Call `/api/tickets?escalatedToMe=true` as a focal/senior account and verify escalated tickets return.
- In Tickets page, toggle `Escalated To Me` and verify list changes accordingly.
- Open ticket detail, verify `Escalate Ticket` action is visible for technician roles (including junior roles), and verify `Upload Proof Photo(s)` appears in escalation dialog.
- Run `backend/database/microservices-migrate.sql` on environments with pre-split data, then verify data exists in each service DB.

### Migration Steps
- Ensure split DBs exist (`ricms_users`, `ricms_ticketing`, `ricms_compliance`).
- Run one-time migration script:
  - `mysql -h <host> -u <user> -p < backend/database/microservices-migrate.sql`
- Restart users, ticketing, and compliance services.

### Rollback Steps
- Revert this release commit.
- Revert to shared DB routing by setting services back to one `DB_DATABASE` value.
- Disable use of `escalatedToMe` filter in clients (if rolling back frontend only).

## [0.0.7] - 2026-04-14 — QA Follow-up: Service DB Separation + Ticket Escalation Verification

### Added
- **Per-service DB initialization script** — added `backend/database/microservices-init.sql` to create `ricms_users`, `ricms_ticketing`, and `ricms_compliance` databases and grant access for `ricms_user`.
- **Service-specific DB env overrides** — added optional env support in app modules:
  - `USERS_DB_DATABASE` (users service)
  - `TICKETING_DB_DATABASE` (ticketing service)
  - `COMPLIANCE_DB_DATABASE` (compliance service)

### Changed
- **Compose DB split wiring** — `users-service` now uses `ricms_users`; `ticketing-service` now uses `ricms_ticketing`; `compliance-service` remains on `ricms_compliance`.
- **MariaDB startup init mount** — compose now mounts `backend/database/microservices-init.sql` into `/docker-entrypoint-initdb.d` for first-boot DB creation.
- **QA verification coverage** — confirmed escalation proof-photo upload and escalate action are already implemented in ticket detail flow (`/tickets/:id/escalate` multipart + frontend escalate dialog/button).
- **Patch version bump only** — `0.0.6` → `0.0.7`.

### How To Test
- Build backend and frontend.
- Start `users-service`, `ticketing-service`, and `api-gateway`; verify login and ticket flows still work.
- In ticket detail as technician, verify `Escalate Ticket` button is visible on non-terminal tickets.
- Escalate with proof image(s) and verify escalation record contains proof attachment count.
- For Docker first boot, verify `ricms_users`, `ricms_ticketing`, `ricms_compliance` are created.

### Migration Steps
- If using Docker with an existing MariaDB volume, run SQL once manually (or recreate volume) to create the new databases and grants.
- Ensure service env vars point to intended DB names (defaults in compose are already set).

### Rollback Steps
- Revert this release commit.
- Point all services back to a single shared `DB_DATABASE` value (e.g., `ricms_compliance`) and remove service-specific overrides.

## [0.0.6] - 2026-04-14 — Compliance Service Extraction (Users/Ticketing/Compliance Split)

### Added
- **Compliance service runtime** — new independent backend app entrypoint for non-users/non-ticketing modules on port `4103`.
- **Compliance JWT strategy** — token validation for compliance service routes without coupling to users/ticketing runtime.
- **Startup scripts** — `start:compliance` and `start:compliance:dev`.

### Changed
- **Gateway routing split** — non-users/non-ticketing API domains now proxy to compliance service:
  - `/api/documents`, `/api/document-types`, `/api/comparisons`, `/api/issuances`, `/api/metrics`, `/api/incidents`, `/api/cybersecurity`, `/api/kpi`, `/api/mov`.
- **Compose microservices profile** — added `compliance-service` and wired gateway dependency/env for `COMPLIANCE_SERVICE_URL`.
- **Patch version bump only** — `0.0.5` → `0.0.6` (x/y unchanged).

### How To Test
- Start users (`4101`), ticketing (`4102`), compliance (`4103`), and gateway (`4000`).
- Verify users endpoints route through gateway to users service.
- Verify ticketing endpoints route through gateway to ticketing service.
- Verify document/metrics/references/incidents/kpi/mov endpoints route through gateway to compliance service.

### Migration Steps
- No database schema migration required.
- Restart all microservice processes to load the new compliance routing layout.

### Rollback Steps
- Revert `v0.0.6` commit on `microservices` branch.
- Run prior users/ticketing split with strict fallback for unsupported routes.

## [0.0.5] - 2026-04-14 — QA Fixes: Reassign Eligibility, Terminal Actions, Strict Split Runtime

### Fixed
- **Absent technicians appearing in Reassign dialog** — added backend assignment guard and frontend defensive filter so technicians marked `absent` or `out_of_office` are not assignable.
- **Resolved/closed tickets reassign action behavior** — tickets table now keeps the reassign icon visible but disabled for `resolved`/`closed` tickets.
- **Terminal status action visibility** — ticket detail now hides `Update Status` for technicians, section head, compliance officer, and super admin when ticket is already `resolved`/`closed`.

### Added
- **Strict split-runtime guard** — gateway now returns explicit `503` for unsupported `/api/*` routes when running in strict microservices mode, preventing false impression that non-users/ticketing modules are available from split runtime.

### Changed
- **Technician availability payload** — backend technician list now includes attendance state metadata (`attendanceStatus`, `isUnavailable`) used by frontend filtering.
- **Patch version bump only** — `0.0.4` → `0.0.5` (x/y unchanged).

### How To Test
- Start users (`4101`), ticketing (`4102`), and gateway (`4000`), then open tickets table and click reassign on a ticket.
- Verify technicians marked absent/out-of-office do not appear in assign/reassign list.
- Verify reassign icon is visible but disabled for `resolved`/`closed` rows.
- Open ticket detail as technician/section head/compliance officer/super admin on `resolved` or `closed` ticket and verify `Update Status` is hidden.
- Call a non-ticketing/non-users API path through gateway and verify `503` with strict-mode message.

### Migration Steps
- No database schema migration required.
- Restart gateway to apply strict unsupported-route handling.

### Rollback Steps
- Revert `v0.0.5` commit on `microservices` branch.
- Set `MICROSERVICES_STRICT=false` (if needed) and/or run monolith backend for full-module APIs.

## [0.0.4] - 2026-04-13 — API Gateway on 4000 for Separated Users/Ticketing

### Fixed
- **Cannot connect to server when only users/ticketing services are started** — added dedicated API gateway runtime on port `4000` that proxies users/auth/units to users service and tickets/attendance/ticket-settings to ticketing service.

### Added
- **Gateway runtime entrypoint** — `backend/src/apps/gateway.main.ts` and `backend/src/apps/gateway.module.ts`.
- **Gateway startup scripts** — `start:gateway` and `start:gateway:dev`.
- **Compose gateway service** — `api-gateway` in `microservices` profile bound to port `4000`.

### Changed
- **Service extraction cleanup** — removed old placeholder stubs under `services/users-service` and `services/ticketing-service`; active split runtime now uses backend app entrypoints only.
- **Patch version bump only** — `0.0.3` → `0.0.4` (x/y unchanged).

### How To Test
- Start users service (`npm run start:users:dev`), ticketing service (`npm run start:ticketing:dev`), and gateway (`npm run start:gateway:dev`).
- Verify `http://localhost:4000/api/health` responds.
- Verify frontend calls to `/api/auth`, `/api/users`, `/api/tickets` succeed through gateway.

### Migration Steps
- No database schema migration required.
- Run `npm install` in `backend` to install `http-proxy-middleware`.

### Rollback Steps
- Revert `v0.0.4` commit on `microservices` branch.
- Run monolith backend only (`npm run start:dev`) on port `4000`.

## [0.0.3] - 2026-04-13 — Full Users/Ticketing Microservice Runtime Split (microservices branch)

### Added
- **Users service runtime entrypoint** — `backend/src/apps/users-service.main.ts` and `backend/src/apps/users-service.module.ts` now run Users/Auth/Units domain as an independent service.
- **Ticketing service runtime entrypoint** — `backend/src/apps/ticketing-service.main.ts` and `backend/src/apps/ticketing-service.module.ts` now run Tickets domain as an independent service.
- **Ticketing JWT strategy** — `backend/src/apps/ticketing-jwt.strategy.ts` provides JWT validation for ticketing service without coupling to full auth module imports.
- **Service start scripts** — backend scripts added: `start:users`, `start:users:dev`, `start:ticketing`, `start:ticketing:dev`.

### Changed
- **Auth decoupling for users service** — ticket-login hooks in auth are now optional; `AuthModule` imports `TicketsModule` only when `AUTH_ENABLE_TICKET_HOOKS=true`.
- **Docker microservices profile** — `users-service` and `ticketing-service` containers now run full backend domain entrypoints, not placeholder stubs.
- **Patch version bump only** — `0.0.2` → `0.0.3` (x/y unchanged).

### How To Test
- Start users service: `cd backend && npm run start:users:dev` (port `4101`).
- Start ticketing service: `cd backend && npm run start:ticketing:dev` (port `4102`).
- Keep frontend/main app on separate terminal as needed.
- Run regression suite: backend build/unit/e2e + smoke script.

### Migration Steps
- No database schema migration required.
- Ensure `.env` values are available to both services (DB/JWT/CORS).

### Rollback Steps
- Revert `v0.0.3` commit on `microservices` branch.
- Run monolith backend (`npm run start:dev`) only.

## [0.0.2] - 2026-04-13 — Microservices Transition Kickoff (microservices branch)

### Added
- **Users microservice scaffold** — new `services/users-service` NestJS skeleton with `/api/health` endpoint and independent runtime port `4101`.
- **Ticketing microservice scaffold** — new `services/ticketing-service` NestJS skeleton with `/api/health` endpoint and independent runtime port `4102`.
- **Container orchestration profile** — `docker-compose.yml` now includes optional `users-service` and `ticketing-service` containers under `microservices` profile for separate deploy/runtime startup.

### Changed
- **Patch version bump only** — `0.0.1` → `0.0.2` (x/y unchanged) for backend and frontend in `microservices` branch.

### How To Test
- Run current monolith smoke flow unchanged (`./smoke-test.ps1`) and verify pass.
- Validate users service scaffold by calling `GET /api/health` on port `4101` after starting the service.
- Validate ticketing service scaffold by calling `GET /api/health` on port `4102` after starting the service.
- Start optional service containers: `docker compose --profile microservices up users-service ticketing-service`.

### Migration Steps
- No database migration required.
- No runtime route switch performed yet; monolith remains active.

### Rollback Steps
- Revert `v0.0.2` commit on `microservices` branch.
- Omit `microservices` compose profile at startup.

## [0.6.26] - 2026-04-13 — QA Fixes: Tickets Reminder Scope + Unrated Row Highlight

### Fixed
- **Tickets-module modal scope (QA)** — pending-satisfaction modal no longer auto-opens when user is already inside Tickets module.
- **Unrated ticket visibility (QA)** — unresolved satisfaction rows in Tickets now use warning-tinted row background and `Unrated` status chip for easy identification.

### Changed
- **Patch version bump only** — `0.6.25` → `0.6.26` (x/y unchanged).

### How To Test
- Login as regular user with pending satisfaction tickets; dashboard reminder behavior remains unchanged.
- Navigate to Tickets module; verify no auto-popup modal appears on page load.
- In Tickets list, verify unresolved satisfaction tickets are visually highlighted and tagged `Unrated`.

### Migration Steps
- No database schema migration required.

### Rollback Steps
- Revert `v0.6.26` commit to restore prior tickets-page reminder and row styling behavior.

## [0.6.25] - 2026-04-13 — QA Fixes: Ticket Guard, Satisfaction Modal, Timeline Tie-Order, Email Freeze

### Fixed
- **No new ticket while unclosed ticket exists (QA)** — ticket creation now fails when requester has any non-terminal ticket (`open`, `assigned`, `in_progress`, `resolved`, `freeze`).
- **Timeline same-timestamp ordering (QA)** — when `created` and `auto_assigned` events share the same timestamp, `created` is forced before `auto_assigned`.
- **Satisfaction reminder enforcement (QA)** — requester reminders for unrated tickets are now shown as blocking modals (account open + new request action), replacing the previous toast behavior.

### Changed
- **Email test override restored** — `EMAIL_TEST_OVERRIDE` set back to `mjdibay@dswd.gov.ph`.
- **Email sending paused** — new `EMAIL_ENABLED=false` QA kill-switch suppresses outbound email sends globally.
- **Patch version bump only** — `0.6.24` → `0.6.25` (x/y unchanged).

### How To Test
- Login as requester with pending satisfaction tickets; verify reminder modal appears on dashboard open.
- Click `New Ticket` as requester with pending satisfaction; verify modal reminder appears (not toast).
- Attempt to submit a new ticket while requester has an unclosed ticket; verify backend blocks with `400` and clear message.
- Create ticket with auto-assignment and matching timestamps; verify timeline shows `Ticket Created` before `Automatic Ticket Assignment`.
- Trigger any email-producing action; verify no outbound email is sent while `EMAIL_ENABLED=false`.

### Migration Steps
- No database schema migration required.
- Apply `.env` updates: `EMAIL_TEST_OVERRIDE=mjdibay@dswd.gov.ph` and `EMAIL_ENABLED=false`.

### Rollback Steps
- Set `EMAIL_ENABLED=true` to re-enable outbound email.
- Revert `v0.6.25` commit to restore prior ticket creation/reminder/timeline behavior.

## [0.6.24] - 2026-04-08 — QA Fixes: Attendance Completion Polling, Technician Status Progression, Timeline Cleanup

### Fixed
- **Attendance live update until all staff are marked for today** — attendance tab now performs focused 5-second polling while today's viewed month still has unmarked technicians.
- **Assigned technician could not proceed to in-progress/resolved in priority-required flow** — staff technicians can now set priority in ticket detail, matching backend permission and allowing status progression.
- **Technician internal note behavior** — internal-note posting remains staff-enabled and user-role blocked; timeline comment noise removed so notes stay in comments only.
- **Auto-assignment mislabeled as manual on login** — login-triggered assignment events now log as `auto_assigned`.
- **Comments in timeline** — comment events are no longer generated for timeline history and are filtered from timeline rendering.
- **Timestamp ordering** — ticket comments/internal notes are now rendered in explicit chronological order by `createdAt`.
- **Backend dev port conflict** — added backend dev preflight script to clear stale `dist` and terminate listeners on port `4000` before watch startup.

### Changed
- Backend `start:dev` now runs `node scripts/prepare-dev.js && nest start --watch`.
- Patch version bump only: `0.6.23` → `0.6.24` (x/y unchanged) for backend and frontend.

### Added (Post-Release QA Addendum, no version bump)
- **Email test override target updated for QA validation** — outbound ticket emails are currently redirected to `ibayatucv@gmail.com` via `EMAIL_TEST_OVERRIDE`.
- **Ticket lifecycle email routing**
  - Ticket Assignment → sends to technician.
  - Ticket Resolved → sends to requester with explicit message to rate technician.
  - Ticket Closed (requester close) → sends to technician.
  - Ticket Rated / Satisfaction submitted → sends to technician.
- **Runtime behavior clarification** — while `EMAIL_TEST_OVERRIDE` is set, all above emails are redirected to the override inbox instead of real requester/technician addresses.
- **Regression hardening from smoke fix-loop** — ticket number generation now uses latest sequence (not row count) and create-ticket save retries on duplicate-key collision, preventing intermittent `500` on ticket creation.

### Migration Steps
- No database schema migration required.

### Rollback Steps
- Revert `v0.6.24` commit and redeploy both backend/frontend.

## [0.6.23] - 2026-04-08 — QA Fixes: Present-Only Auto Assignment + OPEN Revert Reassignment

### Fixed
- **Automatic assignment disabled when no PRESENT technicians exist** — automatic assignment paths now require explicit `present` attendance records for technicians. No attendance record and `half_day` no longer qualify for auto-assignment decisions.
- **Revert-to-OPEN must clear assignee** — when ticket status is set to `open`, `assignedToId` is cleared first.
- **Revert-to-OPEN should auto-assign if technician is available** — after clearing assignee on `open`, the system immediately attempts auto-assignment using present-only technician availability and existing workload guards.

### Changed
- Added `AttendanceService.getPresentTechnicians(ticketType, date)` used by auto-assignment logic.
- Updated create-ticket auto-assignment and login-triggered assignment checks to use present-only technician pool.
- Patch version bump only: `0.6.22` → `0.6.23` (x/y unchanged).

### How To Test
- Mark all technicians absent for a support type and create a ticket; verify ticket stays `OPEN` and unassigned.
- Change ticket status to `OPEN`; verify assignee is cleared.
- Ensure at least one PRESENT technician with zero active tickets, revert ticket to `OPEN`; verify immediate assignment.
- Run unit/build/smoke validation commands.

### Migration Steps
- No database schema migration required.
- Deploy backend/frontend build at `0.6.23`.

### Rollback Steps
- Revert `v0.6.23` commit and redeploy.
- Re-run build and smoke tests to confirm rollback behavior.

## [0.6.22] - 2026-04-08 — QA Fixes: Login Auto-Assign, Attendance-Safe Pantawid Assign, OPEN Unassign, Escalation Focal Label Cleanup

### Fixed
- **Auto-assign on technician login (QA: open ticket before any technician logs in)** — `AuthService.login()` and `AuthService.googleLogin()` now trigger `TicketService.assignPendingTicketsOnLogin(user.id)` after attendance auto-correction. This immediately attempts assignment of the oldest matching `OPEN` ticket for the logging-in technician's tier using existing auto-assignment guards.
- **Pantawid auto-assign to absent technician (QA)** — `createTicket()` no longer queries all active Pantawid users directly. It now calls `AttendanceService.getAvailableTechnicians('pantawid_ict_support', today)` so absent/out-of-office technicians are excluded.
- **All technicians absent should keep ticket unassigned (QA)** — with the attendance-based Pantawid candidate source, `assignedToId` remains `null` when no available Pantawid technician exists.
- **Status change to OPEN should clear assignee (QA)** — in `updateTicket()`, transitioning to `OPEN` now sets `assignedToId = null` before save.
- **Escalation focal dropdown UI noise (QA)** — removed `({role_code})` from escalation focal dropdown labels in ticket detail page. The table still retains role code visibility.

### Changed
- **Version bump** — backend and frontend package versions are now `0.6.22` (patch-only increment; no x/y bump).

### Database / Migration
- No schema migration required for this patch.
- Runtime behavior change only; startup migrations remain backward compatible.

### How To Test
- Start backend and frontend normally.
- Create an `OPEN` unassigned ticket, log in as an eligible technician, verify ticket transitions to `ASSIGNED`.
- Mark all technicians absent for a type and create a ticket, verify it stays `OPEN` and unassigned.
- Move an assigned ticket back to `OPEN`, verify `assignedToId` clears.
- Open escalation dialog in ticket detail and verify dropdown shows only technician names.

### Rollback
- Revert commit `v0.6.22` to restore previous behavior.
- If rollback is partial, ensure `AuthService` calls to `assignPendingTicketsOnLogin` are removed together with the status-OPEN assignee clearing to avoid mixed workflow behavior.

## [0.6.16] - 2026-04-01 — QA Fixes: Office-Day Flicker, Attendance Categories, Self-Close, Timeline, Pantawid Auto-Assign, Email Notification

### Fixed
- **Office Days calendar flicker on click** — `toggleOfficeDay()` now does an optimistic state update (sets `officeDays` immediately), calls the API, then replaces state with the server response. Removed the `fetchOfficeDays()` + `fetchAttendance()` calls that were triggering loading spinners on every click.
- **Attendance "Support Type" label and dropdown items** — label renamed from "Support Type" to "Category". Dropdown items updated to: `All`, `ITOs`, `IT Support` (maps to `it_support_sr` + `it_support_jr`), `Desktop Support` (maps to `desktop_sr` + `desktop_jr`), `Pantawid ICT Support` (maps to `pantawid_ict`). Backend `getAttendance()`, `listTechnicians()`, and `getAvailableTechnicians()` updated with the same role mappings.
- **User self-close button missing** — "Close Ticket" button added to ticket detail page; visible to the original requester (`isRegularUser && isRequester`) when the ticket has not already been closed/duplicated/frozen. Calls `PATCH /tickets/:id` with `{ status: 'closed' }`.
- **Assign Technician dropdown empty in ticket detail** — technician filter updated to include the new role enums: `desktop_sr`, `desktop_jr`, `it_support_sr`, `it_support_jr`, `pantawid_ict`. Backend `getAvailableTechnicians()` also updated to match.
- **Assign vs Reassign dialog title mismatch** — both the ticket list page and ticket detail page now show "Reassign Ticket" / "Reassign" when a technician is already assigned, and "Assign Ticket" / "Assign" when unassigned. Dialog title, tooltip, and action button text all updated consistently.
- **Auto tag In Progress on technician view** — when the assigned technician opens the ticket detail page, the frontend calls `PATCH /tickets/:id/mark-viewed`. Backend `markTicketViewed()` transitions the ticket from `assigned` → `in_progress` and logs a `in_progress` timeline event. A `useRef` guard prevents multiple calls on re-render.
- **Pantawid tickets incorrectly not auto-assigned** — `createTicket()` now always assigns `pantawid_ict_support` tickets to the first available `PANTAWID_ICT` (or `TECHNICIAN`) user regardless of whether today is an office day. Non-Pantawid tickets retain the existing office-day guard.
- **Tickets left in Open status when technician should be available** — `createTicket()` now only leaves a ticket as `OPEN` when no qualified technician is found; if a technician is available it is always auto-assigned.

### Added
- **Ticket timeline** — new `ticket_events` table (entity `TicketEvent`) records all ticket lifecycle events: `created`, `auto_assigned`, `manually_assigned`, `status_changed`, `in_progress`, `resolved`, `closed`, `user_closed`, `comment_added`, `escalated`, `satisfaction_submitted`. New endpoints `PATCH /tickets/:id/mark-viewed` and `GET /tickets/:id/events`. Ticket detail page now shows a chronological Timeline card below the comments section.
- **Clean all staff attendance (admin reset)** — new `DELETE /attendance/all` endpoint (SUPER_ADMIN only). Calls `clearAllAttendance()` which truncates `tech_attendance` and returns `{ deleted: number }`.
- **Email notification on ticket assignment** — `EmailService.sendTicketAssignedEmail()` fires when a ticket is assigned (both auto-assign and manual assign). Sends an orange-accented HTML email to the assigned technician with ticket number, title, type, requester name, and a link to the ticket. `EMAIL_TEST_OVERRIDE` env var routes all emails to a single address for testing (currently `mjdibay@dswd.gov.ph`).

---

## [0.6.8] - 2026-03-30 — QA Fixes: Force Logout Flow, IT Staff Assign, Priority Focal-Only, Duplicate Guards, Network Access

### Fixed
- **Force logout was only triggered on page refresh, not in background** — the previous implementation redirected only when the axios interceptor caught a 401. If the user was inactive the redirect only happened on the next API call (typically a page refresh). Fix: added a 60 s heartbeat `setInterval` in `AuthContext` that calls `getProfile()`; when the token is revoked the interceptor fires within 60 s without any user action.
- **No alert when logged-out or when logging in with a deactivated account** — (a) login page now reads `?reason=session_expired` on its URL and shows a MUI `Alert` banner so users know why they were redirected. (b) `AuthService.login()` now distinguishes between "wrong password" (`Invalid email or password.`) and "account deactivated" (`This account has been deactivated. Please contact the administrator.`) errors. `AuthService.refresh()` now also explicitly rejects deactivated accounts, ensuring the heartbeat-triggered refresh fails immediately for deactivated sessions.
- **Newly created IT Staff could not be assigned tickets** — `getTechnicianAvailability` and the `@Roles` guards in the ticket controller only listed four technician role codes (`technician`, `technician_desktop`, `technician_it_support`, `focal`). The `technician_it_staff` and `technician_desktop_staff` roles were missing from every list. Fixed: all six technician roles added to availability queries and controller guards.
- **Should not be able to assign tickets to technicians with unresolved tickets** — `assignTicket` had no workload guard. Fix: the service now counts active (non-closed, non-duplicate, non-resolved) tickets for the target technician and throws a `400 Bad Request` if `busyCount > 0`. The assign dialogs in both the ticket list page and the ticket detail page now pre-filter the technician dropdown to only show those with `openCount === 0`.
- **Duplicate ticket: should not be able to assign technician** — `assignTicket` now checks `ticket.status === DUPLICATE` and throws `403` if it is.
- **Duplicate ticket: should not be able to update status** — `updateTicket` now throws `403 Forbidden` immediately if the ticket's current status is `DUPLICATE`.
- **Priority should be tagged by Technician Focal, not set automatically** — default priority on new tickets changed from `'medium'` to `null`. `Ticket.priority` column is now `VARCHAR(10) NULL DEFAULT NULL`. The New Ticket form no longer pre-fills a priority (`undefined`). Only FOCAL/REVIEWER/SUPER_ADMIN can set or change it (already enforced by `updateTicket`). Ticket chips now display "Not Set" when priority is null instead of crashing.

### Added
- **Duplicate confirmation warning modal** — before the Duplicate Picker dialog opens, a confirmation dialog now appears stating clearly that the action is permanent and cannot be undone. The user must click "Yes, Continue" before the picker is shown.
- **LAN access for external testers** — `vite.config.ts` now sets `server.host: true` so the dev server listens on `0.0.0.0`. Backend CORS now echoes the request `Origin` header (or uses the `CORS_ORIGIN` env var as a comma-separated allowlist), allowing any machine on the same network to access both frontend and API. See network access note below.
- **Session-expired redirect with reason** — `client.ts` now appends `?reason=session_expired` to the `/login` redirect URL. The login page shows a yellow alert when this parameter is present.

### Network Access
Your machine is accessible at:
- **Ethernet:** `http://192.168.50.226:3000` (frontend)
- **Wi-Fi:** `http://172.31.22.47:3000` (frontend)
- API: same IPs on port `4000`

> The `VITE_API_URL` in the frontend `.env` must point to the same IP as the server machine. You can set it to `http://192.168.50.226:4000/api` (or create a second `.env.local` file with that value) before restarting the dev server.

---

## [0.6.7] - 2026-03-31 — QA Fixes: Freeze/Duplicate Statuses, OPEN Restriction, Comment Fix, Keyword Category, FOCAL Assign, Priority Roles, Unrated Warning, 401 Refresh Guard

### Fixed
- **Comments not rendering in ticket detail** — the comments list used `{c.content}` but the `TicketComment` entity field is named `comment`. All comment bodies were `undefined`. Fixed to `{c.comment}`.
- **No live comment updates** — ticket detail page had no polling. Added a 10-second `setInterval` in a dedicated `useEffect` to silently re-fetch the ticket (including its comments) while the page is open.
- **Keyword rule Target Category not saving / displaying "—"** — the `TicketKeywordRule` frontend interface used `category` but the backend serialises the relation as `targetCategory`. The rules list always showed "—" for the target category column, and changes appeared not to save. Fixed by adding `targetCategory` to the `TicketKeywordRule` interface; display now checks `(rule.targetCategory ?? rule.category)?.name`.
- **`pantawid_ict_support` not accepted in keyword rule validation** — `updateKeywordRule` in `ticket-settings.service.ts` validated `ticketType` against only `['desktop_support', 'it_support']`, rejecting Pantawid rules with a 400. Fixed to include `'pantawid_ict_support'`.
- **Staff name change not reflected in Assign Ticket dialog** — `getTechnicianAvailability` queried the `users` table each time but used stale full-name snapshots. Additionally, users with the `focal` role and `ticketMainFocal = true` were excluded from the available technician list. Fixed: FOCAL users with `ticketMainFocal = true` now appear in the technician availability response. The dialog always fetches fresh data from the DB.
- **Reassign shows 0 open tickets** — `getTechnicianAvailability` counted `openCount` using only `status = 'in_progress'`. All tickets in `open` or `assigned` states were invisible to the count. Fixed: `openCount` now counts all statuses except `closed` and `duplicate`.
- **Force logout shows multiple "Failed to load" snackbars** — when the backend deactivates a user, all in-flight requests receive 401 simultaneously. The axios interceptor triggered a separate token-refresh attempt per request, each failing and each calling `enqueueSnackbar`. Fixed with an `isRefreshing` flag + `failedQueue` pattern: only one refresh call goes out; concurrent 401 requests are queued and resolved/rejected once the refresh completes. If there is no refresh token at all, the redirect to `/login` is immediate.

### Added
- **Ticket status `freeze`** — new `FREEZE = 'freeze'` value in the `TicketStatus` enum. Represents a ticket put on hold. Frontend status filter, status-update dropdown, and status chips all include Freeze with a `secondary` color. Database migration adds `freeze` and `duplicate` to the status ENUM and adds the `duplicate_of_id` column on first boot.
- **Ticket status `duplicate`** — new `DUPLICATE = 'duplicate'` value. Marking a ticket as duplicate requires selecting the original ticket (from the requester's open tickets). The service sets `resolvedAt` automatically and treats the status as terminal (equivalent to `closed` for most queries). A new **Duplicate Picker dialog** in the ticket detail page lists the requester's open tickets for selection.
- **OPEN status restriction** — tickets in `open` status can only transition to `freeze` or `duplicate`. Any other status change on an `open` ticket is rejected by the backend with a 400. The frontend status dropdown for `open` tickets also filters to only these two options.
- **Priority update in ticket detail** — users with `focal`, `reviewer`, or `super_admin` roles now see a Priority dropdown in the Update Ticket inline editor. The backend enforces the same restriction: only these three roles can change ticket priority via `updateTicket`.
- **Unrated ticket warning before new ticket** — when a regular user opens the New Ticket dialog, the system first checks if they have any resolved/closed tickets without a satisfaction rating. If so, a confirmation prompt appears asking them to rate first.
- **FOCAL role can assign tickets** — `assignTicket` and `getTechnicians` endpoints now include `UserRole.FOCAL` in the allowed roles list. The frontend assign button is now shown to FOCAL users as well.
- **Pantawid ICT Support type label** — `TYPE_LABELS` map added to ticket detail page; type chip now displays "Pantawid ICT Support" instead of falling back to the raw enum value.
- **`GET /tickets/requester/:requesterId/open`** — new endpoint returning all non-closed, non-duplicate tickets for a given requester, used by the Duplicate picker.

---

## [0.6.6] - 2026-03-30 — QA Fixes: Category Realtime in Modal, Force Logout on Deletion, Roles Re-seed

### Fixed
- **Disabled category still visible in open ticket modal** — The category list in the New Ticket dialog was only fetched when the dialog opened or the ticket type changed. If a super admin disabled a category while the modal was already open, the user would still see and be able to select it. Fix: added a 10-second background polling interval (`setInterval`) while the dialog is open. Categories are re-fetched silently every 10 s; disabled categories drop from the list within one polling cycle.
- **Deleted/deactivated account not immediately forced out** — `JwtStrategy.validate()` previously returned the JWT payload directly without checking the database. When a super admin deleted (deactivated) a user, their existing access token remained fully valid until it expired. Fix: `JwtStrategy.validate()` now calls `UsersService.findByIdSafe(payload.sub)` on every request and throws `UnauthorizedException` if the user is not found or `active = false`. The existing axios response interceptor on the frontend (`client.ts`) already handles 401 by attempting a token refresh; since the refresh endpoint also rejects inactive users, the chain results in token clearance and redirect to `/login` automatically.
- **Deleted custom role definition reappears on every page reload** — `UsersService.getRoles()` called `ensureRoleDefinitions()` on every invocation. Combined with the 30-second `useAutoRefresh` on the Settings page, this meant deleting a custom role caused it to reappear within 30 seconds (on the next auto-refresh poll). Fix: removed the `ensureRoleDefinitions()` call from `getRoles()`. Seeding now runs only once at module startup (in the constructor). Deliberately deleted roles remain deleted until the next backend process restart.

### Added
- `UsersService.findByIdSafe(id)` — lightweight DB lookup that returns `null` instead of throwing, used by `JwtStrategy` to avoid exception handling overhead on the hot path.

---

## [0.6.5] - 2026-03-27 — QA Fixes: Category Status Toggle, Office-Day Column Indicators, Silent Auto-Refresh

### Fixed
- **Category active/inactive toggle always showed "Inactive"** — `TicketCategoryConfig` entity used snake_case property names (`is_active`, `is_deleted`) which TypeORM serialized to JSON as-is. The frontend `TicketCategory` interface expected camelCase (`isActive`, `isDeleted`), so `cat.isActive` was always `undefined` (falsy). The edit switch was always unchecked and saving always wrote `isActive: false`. Fix: renamed entity properties to `isActive`/`isDeleted` with explicit `@Column({ name: 'is_active' })` / `@Column({ name: 'is_deleted' })` annotations; updated all service `where`-clause property references accordingly.
- **Office-day toggle not reflecting in attendance/login column headers** — Technician Attendance (tab 1) and Staff Login Activity (tab 2) column headers never consumed `officeDays` state. Non-office days showed identical styling to office days. Fix: column headers now apply `bgcolor: 'action.disabledBackground'` and `color: 'text.disabled'` for dates that are marked non-office via `isOfficeDayForDate()`.
- **Auto-refresh caused page flicker** — `useAutoRefresh` called the full fetch callbacks (which set `loading=true` → show spinner → `loading=false`), causing content to briefly disappear every 30 seconds. Fix: replaced auto-refresh calls on Attendance page and Tickets page with dedicated _silent_ callbacks (`silentRefreshOfficeDays`, `silentRefreshTab1`, `silentRefreshTab2`, `silentFetchTickets`) that update state in the background without triggering any loading spinner.

### Notes
- **Deleting seeded role definitions** — if the pre-seeded role definitions are deleted and replaced with new custom roles, attendance grids will continue to work as long as the new roles have `technicianType` set. The built-in role codes (`technician`, `technician_desktop`, etc.) remain hardcoded in `AttendanceService` and are unaffected by the `role_definitions` table.
- **Generic `technician` role** — the `technician` role is hardcoded under `pantawid_ict_support` in `AttendanceService`. Users with this role appear in "All Technicians" and in the "Pantawid ICT Support" type filter. This is expected behavior.

---

## [0.6.4] - 2026-03-27 — QA Fixes: Technician Type Tag, All-Techs Count, Super-Admin Login Activity, Calendar Cascade, Auto-Refresh

### Added
- **Role definition technician type tag** — Settings › Role Management create/edit dialogs now include a "Technician Type (Attendance)" selector (`IT Support`, `Desktop Support`, `Pantawid ICT Support`). Custom roles tagged with a technician type will have their members appear in the corresponding Technician Attendance grid, regardless of role code.
- **`technician_type` column** on `role_definitions` table — `VARCHAR(30) NULL DEFAULT NULL`; migrated via `ALTER TABLE … ADD COLUMN IF NOT EXISTS` in `ensureSchema()`.
- **`getCustomRoleValues()` helper** in `AttendanceService` — queries `role_definitions` to include custom-role users in attendance grids alongside hardcoded built-in technician roles.
- **`useAutoRefresh` hook** (`frontend/src/lib/utils/useAutoRefresh.ts`) — polls every 30 seconds and triggers an immediate refresh on `visibilitychange` (tab focus). Applied to: Attendance page (office days + technician grid + staff login grid), Tickets page, MoV Builder page, KPI page.

### Fixed
- **All Technicians count mismatch** — TypeORM QueryBuilder WHERE clause used the DB column name `u.ticket_technician` instead of the entity property name `u.ticketTechnician`. This caused the "All Technicians" dropdown count to be lower than the sum of individual type filters. Corrected in `getAvailableTechnicians` and `listTechnicians`.
- **Super admin shown in Staff Login Activity** — `getStaffLoginsMonthly` now excludes `super_admin` from the monthly login grid (added to `EXCLUDED_ROLES` alongside `user`).
- **Calendar date toggle does not cascade** — after toggling an office day ON/OFF, `fetchAttendance()` and `fetchStaffLoginStaff()` are now also called so both tabs reflect the change immediately without a manual page refresh.

### Changed
- `RoleDefinitionEntity` added to `TypeOrmModule.forFeature` in `TicketsModule` so `AttendanceService` can inject and query role definitions.
- `create-role-definition.dto.ts` gains optional `technicianType` field validated with `@IsIn(['it_support','desktop_support','pantawid_ict_support'])`.
- `UpdateRoleDefinitionDto` inherits `technicianType` automatically via `PartialType`.

---

## [0.6.1] - 2026-03-26 — QA Fixes: Nav Links, Dashboard Metrics, Role CRUD, SMTP

### Fixed
- **Nav links broken** — "Ticket Settings" and "Attendance" sidebar items navigated to the dashboard instead of their pages. Root cause: App.tsx (React Router) was missing `Route` declarations for `/dashboard/ticket-settings` and `/dashboard/attendance`. Two routes and imports added.
- **SMTP port type coercion** — `ConfigService.get<number>()` returns a raw string; `"465" === 465` evaluated to `false`, so `secure` was always `false` regardless of `.env` value. Fixed with explicit `parseInt()`. `.env` `SMTP_PORT` updated to `465` (Gmail implicit-SSL; port 587 STARTTLS blocked at network level).
- **Role CRUD — code locked to enum** — `@IsEnum(UserRole)` in `CreateRoleDefinitionDto` prevented creating roles with custom codes. Replaced with `@IsString()` + `@Matches(/^[a-z0-9_]+$/)`. `updateRoleDefinition` now allows code rename for non-system roles. System roles are protected from rename and deletion.
- **Pre-existing TS errors** — `pendingSatisfactionTickets?.length` (was used as number but typed as `Ticket[]`) and `t.openTickets` → `t.openCount` on ticket-detail page.

### Added
- **IT Help Desk Overview** on admin/staff dashboard — status breakdown tiles (open, assigned, in_progress, resolved, closed), type split (IT Support vs Desktop Support), satisfaction average, fill-rate progress bar.
- **`POST /ticket-settings/email-test`** endpoint (super_admin only) — sends a test email via configured SMTP to verify delivery. Returns `{ sent, message }`.
- **Delete custom role definitions** — `DELETE /users/roles/:value` endpoint; system roles are protected. Frontend Role Management card shows delete button for non-system roles with confirmation dialog.
- **Edit role code** — frontend Role Management edit dialog now allows renaming the code field for custom (non-system) roles.

### Changed
- `SMTP_PORT` in `.env` changed from `587` to `465` (Gmail App Password requires implicit SSL on this network).
- `CreateRolePayload.value` in `lib/api/users.ts` widened from `UserRole` enum to `string`.
- `UpdateRolePayload` in `lib/api/users.ts` now accepts optional `value` for code rename.

---

## [0.6.0] - 2026-03-26 — Ticket Categories, Auto-Shift, Auto-Assign, Email & Attendance

### Added
- **Dynamic Ticket Categories** — 10 pre-seeded categories (7 IT Support, 3 Desktop Support) with full CRUD via new Ticket Settings admin page. Categories keyed for idempotent seeding; soft-delete with reactivation on key collision.
- **Keyword-Based Auto-Shift** — New `ticket_keyword_rules` table. When a ticket is created, subject + description are scanned against keyword rules (longest match wins) to auto-set ticket type and category.
- **Attendance-Based Auto-Assign** — New `tech_attendance` and `office_days` tables. On ticket creation the system queries available technicians (by role + attendance + office-day calendar) and assigns the one with the fewest open tickets.
- **Email Notifications** — `EmailService` using nodemailer. Ticket-created email sent to requester and assigned technician (fire-and-forget). Non-attendance summary email support.
- **Attendance Management Page** — New `/dashboard/attendance` page with monthly office-day calendar (click-to-toggle, weekday defaults) and technician attendance grid (cycle through present / absent / half_day / out_of_office).
- **Ticket Settings Page** — New `/dashboard/ticket-settings` page with tabs for Categories CRUD and Keyword Rules CRUD.
- **Sidebar Navigation** — Added "Ticket Settings" (super_admin + technician roles) and "Attendance" (super_admin, focal, reviewer, technician roles) nav items.
- **Backend Endpoints**:
  - `GET/POST /ticket-settings/categories`, `GET/PATCH/DELETE /ticket-settings/categories/:id`
  - `GET/POST /ticket-settings/keyword-rules`, `GET/PATCH/DELETE /ticket-settings/keyword-rules/:id`
  - `GET/POST /attendance`, `POST /attendance/bulk`, `GET /attendance/technicians`
  - `GET/POST /attendance/office-days`, `POST /attendance/office-days/bulk`
- **13 new smoke tests** (total 37) covering categories, keyword rules, office days, attendance, auto-assign.

### Changed
- **New Ticket Dialog** redesigned with highlighted support-type cards (IT = blue, Desktop = green) and dynamic category dropdown filtered by selected type.
- **Tickets table** now includes a "Category" column.
- `ticket_categories` table gains `ticket_type` column (varchar 30, default `it_support`).
- `tickets` table gains `category_id` column (varchar 36, nullable FK to `ticket_categories`).
- `createTicket()` fully rewritten with auto-shift → auto-assign → email pipeline.
- `getTickets()` and `getTicketById()` now join and return the ticket category.

### Dependencies
- Added `nodemailer` ^6.10.1 and `@types/nodemailer` ^6.4.17.

---

## [0.5.2] - 2026-03-25 — Entity Compile Fixes & DB Schema Corrections

### Fixed
- **`ticket-category.entity.ts`** — Removed invalid `@OneToMany` back-reference to `ticket.category_config` (property was never defined on `Ticket`), eliminating a TypeScript compile error that prevented the backend from starting.
- **`ticket-issue-type.entity.ts`** — Same fix: removed orphan `@OneToMany` referencing `ticket.issue_type_config`.
- **`tickets.status` DB enum** — Added `'assigned'` to the ENUM column (was `open,in_progress,resolved,closed`); missing value caused TypeORM to silently save empty string when a ticket was assigned.
- **`tickets.reported_by_id` NOT NULL** — Legacy `reported_by_id INT NOT NULL` blocked all new ticket creation. Migration now runs `ALTER TABLE tickets MODIFY COLUMN reported_by_id INT(11) NULL` at startup.
- All smoke tests now pass cleanly end-to-end including user login, ticket list, ticket create, walk-in ticket, and assign ticket tests.

---

## [0.5.1] - 2026-03-25 — QA Fixes: Ticket Creation, User Roles, Settings UX

### Added
- Smoke tests for `user` role login, ticket list, ticket create, walk-in ticket creation, technician assign.
- Seed accounts: `desktop.tech@rictms.gov.ph`, `it.tech@rictms.gov.ph`, `user1@example.com`, `user2@example.com`.

### Fixed
- `GET /tickets` returned 403 for `user` role (guard config corrected, stale backend process killed).
- `POST /tickets` returned 400 — `CreateTicketDto` now accepts `ticketType`, `requesterId`, correct field names.
- User role now hidden from priority selector on ticket creation form.
- `handleAddComment` and `handleAssign` frontend calls fixed (were passing objects, now pass correct primitives).
- Settings page "Create User" — password field now optional for existing email accounts.

---

## [0.5.0] - 2026 — IT Help-Desk Ticketing, Role System Overhaul, User Nav Restriction

### Added
- **New `user` role** — Plain regular user created via Google sign-in (new accounts). Sees only Dashboard and Ticketing in the navigation menu.
- **New `technician_desktop` role** — Desktop Support technician; scoped to desktop-type tickets.
- **New `technician_it_support` role** — IT Support technician; scoped to IT-type tickets.
- **IT Help-Desk Ticketing Module** — Complete rewrite of the Ticketing module as a full IT help-desk system:
  - Ticket types: Desktop Support, IT Support
  - Statuses: Open → Assigned → In Progress → Resolved → Closed
  - Auto-generated ticket numbers (TKT-YYYY-NNNN)
  - Role-scoped ticket visibility (users see own, technicians see type-matched, staff see all)
  - Technician assignment dialog filtered by ticket type
  - Client Satisfaction rating (1–5 stars) for resolved/closed tickets
  - Internal notes (staff-only) on ticket comments
- **Email autocomplete in Create User** — Super Admin's "Create New User" form now suggests registered email addresses as you type.
- **User Dashboard** — Regular `user` role sees a personalised dashboard: open/in-progress/resolved/closed ticket counts, satisfaction fill-rate progress bar, "Rate Now" button.
- **`GET /users/search-email?q=`** backend endpoint for email suggestions (super_admin only).
- **`GET /tickets/dashboard`** endpoint for per-user ticket stats.

### Changed
- **Admin-created users default to `focal`** (RICTMS staff); Google sign-in for existing accounts preserves the assigned role.
- **Google sign-in new accounts** now receive the `user` role instead of `focal`.
- **Navigation sidebar**: `user` role sees only Dashboard + Tickets; Documents, Repository, Issuances, Settings, User Manual are staff-only.
- **Version reset to 0.5.0** — both `backend/package.json` and `frontend/package.json`.
- **Branch `v0.5.0`** created from `feature/kpi-mov-major-update-1.5.0.1`; set as the new main branch.
- **Role definitions** in `DEFAULT_ROLE_DEFINITIONS` extended to include all 8 roles with accurate descriptions.

### Removed / Replaced
- Old compliance-ticketing fields (`issue_type`, `category`, `unit_id`, `reported_by_id`, etc.) replaced by the new IT help-desk schema.
- Old `listIssueTypes`, `listCategories`, `setTicketTechnician` frontend API methods removed.

---

## [1.5.0.1] - 2026-03-25 — Backend startup hardening + password reset

### Fixed (QA Fix Checkpoint 22 — 2026-03-25 — Backend startup crash + TypeORM entity autoload + password reset)

#### Root cause
- Backend was not running — port 4000 was not listening, causing all API calls (login, Google sign-in) to fail silently as "Internal server error" or "Invalid credentials".
- `app.module.ts` TypeORM config used `entities: [__dirname + '/**/*.entity{.ts,.js}']` (glob pattern). At runtime the glob resolved zero entity files, so TypeORM built no entity metadata. Every repository call threw `EntityMetadataNotFoundError: No metadata for "X" was found`. This affected all modules (User, Document, TicketIssueType, MovArtifact, etc.).
- Two `onModuleInit` hooks (`TicketService`, `MovService`) called repository methods without error handling, so the unhandled `EntityMetadataNotFoundError` crashed the process before it could bind port 4000.

#### Backend
- **`autoLoadEntities: true`** added to `TypeOrmModule.forRootAsync` config in `app.module.ts`, replacing the broken glob pattern. NestJS `autoLoadEntities` registers every entity declared via `TypeOrmModule.forFeature()` automatically — no glob or explicit list required.
- **`TicketService.onModuleInit`** — wrapped `seedDefaultConfigs()` call in `try/catch`; failure is now logged as a non-fatal WARN (`Startup seeding failed (non-fatal): …`) instead of crashing the process.
- **`MovService.onModuleInit`** — added `private readonly logger = new Logger(MovService.name)` and wrapped `seedDefaultAssessmentArtifacts()` in `try/catch` with non-fatal WARN, matching the `DocumentService` pattern.

#### Database
- **Password reset** — all 4 user accounts reset to `password123` via bcrypt-10 hash generated in an isolated Node.js script (bypassing PowerShell `$` variable expansion). Hash `$2b$10$w0rNTO8B1FNZ7/7c1b2HHeONh0n4uNAXvtEGCqEbo3pYkLxymYzeu` applied to: `admin@rictms.gov.ph` (super_admin), `reviewer@rictms.gov.ph` (reviewer), `focal@rictms.gov.ph` (focal), `jmmmaguigad@dswd.gov.ph` (focal). Verified with `bcrypt.compare()` → `true`.

#### Validation
- Backend starts cleanly: `Nest application successfully started` ✅ — no crash, no unhandled `EntityMetadataNotFoundError`
- Port 4000 listening ✅
- Login test `POST /api/auth/login` with `admin@rictms.gov.ph` / `password123` → `200 OK` with `accessToken` ✅
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED`



### Fixed (QA Iteration 26 — 2026-03-24 — Remove Gmail-only restriction + Gmail registration; Google sign-in as sole registration path)

#### Backend
- **Removed `@gmail.com` domain check** from `verifyGoogleIdToken()` in `auth.service.ts`. Any Google account with a verified email is now accepted (not just `@gmail.com`).
- **Removed `POST /auth/register-gmail` endpoint** from `auth.controller.ts` and its service method `registerGmail()` from `auth.service.ts`. This route and the Gmail email+password self-registration flow are no longer available.
- Removed `RegisterGmailDto` import from controller and service.

#### Frontend
- **Login page completely simplified** (`frontend/src/app/login/page.tsx`): removed `registerMode` toggle, First Name / Last Name fields, `handleRegister`, and the "Register with Gmail" toggle button.
- **Google sign-in button always shown** (previously only shown when not in register mode). Single access point for Google users.
- **`locale="en"` added** to `GoogleLogin` component to force English UI.
- Removed "Only verified @gmail.com accounts are accepted" caption.
- Removed `authApi` import (no longer needed on login page).
- **Removed `registerGmail` API function** from `frontend/src/lib/api/auth.ts`.

#### Validation
- Diagnostics (`get_errors`): 4/4 changed files clean ✅
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED`
- Frontend build: ✅ exit code 0

### Fixed (QA Iteration 25 — 2026-03-24 — Runtime hotfix: TypeORM entity type + frontend env)

#### Root cause and fix
- **`DataTypeNotSupportedError` on `User.googleSub`:** `@Column({ name: 'google_sub', nullable: true, unique: true })` with TypeScript type `string | null` caused TypeORM to infer SQL type as `Object` (unsupported by MySQL / MariaDB). Fixed by adding explicit `type: 'varchar'` to the column decorator. This single error was preventing TypeORM from initialising entity metadata entirely, causing a cascade: database connection retries on every boot, and downstream `EntityMetadataNotFoundError` on `TicketIssueType` and `Document` during `onModuleInit` hooks.
- **`VITE_GOOGLE_CLIENT_ID` blank in frontend `.env`:** The frontend `.env` file had `VITE_GOOGLE_CLIENT_ID=` (empty), so `hasGoogleClient` evaluated to `false` and the Google sign-in button was never rendered on the login / registration page. Fixed by populating the key with the matching OAuth 2.0 client ID from the backend `.env`.

#### Validation
- Backend build: ✅ `nest build` exit code 0
- Backend startup: ✅ no `DataTypeNotSupportedError`, no `EntityMetadataNotFoundError`, port 4000 listening (PID 18176)
- Frontend build: ✅ `vite build` exit code 0
- Smoke suite: ✅ `ALL SMOKE TESTS PASSED` (login, roles, docs, units, metrics, tickets, reviews, KPI, auth-me)

### Added / Fixed (QA Iteration 24 — Google service auth + JWT tamper-hardening)

#### Google service authentication (Gmail via Google ID token)
- **Backend endpoint added:** `POST /auth/google-login` for Google ID-token sign-in.
- **Token validation:** Backend verifies Google ID token signature/claims server-side and requires verified `@gmail.com` account.
- **Frontend login integration:** Added Google sign-in on login page (when `VITE_GOOGLE_CLIENT_ID` is configured).
- **Auth context wiring:** Added `loginWithGoogle(idToken)` flow in frontend auth context and API client.

#### JWT tamper protection hardening
- **Issuer/audience enforcement on sign:** Access and refresh tokens now include configured JWT issuer/audience claims.
- **Issuer/audience enforcement on verify:** Refresh flow and JWT strategy now verify issuer/audience and lock algorithm to `HS256`.
- **Configuration keys added:** `JWT_ISSUER` and `JWT_AUDIENCE` in backend env schema/example.

#### User schema/auth-provider support
- **New user provider fields:** `auth_provider` (`local|google`) and `google_sub` added to user entity/service flow.
- **Schema safety:** `UsersService.ensureSchema()` now auto-adds provider columns and unique index for `google_sub` with `IF NOT EXISTS` semantics.
- **Identity linking behavior:** Existing local users can be linked by email to Google identity; new Google users are created with provider metadata.

#### Environment/config updates
- **Backend env entries:** added Google auth config placeholders and JWT issuer/audience defaults in `.env`/`.env.example`.
- **Frontend env entries:** added `VITE_GOOGLE_CLIENT_ID` in `.env`/`.env.example`.
- **Dependencies:** added `google-auth-library` (backend) and `@react-oauth/google` (frontend).

### Verified (QA Iteration 24)
- Backend diagnostics (`get_errors`) on changed auth/security files: ✅ no errors
- Frontend diagnostics (`get_errors`) on changed auth/login files: ✅ no errors
- `npm --prefix backend run build`: ✅
- `npm --prefix frontend run build`: ✅
- `./smoke-test.ps1`: ⚠️ blocked in local run (`Unable to connect to the remote server` at `/auth/login`; API process was not reachable in this environment)

### Migration / Rollback Notes (QA Iteration 24)
- **Migration impact:** user schema auto-extends with:
  - `auth_provider ENUM('local','google') NOT NULL DEFAULT 'local'`
  - `google_sub VARCHAR(255) NULL` (+ unique index)
- **Rollback:**
  1. Revert Google login endpoint/frontend integration and dependency additions.
  2. Revert JWT issuer/audience sign+verify constraints if needed.
  3. Optionally drop provider columns/index from `users` table after rollback.

### Added / Fixed (QA Iteration 23 — Ticketing access model + Gmail self-registration + assignment governance)

#### Ticketing module access and role distinctions
- **Changed:** Ticketing/Knowledge Base is now visible in navigation for all authenticated users.
- **Changed:** Ticket list/detail pages no longer block non-super-admin users.
- **Retained least-privilege:** issue/category metadata management remains super-admin only.

#### Gmail self-registration for ticketing users
- **Backend:** Added `POST /auth/register-gmail` endpoint.
- **Validation:** Only `@gmail.com` addresses are accepted for self-registration; password minimum remains 8.
- **Provisioning behavior:** Self-registered Gmail users are created with role `focal` by default (backward-compatible with existing role enum and guards).
- **Frontend:** Login page now includes a Gmail self-registration flow (toggle between Sign In and Register).

#### Main focal technician governance + lower-level technician assignment
- **New user flags:** `ticket_main_focal` and `ticket_technician` columns on `users` table, auto-added via `IF NOT EXISTS` in `UsersService.ensureSchema()`.
- **New assignment rule:** Only **super admin** or users tagged `ticketMainFocal=true` can assign tickets.
- **New assignment endpoint:** `PUT /tickets/:id/assign` (separate from generic ticket update endpoint).
- **New technician roster endpoints:**
  - `GET /tickets/technicians/list`
  - `GET /tickets/technicians/candidates`
  - `PATCH /tickets/technicians/:id` (set/unset lower-level technician)
- **Eligibility rule:** Lower-level technicians must be active, non-super-admin, and Gmail-registered (`@gmail.com`).
- **Safety hardening:** Generic `PUT /tickets/:id` no longer mutates `assigned_to_id`; assignment is controlled exclusively by the governed endpoint.

#### Settings module: why “Add Role Definition” appears disabled for super admin
- **Root cause confirmed:** Role Definition creation is limited to existing `UserRole` enum values; when all enum codes are already present, no additional role code is available.
- **UX improvement:** Added explicit helper text in Settings > System Role Definitions when the Add button is disabled (`all predefined role codes are already in use`).

### Verified (QA Iteration 23)
- Backend diagnostics (`get_errors`) on changed backend files: ✅ no errors
- Frontend diagnostics (`get_errors`) on changed frontend files: ✅ no errors
- `cd frontend && npm run build`: ✅
- `.\smoke-test.ps1`: ✅ all smoke tests passed

### Migration / Rollback Notes (QA Iteration 23)
- **Migration impact:** two new user columns auto-added on startup:
  - `ticket_main_focal TINYINT(1) NOT NULL DEFAULT 0`
  - `ticket_technician TINYINT(1) NOT NULL DEFAULT 0`
- **Rollback:**
  1. Revert auth register endpoint (`/auth/register-gmail`) and login-page registration UI.
  2. Revert ticket assignment governance endpoints and controller/service checks.
  3. Drop user columns if required: `ALTER TABLE users DROP COLUMN ticket_main_focal; ALTER TABLE users DROP COLUMN ticket_technician;`
  4. Revert ticket navigation visibility and Settings helper text changes.

### Added / Fixed (QA Iteration 22 — Print separator margin fix + signature block + positionFull user field)

#### Separator line overflow fix
- **Root cause:** `─` (U+2500) character advance width in print fonts is not constant — it varies by renderer and cannot be reliably counted to hit an exact pixel boundary. Any character-count-based separator will either overflow or fall short.
- **Fix:** Removed `FOOTER_SEPARATOR` (`─` char string) from the CSS `content` value. Restored `border-top: 1px solid #9ca3af` on `@bottom-center` margin box. CSS constrains the border to exactly the margin box content zone (between left and right page margins) with zero overflow in all browsers.
- **Also added:** `border-top: 1px solid #9ca3af` to `@page :first { @bottom-center { ... } }` override so the first-page footer has the same separator.

#### Spacing after main document title
- Added `h2 { margin-bottom: 10px !important; }` to the print CSS block. The report title is rendered as `<h2>` in the backend HTML; the previous blanket `margin: 0 !important` suppressed all spacing below it. The 10px bottom margin is applied only for `h2` and only in the print iframe.

#### Print-only signature block — Prepared by / Approved by
- Added 6 new state variables: `preparedByName`, `preparedByPosition`, `preparedByDesignation`, `approvedByName`, `approvedByPosition`, `approvedByDesignation`.
- `useEffect` auto-fills the "Prepared by" section from the current logged-in user's `firstName`+`lastName`, `position`, and `designation` on page load.
- `buildPrintHtml()` injects a `<div>` signature block after the report body when any signature field is non-empty. The block is a two-column table ("Prepared by" left / "Approved by" right), each column showing: label, 36pt blank space for physical signature, underline, NAME in all-caps bold, POSITION / DESIGNATION below.
- Signature fields are included in print preset `metadata_json` (`prepared_by_name`, `prepared_by_position`, etc.), so save/load preserves the signature configuration.
- Report Settings accordion now contains a "Signature Block (print-only)" section with 6 TextFields, auto-filled from the current user.

#### `positionFull` database column and user management field
- **Why:** The `position` field stores the abbreviated position (e.g., "ITO I"); a second field `positionFull` stores the official full text (e.g., "Information Technology Officer I") for use in payslips, official documents, and records.
- **DB:** `ALTER TABLE users ADD COLUMN IF NOT EXISTS position_full VARCHAR(255) NULL` added to `users.service.ts` `ensureSchema()`. Zero-downtime, backward-compatible.
- **Backend entity:** `@Column({ name: 'position_full', nullable: true }) positionFull: string;` added to `User` entity.
- **DTOs:** `positionFull?: string` added to `CreateUserDto`; `UpdateUserDto` inherits via `PartialType`.
- **Service:** `create()` and `update()` now persist/update `positionFull`.
- **Auth login response:** `positionFull: user.positionFull` added to the login and `getProfile` return.
- **Frontend types:** `positionFull?: string` added to `User` interface (`lib/types/auth.ts`), `UserRecord`, `CreateUserPayload`, `UpdateUserPayload` (`lib/api/users.ts`).
- **Settings UI:** Create and Edit user dialogs now show a "Full Position Title" field (helperText: "e.g. Information Technology Officer I") between the "Position (Abbreviated)" and "Designation" fields. Position field helperText updated to "e.g. ITO I".

### Verified (QA Iteration 22)
- `cd backend && npx tsc --noEmit` ✅ (0 errors)
- `cd frontend && npm run build` ✅ (built in 20.36s)
- `.\smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 22)
- **Migration impact:** `position_full VARCHAR(255) NULL` column added automatically on backend startup via `IF NOT EXISTS` guard. No manual migration needed.
- **Rollback:** Remove `positionFull` from entity, DTO, and service. Drop column manually: `ALTER TABLE users DROP COLUMN position_full;`. Revert `buildPrintHtml()` separator and signature block changes in `mov/page.tsx`.

### Fixed (QA Iteration 21 — Print CSS specificity hardening: body margin, summary-block, table margin)
- **`body { margin: 24px; }` extracted style override fixed:** All backend report HTML contains `body { margin: 24px; }` in inline `<style>` tags. These extracted styles are re-injected into the print document after our reset CSS; without `!important`, the later rule won and added 24px whitespace on all body sides. Fixed by adding `!important` to `html, body { margin: 0 !important; padding: 0 !important; }`.
- **`.summary-block` line-height corrected:** Backend `mov.service.ts` defines `.summary-block { margin: 8px 0 16px; line-height: 1.8; }` on a `<div>` element. Our previous `p, h1-h6 { line-height: 1.15 !important; }` reset did not target `div` elements. Added explicit `.summary-block { margin: 0 !important; line-height: 1.15 !important; }` override in the print CSS block after the paragraph reset.
- **`table { margin: ... }` override fixed:** Extracted styles from reports include `table { margin: 10px 0 4px; }` and `table { margin: 10px 0 20px; }`. Added `margin: 0 !important;` to the print CSS table rule so extracted table margins cannot add vertical spacing in print.
- **Scope:** frontend only (`buildPrintHtml()` CSS block in `mov/page.tsx`); no backend or DB changes.

### Verified (QA Iteration 21)
- `cd frontend && npm run build` ✅ (built in 15.39s)
- `.\smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 21)
- **Migration impact:** no DB migration required.
- **Rollback:** remove the three `!important` additions and `.summary-block` override from `buildPrintHtml()` CSS block.

### Fixed (QA Iteration 20 — Footer separator single line, logo ratio, initial line-height pass)
- **Footer border-top removed:** the `border-top: 1px solid #9ca3af` on `@bottom-center` created a double-line (border + `─` separator). Removed `border-top`; only the embedded `─` separator is used after `Page X of Y`.
- **Separator character count recalculated:** `─` (U+2500) has ~0.56em advance width in print fonts (not 1em). Recalculated: 768pt landscape content zone / (8pt × 0.56) ≈ 168 chars; portrait: 114 chars.
- **DSWD logo height:** H1 (DSWD) changed to 39px = 87% of H2 (Bagong Pilipinas) 45px.
- **DSWD logo vertical alignment:** `vertical-align:middle` added to both `<img>` elements; flex container `align-items:center` already present but inline img default `vertical-align:baseline` was misaligning logos.
- **Line-height 1.15 first pass:** `.print-root { line-height: 1.15; }` and `p, h1-h6 { margin: 0 !important; line-height: 1.15 !important; }` added.

### Verified (QA Iteration 20)
- `cd frontend && npm run build` ✅
- `.\smoke-test.ps1` ✅

### Fixed (QA Iteration 19 — Same-file image re-upload + separator width landscape)
- **Same-file re-upload fixed:** browser suppresses `onChange` for an input when the selected file path matches the previous value. Added `e.target.value = ''` after reading the file in `handleImageUpload()`, allowing the same file to be re-selected after clearing.
- **Separator width updated for landscape:** corrected from portrait-oriented width to landscape-appropriate value.

### Verified (QA Iteration 19)
- `cd frontend && npm run build` ✅
- `.\smoke-test.ps1` ✅

### Fixed (QA Iteration 18 — Header images in print + save/load presets + black background + separator order)
- **Header images in print:** `buildPrintHtml()` now prepends a flex-row header with H1 (DSWD logo) and H2 (Bagong Pilipinas logo) before report body when images are uploaded. Images compressed via canvas JPEG (max 400px, 75% quality, white prefill to prevent black backgrounds on transparent PNGs).
- **Print preset save/load/delete:** `handleSavePreset`, `handleLoadPreset`, `handleDeletePreset` handlers added. Presets stored as `MovArtifact` with `artifact_type: 'print_settings'`; fields in `metadata_json`. `loadData()` fetches and sets `printPresets`.
- **Preset save DTO fix:** `period_year: new Date().getFullYear()` (DTO requires `@Min(2000)`); `content_markdown: 'print_settings'` (DTO requires `@IsNotEmpty()`).
- **Black logo background fixed:** canvas JPEG has no alpha; `ctx.fillStyle = '#ffffff'; ctx.fillRect(0, 0, w, h)` prefill added before `drawImage`.
- **Separator order corrected:** embedded `─` separator placed after `Page X of Y` counter string; `border-top` removed.

### Verified (QA Iteration 18)
- `cd frontend && npm run build` ✅
- `.\smoke-test.ps1` ✅

### Fixed (QA Iteration 17 — CSS @page margin-box footer replacing JS overlay approach)
- **Root cause resolved: JS overlay approach abandoned.** Hidden iframes render at `width:0; height:0`, so `root.scrollHeight` reflects 0-width content reflow (not landscape A4 layout), making `pageHeightPx` and the derived footer `top` values inaccurate. This is why the footer appeared at unstable/incorrect positions even when total-page count seemed correct.
- **CSS `@page @bottom-center` margin box used instead.** The browser's print engine evaluates `counter(page)` and `counter(pages)` in margin boxes correctly, places the footer in the actual margin zone on every page, and requires zero DOM measurement.
- **Landscape retained:** `@page { size: A4 landscape; }` with `margin: 1in 0.5in 1in 0.5in`.
- **First-page separate footer** uses `@page :first { @bottom-center { content: ...; } }`.
- **Page-number offset** (`startPage`) supported via CSS `counter-reset` on `<html>` element when `startPage != 1`.
- **Footer body text** from multi-line footer input is embedded as a CSS content string with `\A` newlines after the `Page X of Y` line.
- **Footer separator** rendered via `border-top: 1px solid #9ca3af` on the `@bottom-center` margin box.
- **Removed:** `.print-overlays`, `.print-page-footer` DOM elements, all JS geometry calculation and footer injection script.

### Verified (QA Iteration 17)
- `cd frontend && npm run build` ✅
- `.\smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 17)
- **Migration impact:** no DB migration required.
- **Rollback:** revert `buildPrintHtml()` in `frontend/src/app/dashboard/mov/page.tsx` to restore JS overlay approach (not recommended; the root cause is the 0-width iframe measurement problem).

### Fixed (QA Iteration 16 — Landscape orientation + footer inside content zone + row-break hardening)
- **Landscape print orientation:** `@page { size: A4 landscape; }` applied; A4 height constant updated to `210mm` (landscape short axis) so page-height math is correct for landscape pages.
- **Footer top calculation corrected:** footer overlays now placed at `i * pageHeightPx - footerHeight - 4px` (bottom of each page's content area) instead of the previous formula that pushed footers past the content zone into the inaccessible margin zone, which caused random / missed placement.
- **Row page-break rules hardened:** `table`, `tr`, `td`, and `th` now carry `page-break-inside: auto !important; break-inside: auto !important;` to prevent the document's extracted styles from overriding the row-split permission.
- **Unused JS variables cleaned:** removed `bottomMarginPx` and `footerStartFromBottomPx` from the injected print script.

### Verified (QA Iteration 16)
- `cd frontend && npm run build` ✅
- `.\smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 16)
- **Migration impact:** no DB migration required.
- **Rollback:** revert `frontend/src/app/dashboard/mov/page.tsx` — restore `A4_HEIGHT_MM = 297`, `size: A4`, old footer top formula, and remove `!important` flags.

### Fixed (QA Iteration 15 — Revert-overreach + print page-margin/footer-area targeted fix)
- **Rollback of overreaching print layout edits:** removed content-container width forcing and aggressive dynamic layout shifts that degraded report print structure.
- **Page-margin-first strategy applied:** print now targets A4 with page-level margins (`left/right = 0.5in`, `top/bottom = 1in`) instead of changing report content container spacing.
- **Footer-area anchoring refined:** footer top is now computed from bottom margin geometry (`0.5in` up from page bottom baseline), then expanded upward according to measured footer height.
- **Dynamic bottom reserve retained but constrained:** bottom page margin now grows only when footer body lines require extra space, preventing content overlap while preserving prior content placement behavior.

### Verified (QA Iteration 15)
- `cd frontend && npm run build` ✅
- `./smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 15)
- **Migration impact:** no DB migration required.
- **Rollback:** revert `frontend/src/app/dashboard/mov/page.tsx` print-margin/footer-band calculations from this iteration.

### Fixed (QA Iteration 14 — A4 footer placement + dynamic margin-reserve alignment)
- **A4 print geometry aligned:** MoV print now uses A4 with explicit `0.5in` side margins and `1in` top/bottom baseline margins.
- **Footer zone placement corrected:** footer overlays are now anchored into the bottom margin zone (starting from `0.5in` up from page bottom), instead of drifting into content flow.
- **Dynamic footer reserve added:** when footer has multiple lines, bottom print margin is expanded automatically so content area adjusts and avoids overlap.
- **Header offset alignment improved:** first-page header block is offset toward the top margin region to align with `0.5in` header-start guidance.
- **Row split behavior retained for print:** table rows remain breakable across pages (`page-break-inside: auto`) to minimize whitespace caused by whole-row pushes.

### Verified (QA Iteration 14)
- `cd frontend && npm run build` ✅
- `./smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 14)
- **Migration impact:** no DB migration required.
- **Rollback:** revert MoV print A4 margin constants, dynamic bottom-margin reserve, and per-page footer top-offset calculations from this iteration.

### Fixed (QA Iteration 13 — Remarks bullet readability + viewer display-title enforcement + MoV pagination formatting)
- **Automated flagged checks now clearly bulleted:** auto-review remarks now emit explicit bullet-prefixed lines and frontend remarks rendering preserves multiline formatting for readability.
- **Viewer display-name enforcement for existing HTML previews:** HTML preview rendering now normalizes filename-like headings to the configured display title in addition to backend fallback-title improvements.
- **MoV footer pagination formatting adjusted:** footer input now accepts first-line page token (`1` or `Page 1`), then renders pagination line (`Page X of Y`), separator line, and footer body text; first-page note follows the same format when separate first-page footer is enabled.

### Verified (QA Iteration 13)
- `cd backend && npm run test -- src/modules/metrics/engines/property-check.engine.spec.ts src/modules/metrics/engines/date-check.engine.spec.ts` ✅
- `cd backend && npm run build` ✅
- `cd frontend && npm run build` ✅
- `./smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 13)
- **Migration impact:** no DB migration required.
- **Rollback:** revert metrics remarks formatting update, document remarks rendering/UI multiline styles, HTML preview title-normalization changes, and MoV footer/pagination formatting changes in this iteration.

### Fixed (QA Iteration 12 — Metric comparison granularity + document detail fixes + MoV print fidelity)
- **Number extraction failure remarks simplified:** automated return remarks for `property_check` now prioritize failed extracted-number comparisons (keyword + actual + operator + expected) instead of verbose summaries.
- **Per-keyword comparisons supported:** metric templates for `Number Extraction` now support one comparison per keyword (`>=`, `<=`, `>`, `<`, `=`), aligned with per-keyword expected numbers.
- **Document viewer display-name priority hardened:** preview fallback headers now prefer display-oriented fields before filename fallback.
- **Document detail unit label fixed:** removed empty `()` rendering when unit code is not present.
- **Download visibility restored for focal workflow:** focal users can now download current document version directly from document details, including returned items.
- **MoV print footer/header/table styling refined:** footer centered with page-number separation lines, first-page header left aligned, print typography normalized, and table headers forced to sky-blue in app preview and print output.

### Verified (QA Iteration 12)
- `cd backend && npm run test -- src/modules/metrics/engines/property-check.engine.spec.ts src/modules/metrics/engines/date-check.engine.spec.ts` ✅
- `cd backend && npm run build` ✅
- `cd frontend && npm run build` ✅
- `./smoke-test.ps1` ✅ (all smoke tests passed)

### Migration / Rollback Notes (QA Iteration 12)
- **Migration impact:** no DB migration required.
- **Rollback:** revert updates in metrics engine/service, metrics template builder UI, document detail page, preview processor, and MoV print styling in this iteration.

### Fixed (QA Iteration 11 — Documents UX + Google Docs import + MoV print layout)
- **Document view decluttered:** removed header Refresh action and removed visible Version History panel from the document detail page.
- **Compliant focal download path preserved:** focal users now get a direct `Download` action in document detail when the document is compliant.
- **Return remarks urgency improved:** return remarks banner now uses a high-emphasis filled error style for stronger visibility in light/dark themes.
- **Viewer display-name clarity:** HTML fallback preview header now explicitly renders the document display name label (not filename wording).
- **Google Docs upload option added:** new URL-based import flow (`POST /documents/google-doc`) exports a Google Doc to `.docx` server-side and routes it through the same upload/validation/metrics/preview pipeline.
- **MoV print fidelity improved:** print output now uses page-attached footer styling, first-page header anchoring, and stronger table print borders with repeating table header/footer groups.

### Verified (QA Iteration 11)
- `cd backend && npm run build` ✅
- `cd frontend && npm run build` ✅
- `cd backend && npm run test -- src/modules/metrics/engines/property-check.engine.spec.ts src/modules/metrics/engines/date-check.engine.spec.ts` ✅

### Migration / Rollback Notes (QA Iteration 11)
- **Migration impact:** additive API only (`POST /documents/google-doc`), no destructive DB/schema changes.
- **Rollback:** revert `frontend/src/app/dashboard/documents/[id]/page.tsx`, `frontend/src/components/documents/DocumentUpload.tsx`, `frontend/src/lib/api/documents.ts`, `frontend/src/app/dashboard/mov/page.tsx`, and backend `documents` controller/service/preview processor updates from this iteration.

### Fixed (QA Iteration 10 — Upload unblocks + metrics auto-run + archived tab table parity)
- **Upload no longer hangs on fallback:** upload now returns immediately and continues processing in background; endpoint is no longer blocked by inline fallback execution.
- **DOCX auto-metrics at upload:** when initial DOCX text extraction succeeds during upload, document is set to `READY` and metrics are kicked off immediately (no dependency on `process-document` queue consumption for this path).
- **Queue watchdog fallback:** when jobs are enqueued but not consumed in time, watchdog fallback triggers inline processing/metrics to prevent silent no-op queue states.
- **Response payload trimmed:** upload now returns a freshly loaded document entity (without heavy blob-bearing in-memory payload), improving client responsiveness.
- **Archived tab table parity:** archived tab now uses explicit archived-table mode with archived-relevant columns (`Title`, `Type`, `Period`, `Status`, `Return Remarks`, `Archived Date`) and no action clutter.
- **Archived UX loading behavior:** archived query now uses placeholder/stale cache strategy to avoid spinner-first flashes and settle quickly to either rows or empty state.
- **Verified with provided file:** `cybersecurity_incident_summary_report_202603.docx` upload returns in ~0.18s and auto-produces metric results with expected failure (`Users Trained: 1` vs expected `>= 10`) leading to `needs_revision`.

### Fixed (QA Iteration 9 — Documents tabs + queueless metrics fallback)
- **Documents UX cleanup (requested):** focal users now manage documents in a single page with two tabs in `Documents` — **Active Documents** and **Archived Documents** — instead of navigating to a separate archived route.
- **Archived flow retained:** existing archive behavior is unchanged; archived records are now shown through the archived tab (`archived=true`) in the same table view.
- **Metrics processing when Redis is down:** `DocumentService` now performs explicit Redis reachability checks before queueing jobs. If Redis/Bull is unavailable, processing automatically falls back to inline execution:
  - inline extraction + status transition (`PENDING/PROCESSING` → `READY`)
  - inline metrics computation
  - inline auto-review creation (`NEEDS_REVISION`) when metrics fail
- **Centralized metrics + auto-review logic:** moved into `MetricsService.computeMetricsAndAutoReview(versionId)` and reused by both Bull processor and inline fallback path to keep behavior consistent.
- **Queue outage hardening scope:** upload path, startup recovery path, and manual reprocess path all now use enqueue-or-fallback behavior.
- **Operational note:** runtime validation is currently blocked by an existing `TicketIssueType` metadata startup crash in this environment (`EntityMetadataNotFoundError`), unrelated to these QA 9 diffs.

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

---

## QA Iteration 11 - Documents/Repository/Knowledge Base/MoV Hardening (2026-03-11)

### Added / Changed
- Document viewer now consistently uses display title context instead of raw filename for HTML preview headers.
- Document detail viewer heading now shows the document display name.
- Period rendering normalized to avoid redundant values like `2026-202603` (now rendered as `2026-03`).
- Upload invalid-filename toast simplified to a concise expected filename message.
- Upload form now includes Google Docs guidance (download as `.docx` or `.pdf` before upload).
- Archived return-remarks styling improved for readability in both light and dark themes.
- Repository now includes compliant documents only (non-compliant/needs-revision excluded).
- Sidebar item renamed from **Issues** to **Knowledge Base** and restricted to super-admin visibility.
- Knowledge Base list/detail pages now enforce super-admin-only access.
- MoV generated report preview now forces dark-mode-safe text contrast on white report canvas.

### Metrics Reliability / Explainability
- Date metric period parsing now supports compact monthly/quarter formats (`YYYYMM`, `YYYYMM-MM`) to fix deadline inference reliability.
- Property number extraction improved to capture nearest relevant numeric value instead of incidental numbers.
- Metric failure messages now include explicit actual vs expected details for keyword/number/date checks.

### Validation
- Backend unit tests passed:
  - `src/modules/metrics/engines/property-check.engine.spec.ts`
  - `src/modules/metrics/engines/date-check.engine.spec.ts`
- Frontend build passed (`npm run build`).
- Backend build passed (`npm run build`).
