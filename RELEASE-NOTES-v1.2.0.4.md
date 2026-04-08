# RICTMS Compliance Hub — Release Notes v1.2.0.4

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
