# RICTMS Compliance Hub — Release Notes v1.2.0.4

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
