# RICTMS Compliance Hub — Release Notes v1.2.0.4

## Hotfix Addendum — v0.0.14 (2026-04-14)

### What Changed
- Replaced remaining active runtime/config/script DB defaults from `rictms_compliance` to `compliance_hub`.
- Added/standardized split DB env keys for users/ticketing/compliance routing in backend env templates.
- Corrected gateway ownership for attendance routes: `/api/attendance` now proxies to users service.
- Removed attendance controller exposure from ticketing service module.
- Added users-service attendance module wiring so attendance APIs are served by users service.
- Removed auth static dependency that pulled ticket routes into users-service context.
- Added users-service fallback handling for partial DB object states affecting user-unit relation joins.
- Patch-only version bump to `0.0.14`.

### Why It Changed (QA Link)
- QA required closure of remaining runtime DB-name legacy references that can affect service boot/runtime behavior.
- QA required strict route ownership placement so attendance APIs are served by users service, not ticketing service.

### How To Test
- Build backend and frontend; run backend tests.
- Start gateway + users + ticketing + compliance services.
- Verify gateway attendance access resolves against users service.
- Verify direct ticketing `/api/attendance` returns `404` (route no longer owned by ticketing).

### Migration Steps
- No new code migration in this patch.
- Ensure split-schema DB objects/views (`compliance_hub`, `compliance_hub_users`, `compliance_hub_ticketing`) are present before runtime verification.

### Rollback Steps
- Revert `v0.0.14` commit and redeploy backend/frontend services.

## Hotfix Addendum — v0.0.13 (2026-04-14)

### What Changed
- Added 15-minute inactivity lock in frontend session management.
- Added password re-entry unlock flow for local-auth users.
- Added backend `POST /auth/reauthenticate` endpoint for secure session unlock validation.
- Added `authProvider` field to auth profile payload for provider-aware frontend lock handling.
- Added deployment and QA/system documentation artifacts:
  - `deployment.md`
  - `INHOUSE-QA-USER-STORIES.md`
  - `MAIN-SYSTEM-DOCUMENTATION.md`
- Patch-only version bump to `0.0.13`.

### Why It Changed (QA Link)
- QA required a strict 15-minute inactivity rule with password re-entry before session continuation.
- QA required explicit deployment/install documentation and complete in-house system documentation deliverables.

### How To Test
- Login as local-auth user, stay idle for 15 minutes, verify lock dialog and unlock with valid password.
- Login as Google-auth user, stay idle for 15 minutes, verify sign-in-again behavior.
- Build backend and frontend, then run backend tests.

### Migration Steps
- No schema migration required.

### Rollback Steps
- Revert `v0.0.13` commit and redeploy backend/frontend.

## Hotfix Addendum — v0.6.23 (2026-04-08)

### What Changed
- Enforced present-only technician pool for automatic assignment logic.
- On status revert to `OPEN`, ticket assignee is cleared.
- After revert to `OPEN`, system immediately auto-assigns if eligible PRESENT technician is available.
- Patch-only version bump to `0.6.23`.

### Why It Changed (QA Link)
- QA required auto-assignment to be disabled if there are no PRESENT technicians.
- QA required OPEN revert to remove assigned technician.
- QA required OPEN revert to auto-assign when availability exists.

### How To Test
- Validate create-ticket auto-assignment with all technicians absent (should remain unassigned).
- Validate OPEN revert clears assignee.
- Validate OPEN revert assigns ticket when present technician with zero active workload exists.
- Run backend build, frontend build, backend unit tests, and smoke script.

### Migration Steps
- No schema migration required.

### Rollback Steps
- Revert `v0.6.23` commit and redeploy backend/frontend.

## Hotfix Addendum — v0.6.22 (2026-04-08)

### What Changed
- Added login-triggered pending ticket assignment (`assignPendingTicketsOnLogin`) for both password and Google login flows.
- Corrected Pantawid auto-assignment candidate selection to attendance-aware availability to prevent assignment to absent technicians.
- Ensured tickets stay unassigned when all relevant technicians are absent.
- Enforced assignee clearing when ticket status is moved back to `OPEN`.
- Simplified escalation focal dropdown labels to display names only.

### Why It Changed (QA Link)
- QA required immediate assignment when open tickets exist before technician login.
- QA reported auto-assignment to absent technicians and required strict absent-tech exclusion.
- QA required reopening a ticket to remove current assignment.
- QA required removing role-code duplication in escalation focal dropdown display.

### How To Test
- Create an OPEN unassigned ticket; log in as an eligible technician; verify assignment occurs after login.
- Mark all technicians absent for a support type; create ticket; verify ticket remains OPEN and unassigned.
- Move an assigned ticket back to OPEN; verify assigned technician is cleared.
- Open escalation dialog; verify dropdown entries show names only.

### Migration Steps
- No database migration required.
- Deploy backend and frontend `0.6.22` builds.

### Rollback Steps
- Revert the `0.6.22` commit(s) and redeploy backend/frontend.
- Re-run smoke test to confirm restored behavior.

**Release Date:** 2026-02-26  
**Tag:** `v1.2.0.4`

## Summary
This release introduces a full KPI Monitoring module with role-scoped dashboard aggregation, strengthens user/role administration in Settings, and aligns database seed/schema/docs with the new feature set.

## Highlights
- Added KPI module in backend (`/api/kpi/*`) with:
  - KPI Master management
  - KPI Monitoring input/update/lock
  - KPI Dashboard summary + per-unit views
  - KPI lookup table endpoints (thresholds, scoring rules)
- Added frontend KPI workspace at `Dashboard → KPI` (`/dashboard/kpi`)
- Added sidebar entry for KPI with role-aware visibility

## KPI Data Model Changes
- KPI Master uses `unit_id` (linked to Units table)
- Removed `min_value` and `max_value` from KPI Master
- KPI Monitoring stores:
  - `entered_by_staff_id`
  - `entered_by_name`
- Removed `submitted_at` from KPI Monitoring
- KPI Monitoring status is constrained to:
  - `draft`
  - `locked`

## User and Role Management
- Existing users are now editable for profile + unit assignments
- `staff_id` is immutable after creation (UI-disabled + API-rejected on update)
- Added persisted system role definitions via `role_definitions` with add/edit support in Settings

## Security and Access Behavior
- KPI endpoints enforce role and unit visibility on the server
- Focal users are restricted to allowed unit scope in KPI dashboard data
- Super admin controls KPI lookup table maintenance

## Database and Seed Updates
Updated scripts under `backend/src/database/`:
- `schema.sql`
- `seed.sql`
- `seed-data.sql`
- `init.sql`

Added/updated KPI and role tables:
- `kpi_master`
- `kpi_monitoring`
- `kpi_thresholds`
- `kpi_scoring_rules`
- `role_definitions`

## Validation and Smoke
Validated for this release:
- Frontend `npx tsc --noEmit`
- Frontend `npm run build`
- Backend `npx tsc --noEmit`
- Backend `npm run build`
- Auth + KPI summary API smoke
- User update + staff ID immutability check

## Documentation Updated
- `CHANGELOG.md`
- `README.md`
- `CAPABILITIES.md`
- `INSTALLATION.md`
- `WALKTHROUGH.md`
- `QA-USER-MANUAL.md`
- `.bmad/02_ARCH.md`

## Notes
If upgrading an existing local database, apply `schema.sql` then reseed via `seed.sql` (or `seed-data.sql`) before smoke-testing KPI endpoints.
