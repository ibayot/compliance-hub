# Capability Matrix Hardcoded Permission Audit (2026-04-29)

## Scope
- Backend: `backend/src/**/*.ts`
- Frontend: `frontend/src/**/*.{ts,tsx}`

## Search Patterns
- Backend: `@Roles(`, `roleCode`, `user.role`, `req.user.role`
- Frontend: `user?.role`, `user.role`, `roleCode`, `roles: [`

## Findings Summary
- Backend hardcoded-role pattern matches: **217**
- Frontend hardcoded-role pattern matches: **96**

## Highest-Concentration Backend Files
- `backend/src/modules/tickets/controllers/ticket.controller.ts` (30)
- `backend/src/modules/users/users.service.ts` (30)
- `backend/src/modules/documents/controllers/document.controller.ts` (19)
- `backend/src/modules/kpi/controllers/kpi.controller.ts` (18)
- `backend/src/modules/auth/auth.service.ts` (15)
- `backend/src/modules/tickets/controllers/ticket-settings.controller.ts` (15)
- `backend/src/modules/tickets/controllers/attendance.controller.ts` (14)
- `backend/src/modules/users/users.controller.ts` (14)
- `backend/src/modules/references/controllers/issuance.controller.ts` (11)
- `backend/src/modules/mov/controllers/mov.controller.ts` (11)

## Highest-Concentration Frontend Files
- `frontend/src/components/layout/Sidebar.tsx` (27)
- `frontend/src/app/dashboard/user-manual/page.tsx` (16)
- `frontend/src/app/dashboard/page.tsx` (10)
- `frontend/src/app/dashboard/documents/page.tsx` (8)
- `frontend/src/app/dashboard/settings/page.tsx` (7)
- `frontend/src/app/dashboard/tickets/page.tsx` (7)
- `frontend/src/app/dashboard/attendance/page.tsx` (5)
- `frontend/src/app/dashboard/kpi/page.tsx` (3)
- `frontend/src/app/dashboard/issuances/page.tsx` (3)

## Conversion Done In This Pass
- Expanded role capability matrix with module-level flags:
  - `isKpiAccess`, `isKpiManage`
  - `isAttendanceAccess`, `isAttendanceManage`
  - `isReportsAccess`, `isReviewsAccess`, `isMovAccess`
  - `isDocumentsAccess`, `isRepositoryAccess`
  - `isIssuancesAccess`, `isMetricsAccess`
- Added backend guard/service support for these capability keys.
- Added schema bootstrap and default seeding logic for new flags.
- Converted UI navigation and page-level gates for KPI/Attendance/Reports/Reviews/MoV/Documents/Repository to matrix-driven checks.

## Remaining High-Value Migration Targets
- `backend/src/modules/tickets/controllers/ticket.controller.ts`
- `backend/src/modules/documents/controllers/document.controller.ts`
- `backend/src/modules/references/controllers/issuance.controller.ts`
- `backend/src/modules/mov/controllers/mov.controller.ts`
- `frontend/src/app/dashboard/tickets/page.tsx`
- `frontend/src/app/dashboard/page.tsx`
- `frontend/src/app/dashboard/issuances/page.tsx`

## Recommended Next Step
- Introduce `@RequireCapability(...)` + `CapabilityGuard` systematically for remaining backend controllers, then remove most `@Roles(...)` lists except `super_admin`-only endpoints.
