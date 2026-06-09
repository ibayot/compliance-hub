# MASTER CONTEXT — Compliance Hub

> **Keeper file.** Updated on EVERY architectural, schema, convention, or significant code change.
> Current version: **v0.0.31** | Last updated: **2026-04-16**

---

## 1. Project Overview

**Compliance Hub** is an internal ICT compliance and help-desk management application for the
DSWD-RICTMS (Regional ICT Infrastructure and Monitoring Service) division. It manages:
- ICT compliance document submissions, review workflows, and reportorial tracking
- KPI monitoring, Means of Verification (MoV) artifacts, and compliance reports
- Help-desk ticketing: IT support, desktop support, and Pantawid ICT support
- Attendance tracking for ITO professional staff and technicians
- Cybersecurity and information security incident management
- Organization unit management and user/role directory
- Document repositories with version history, preview generation, and metrics extraction
- Issuance management (ICT-referenced issuances from government bodies)

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React + TypeScript | Runs at :3000 |
| UI Library | Material UI (MUI) v5 | Theming via ThemeModeContext |
| Backend | NestJS (TypeScript) — 3 microservices | Monorepo in `/backend/` |
| Database | MariaDB (MySQL-compatible) — XAMPP local / Docker prod | 3 databases |
| ORM | TypeORM | `DB_SYNCHRONIZE=false` — all schema changes are manual SQL |
| Auth | JWT (access + refresh) + optional Google OAuth (ID token) | |
| Queue | Bull (Redis-backed) | Document preview/text extraction |
| File Storage | Local filesystem (`./storage`) or AWS S3 | Configurable via env |
| API Proxy | Vite proxy in dev (`/api` → `localhost:4000/api`) | `vite.config.ts` |

---

## 3. Repository Structure

```
backend/
  src/
    apps/             ← Microservice entry points + JWT strategies
    common/
      decorators/     ← @Roles() decorator
      guards/         ← RolesGuard, JwtAuthGuard, UnitAccessGuard
    config/           ← database.config.ts
    database/         ← init.sql, schema.sql, seed-data.sql, seed.ts
    modules/
      auth/           ← AuthService, AuthController, guards, strategies
      users/          ← UsersService, UsersController, User+RoleDefinition+RoleCapability entities
      units/          ← UnitsService, UnitsController, Unit entity
      tickets/        ← TicketService, AttendanceService, TicketSettingsService, EmailService
      documents/      ← DocumentService, VersionService, StorageService, processors
      reviews/        ← ReviewController, ComparisonController, ManualReview entity
      kpi/            ← KpiController, KpiService
      metrics/        ← MetricsController, MetricsService
      mov/            ← MovController, MovService
      references/     ← IssuanceController, IssuanceService
      incidents/      ← IncidentController, IncidentService
      cybersecurity/  ← CybersecurityController
  database/           ← SQL migration files (one per version)
  storage/            ← Uploaded files, previews, temp
frontend/
  src/
    app/              ← Next.js App Router pages
      dashboard/      ← All authenticated pages
      login/          ← Login page
      api/            ← Next.js API routes (minimal)
    components/
      layout/         ← DashboardLayout, Sidebar, Header
      documents/      ← DocumentUpload, DocumentCard, etc.
    contexts/         ← AuthContext, SidebarContext, PageTitleContext, ThemeModeContext
    lib/
      api/            ← Axios client + per-module API functions (auth, documents, tickets, kpi, etc.)
      types/          ← Shared TypeScript types (auth.ts, etc.)
      utils/          ← Formatting helpers
      theme.ts        ← MUI theme configuration
```

---

## 4. Microservices Architecture

### 4.1 Service Map

| Service | Entry | Default Port | DB Connection | Module |
|---|---|---|---|---|
| Gateway (HTTP entry) | `gateway.main.ts` | 4000 | Routes to all services | `gateway.module.ts` |
| Users Service | `users-service.main.ts` | 4101 | `compliance_hub_users` | `UsersServiceAppModule` |
| Ticketing Service | `ticketing-service.main.ts` | 4102 | `compliance_hub_ticketing` | `TicketingServiceAppModule` |
| Compliance Service | `compliance-service.main.ts` | 4103 | `compliance_hub` | `ComplianceServiceAppModule` |

### 4.2 Module Dependencies

```
UsersServiceAppModule
  └── AuthModule      (login, google-oauth, JWT generation, refresh)
  └── UsersModule     (CRUD users, role definitions, role capabilities)
  └── UnitsModule     (unit management)

TicketingServiceAppModule
  └── TicketsModule   (tickets, attendance, ticket-settings, email)

ComplianceServiceAppModule
  └── DocumentsModule (doc upload, versioning, storage, processing queue)
  └── MetricsModule   (compliance metrics computation)
  └── ReviewsModule   (manual review, comparison)
  └── ReferencesModule (issuances)
  └── IncidentsModule (incident reports)
  └── CybersecurityModule (cybersec dashboards)
  └── KpiModule       (KPI tracking)
  └── MovModule       (MoV artifacts)
```

---

## 5. Database Schema

### 5.1 Database Ownership

| Database | BASE TABLES (owns) | Views (reads from other DBs) |
|---|---|---|
| `compliance_hub_users` | `users`, `role_definitions`, `role_capabilities`, `attendance`, `user_unit_access` | — |
| `compliance_hub_ticketing` | `tickets`, `ticket_comments`, `ticket_events`, `ticket_escalations`, `ticket_categories`, `ticket_keyword_rules`, `escalation_focal_configs`, `office_days` | `users`, `attendance`, `role_definitions`, `role_capabilities`, `units` |
| `compliance_hub` | `units`, `documents`, `document_versions`, `document_assignments`, `document_references`, `reportorial_document_types`, `manual_reviews`, `kpi_metrics`, `mov_*`, `issuances`, `incidents`, `cybersecurity_*`, `metrics_*` | `users`, `role_definitions`, `role_capabilities` |

> **Critical Rule**: `users`, `attendance`, `role_definitions`, `role_capabilities` are BASE TABLES
> ONLY in `compliance_hub_users`. Every other DB accesses them as VIEWs. Never create them as
> BASE TABLES in any other database.

### 5.2 Key Table Schemas

#### `compliance_hub_users.users`
```sql
users (
  id INT AUTO_INCREMENT PK,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name VARCHAR(255), middle_name VARCHAR(255), last_name VARCHAR(255), suffix VARCHAR(255),
  staff_id VARCHAR(255), position VARCHAR(255), position_full VARCHAR(255), designation VARCHAR(255),
  ticket_main_focal TINYINT(1) DEFAULT 0,   -- per-user override: primary ticket focal
  ticket_technician TINYINT(1) DEFAULT 0,   -- per-user override: is a technician
  auth_provider ENUM('local','google') DEFAULT 'local',
  google_sub VARCHAR(255) UNIQUE,
  role ENUM('super_admin','section_head','user','compliance_officer','cybersec','infosec',
            'project_mgr','dev_lead','sqa_lead','lead_infra','server_admin','db_admin',
            'network_admin','desktop_sr','it_support_sr','desktop_jr','it_support_jr',
            'pantawid_ict','records_officer','hr_id_officer') DEFAULT 'user',
  active TINYINT(1) DEFAULT 1,
  last_login DATETIME, created_at DATETIME, updated_at DATETIME
)
```

#### `compliance_hub_users.role_definitions`
```sql
role_definitions (
  id INT AUTO_INCREMENT PK,
  value VARCHAR(255) UNIQUE,          -- enum string (e.g. 'desktop_sr')
  label VARCHAR(255),                 -- human-readable name
  description TEXT,
  assignable TINYINT(1) DEFAULT 1,
  is_system TINYINT(1) DEFAULT 1,
  technician_type VARCHAR(30) NULL,   -- 'desktop_support' | 'it_support' | 'pantawid_ict_support' | NULL
  role_code VARCHAR(50) NULL,         -- 'focal' | 'compliance_officer' | 'section_head' | 'cybersecurity_officer' | NULL
  created_at DATETIME, updated_at DATETIME
)
```

#### `compliance_hub_users.role_capabilities` (NEW in v0.0.31)
```sql
role_capabilities (
  id INT AUTO_INCREMENT PK,
  role_value VARCHAR(50) UNIQUE,         -- matches role_definitions.value
  is_focal TINYINT(1) DEFAULT 0,         -- focal/compliance document access
  is_desktop TINYINT(1) DEFAULT 0,       -- handles desktop/hardware tickets
  is_it_support TINYINT(1) DEFAULT 0,    -- handles IT/software tickets
  is_pantawid_ict TINYINT(1) DEFAULT 0,  -- handles Pantawid ICT tickets
  is_ito TINYINT(1) DEFAULT 0,           -- non-tech ITO professional staff (attendance ITO group)
  is_escalation_focal TINYINT(1) DEFAULT 0, -- can receive escalated tickets
  created_at DATETIME, updated_at DATETIME
)
```

#### `compliance_hub_ticketing.tickets`
```sql
tickets (
  id VARCHAR(36) PK, ticket_number VARCHAR(50) UNIQUE,
  subject VARCHAR(255), description TEXT,
  ticket_type VARCHAR(30),   -- 'it_support' | 'desktop_support' | 'pantawid_ict_support'
  status ENUM('open','assigned','in_progress','resolved','closed','freeze','duplicate'),
  priority VARCHAR(10) NULL, -- 'low' | 'medium' | 'high' | 'critical'
  category_id VARCHAR(36) NULL, requester_id INT NULL, reported_by_id INT NULL,
  assigned_to_id INT NULL, resolution_notes TEXT NULL, resolved_at DATETIME NULL,
  sla_deadline DATETIME NULL, satisfaction_rating TINYINT NULL,
  satisfaction_comment TEXT NULL, satisfaction_submitted_at DATETIME NULL,
  satisfaction_form_data TEXT NULL,  -- JSON: full CSAT form data
  duplicate_of_id VARCHAR(36) NULL, user_closed TINYINT(1) DEFAULT 0,
  created_at DATETIME, updated_at DATETIME
)
```

---

## 6. Role System (v0.0.31)

### 6.1 UserRole Enum — All 20 Roles

| Enum | DB value | role_code | technician_type | is_focal | is_ito | is_desktop | is_it_support | is_pantawid_ict | is_escalation_focal |
|---|---|---|---|---|---|---|---|---|---|
| SUPER_ADMIN | super_admin | null | null | 0 | 0 | 0 | 0 | 0 | 0 |
| SECTION_HEAD | section_head | section_head | null | 1 | 1 | 0 | 0 | 0 | 1 |
| COMPLIANCE_OFFICER | compliance_officer | compliance_officer | null | 1 | 1 | 0 | 0 | 0 | 1 |
| CYBERSEC | cybersec | cybersecurity_officer | null | 1 | 1 | 0 | 0 | 0 | 1 |
| INFOSEC | infosec | cybersecurity_officer | null | 1 | 1 | 0 | 0 | 0 | 1 |
| LEAD_INFRA | lead_infra | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| SERVER_ADMIN | server_admin | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| DB_ADMIN | db_admin | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| NETWORK_ADMIN | network_admin | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| PROJECT_MGR | project_mgr | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| DEV_LEAD | dev_lead | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| SQA_LEAD | sqa_lead | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| RECORDS_OFFICER | records_officer | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| HR_ID_OFFICER | hr_id_officer | focal | null | 1 | 1 | 0 | 0 | 0 | 0 |
| DESKTOP_SR | desktop_sr | **focal** (v0.0.31) | desktop_support | 1 | 0 | 1 | 0 | 0 | 1 |
| IT_SUPPORT_SR | it_support_sr | **focal** (v0.0.31) | it_support | 1 | 0 | 0 | 1 | 0 | 1 |
| DESKTOP_JR | desktop_jr | null | desktop_support | 0 | 0 | 1 | 0 | 0 | 0 |
| IT_SUPPORT_JR | it_support_jr | null | it_support | 0 | 0 | 0 | 1 | 0 | 0 |
| PANTAWID_ICT | pantawid_ict | **focal** (v0.0.31) | pantawid_ict_support | 1 | 0 | 0 | 0 | 1 | 0 |
| USER | user | null | null | 0 | 0 | 0 | 0 | 0 | 0 |

### 6.2 How the Role System Works (Multi-Layer)

**Layer 1 — `user.role` (DB column):** The raw role string stored in JWT payload and DB.

**Layer 2 — `user.roleCode` (from role_definitions.role_code):**
Stored in JWT payload. Maps a specific role to a platform "feature code". Used by:
- `RolesGuard`: `user.role === role || user.roleCode === role`
- Frontend: `user.roleCode === 'focal'` to check focal access

**Layer 3 — `role_capabilities` flags (service layer):**
Database-driven boolean matrix. Used by services for fine-grained access control.
No hardcoded role arrays in service code — all reads go through `RoleCapabilitiesService`.

**Layer 4 — `user.ticketMainFocal` / `user.ticketTechnician` (per-user overrides):**
Boolean flags on the user record for primary focal contact / technician directory listing.

### 6.3 RoleCapabilitiesService API

File: `backend/src/modules/users/role-capabilities.service.ts`

| Method | Returns | Meaning |
|---|---|---|
| `isFocal(role)` | boolean | Focal/compliance document access |
| `isIto(role)` | boolean | Non-tech ITO professional staff (attendance ITO group) |
| `isDesktop(role)` | boolean | Handles desktop/hardware tickets |
| `isItSupport(role)` | boolean | Handles IT/software tickets |
| `isPantawidIct(role)` | boolean | Handles Pantawid ICT tickets |
| `isEscalationFocal(role)` | boolean | Can receive escalated tickets |
| `isTechnician(role)` | boolean | Any technician (desktop ∨ IT ∨ Pantawid) |
| `isSeniorTech(role)` | boolean | Senior tech (isFocal ∧ (isDesktop ∨ isItSupport)) |
| `isSeniorDesktop(role)` | boolean | Senior desktop specifically |
| `isSeniorItSupport(role)` | boolean | Senior IT support specifically |
| `canSeeAllTickets(role)` | boolean | Not restricted to own-submitted tickets |
| `canChangePriority(role)` | boolean | Allowed to set/change ticket priority |
| `isSeniorAuthority(role)` | boolean | Full status transition authority |
| `canAssignTickets(role)` | boolean | Can assign ticket to a technician |
| `getRolesWhere(capability)` | string[] | All roles with that capability = true |
| `getSeniorTechRoles()` | string[] | All senior tech role values |
| `getTechnicianRoles()` | string[] | All technician role values |
| `reload()` | Promise<void> | Reload in-memory cache from DB |

### 6.4 Unit Access Guard Rules

File: `backend/src/common/guards/unit-access.guard.ts`

- `GLOBAL_ACCESS_ROLES` = `{super_admin, section_head, compliance_officer, cybersec, infosec}` — bypass all unit scoping
- `roleCode === 'focal'` — access to their assigned units only (unit-scoped)
- All others — no cross-unit access

---

## 7. Authentication Flow

1. `POST /api/auth/login` with `{email, password}`
2. `AuthService.login()` → validates bcrypt hash → calls `generateTokens()`
3. `generateTokens()` → calls `usersService.getRoleCodeForRole(user.role)` → queries `role_definitions.role_code`
4. JWT payload: `{sub, email, role, roleCode, units[]}`
5. Returns `{accessToken, refreshToken, user: {..., roleCode, units}}`
6. Frontend stores tokens in `localStorage` (`accessToken`, `refreshToken`)
7. `ApiClient` sends `Authorization: Bearer <token>` on every request
8. On 401: refresh via `POST /api/auth/refresh` → update localStorage → retry
9. Google OAuth: `POST /api/auth/google` with `{idToken}` → verify via Google API → same flow

**Login side effects:**
- `attendanceService.autoCorrectAbsentOnLogin()` — marks user present if they were marked absent
- `ticketService.assignPendingTicketsOnLogin()` — auto-assigns queued OPEN tickets to the logging-in technician

---

## 8. Frontend Structure

### 8.1 Contexts

| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | Current user, tokens, login/logout state |
| `SidebarContext` | `contexts/SidebarContext.tsx` | Sidebar open/close state |
| `PageTitleContext` | `contexts/PageTitleContext.tsx` | Dynamic page titles |
| `ThemeModeContext` | `contexts/ThemeModeContext.tsx` | Light/dark mode toggle |

`AuthContext` provides: `user`, `isAuthenticated`, `loading`, `login()`, `logout()`, `refreshUser()`

### 8.2 Dashboard Pages

| Route | Who can access | Purpose |
|---|---|---|
| `/dashboard` | All authenticated | Main dashboard with widgets (tickets, documents, KPI) |
| `/dashboard/documents` | focal roles + compliance + super_admin | Document list, upload, workflow status |
| `/dashboard/documents/[id]` | Same | Document detail, version history, review actions |
| `/dashboard/documents/archived` | Same | Archived documents |
| `/dashboard/tickets` | All staff | Ticket list (role-filtered) |
| `/dashboard/tickets/[id]` | All staff | Ticket detail, assignment, comments |
| `/dashboard/attendance` | super_admin, section_head, compliance_officer, desktop_sr, it_support_sr | Daily attendance grid |
| `/dashboard/issuances` | focal + compliance + super_admin | ICT issuance library |
| `/dashboard/reviews` | compliance_officer + super_admin | Document review queue |
| `/dashboard/reports` | compliance_officer + super_admin | Compliance reports |
| `/dashboard/kpi` | focal + compliance + super_admin + section_head | KPI monitoring |
| `/dashboard/metrics` | compliance_officer + super_admin | Metrics dashboard |
| `/dashboard/mov` | focal + compliance + super_admin | MoV artifact management |
| `/dashboard/incidents` | cybersec + infosec + super_admin | Cybersecurity incidents |
| `/dashboard/units` | super_admin | Unit management |
| `/dashboard/settings` | super_admin | System settings, user management |
| `/dashboard/ticket-settings` | super_admin + senior techs | Ticket categories, keyword rules |
| `/dashboard/ticket-reports` | super_admin + section_head + compliance | Ticket reports and analytics |
| `/dashboard/repository` | focal + compliance | Compliant document repository |
| `/dashboard/user-manual` | All | In-app user manual |

### 8.3 Frontend Role Checks Pattern

```typescript
// From JWT: user.role = 'desktop_sr', user.roleCode = 'focal'
const isFocal = user?.roleCode === 'focal';
const isComplianceOfficer = user?.role === 'compliance_officer' || user?.roleCode === 'compliance_officer';
const isSuperAdmin = user?.role === 'super_admin';
```

### 8.4 Frontend API Client

File: `frontend/src/lib/api/client.ts`

- Base URL: `VITE_API_URL` env var or `/api` (Vite proxy in dev)
- Auto-adds `Authorization: Bearer <accessToken>` header
- 401 interceptor: attempts token refresh, queues retries, redirects to `/login?reason=session_expired` on failure
- API modules: `auth.ts`, `documents.ts`, `tickets.ts`, `kpi.ts`, `metrics.ts`, `mov.ts`, `reviews.ts`, `users.ts`, `units.ts`, `incidents.ts`, `cybersecurity.ts`, `document-types.ts`, `issuances.ts`

---

## 9. Ticket System Logic

### 9.1 Ticket Types
- `it_support` — IT/software issues (handled by IT_SUPPORT_SR, IT_SUPPORT_JR)
- `desktop_support` — Hardware/desktop issues (handled by DESKTOP_SR, DESKTOP_JR)
- `pantawid_ict_support` — Pantawid-specific ICT issues (handled by PANTAWID_ICT)

### 9.2 Ticket Status Flow
```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
     ↘ FREEZE (any status → FREEZE → back to previous)
     ↘ DUPLICATE (terminal)
```

### 9.3 Auto-Assignment Logic
1. Check if today is an office day AND technician is marked PRESENT in attendance
2. Pantawid tickets: always auto-assign to `pantawid_ict` tech with fewest open tickets
3. Other tickets: filter out SENIOR techs (`RoleCapabilitiesService.isSeniorTech()`) — they self-assign
4. Pick junior tech with ZERO active tickets (strict zero)
5. On tech login: `assignPendingTicketsOnLogin()` assigns their queue of OPEN tickets

### 9.4 CSAT Form
When a ticket is RESOLVED, the requester receives a link to submit a CSAT form.
Data stored in `tickets.satisfaction_form_data` (JSON).

### 9.5 SLA
`tickets.sla_deadline` set from `ticket_categories.sla_hours` at ticket creation.

---

## 10. Document System Logic

### 10.1 Document Submission
- Focal roles (all roles with `is_focal=1`) can submit compliance documents
- Role-scoped: `DocumentService.getDocuments()` filters to `uploaded_by = actorId` for focal roles

### 10.2 Document Processing Pipeline
1. Upload → saved to `storage/documents/`
2. Enqueued to Bull queue (`document-processing`)
3. `DocumentProcessor`: extracts text from DOCX/PDF → stores in `documents.extracted_text`
4. `MetricsService`: computes compliance metrics → stores results
5. Preview generated in `storage/previews/`

---

## 11. Security Notes (OWASP Alignment)

### 11.1 Authentication
- JWT with issuer/audience validation; `min(16)` enforced on secrets
- Refresh tokens separate from access tokens
- Google OAuth uses server-side ID token verification
- Deactivated accounts: rejected at login AND at refresh

### 11.2 Authorization
- `JwtAuthGuard` + `RolesGuard` on all protected routes
- `UnitAccessGuard` enforces per-unit data scoping
- `RoleCapabilitiesService` for service-layer checks (no hardcoded arrays)
- No client-side role decisions without matching server-side guard

### 11.3 Input Validation
- DTOs with class-validator decorators
- Parameterized queries via TypeORM QueryBuilder
- File upload: MIME type and size validation

### 11.4 Known Gaps (Security Audit Pending — v0.0.32)
- Rate limiting: configured in env vars but review actual throttler setup
- Error messages: some services may return stack traces — review `NODE_ENV` guards
- `localStorage` for JWT tokens: acceptable for internal intranet app; XSS risk documented

---

## 12. Build Commands

```powershell
# Backend — type-check + build (zero output = clean)
cd backend ; npx nest build

# Frontend — type-check only
cd frontend ; npx tsc --noEmit 2>&1 | Select-Object -First 60

# Frontend — dev server
cd frontend ; npm run dev

# Run SQL migration via XAMPP MySQL
$sql = Get-Content "backend\database\vX.Y.Z-migration.sql" -Raw
$sql | & "C:\xampp\mysql\bin\mysql.exe" -u root -proot

# Verify DB state
"SELECT * FROM compliance_hub_users.role_capabilities LIMIT 5" | & "C:\xampp\mysql\bin\mysql.exe" -u root -proot
```

---

## 13. Environment Variables

| Variable | Used In | Notes |
|---|---|---|
| `NODE_ENV` | All | development \| production |
| `PORT` | Gateway | Default 4000 |
| `DB_HOST` | All | Default localhost |
| `DB_PORT` | All | Default 3306 |
| `DB_USERNAME` | All | |
| `DB_PASSWORD` | All | |
| `DB_DATABASE` | All | Main fallback DB name |
| `USERS_DB_DATABASE` | Users Service | Default `compliance_hub_users` |
| `TICKETING_DB_DATABASE` | Ticketing Service | Default `compliance_hub_ticketing` |
| `COMPLIANCE_DB_DATABASE` | Compliance Service | Default `compliance_hub` |
| `DB_SYNCHRONIZE` | All | Must be `false` |
| `JWT_SECRET` | Users Service | min 16 chars |
| `JWT_EXPIRATION` | Users Service | Default `30m` |
| `JWT_REFRESH_SECRET` | Users Service | min 16 chars |
| `JWT_REFRESH_EXPIRATION` | Users Service | Default `7d` |
| `JWT_ISSUER` | All | Default `compliance-hub-api` |
| `JWT_AUDIENCE` | All | Default `compliance-hub-client` |
| `GOOGLE_CLIENT_ID` | Users Service | Optional, for Google OAuth |
| `REDIS_HOST` | Compliance Service | Default `localhost` |
| `REDIS_PORT` | Compliance Service | Default `6379` |
| `STORAGE_TYPE` | Compliance Service | `local` or `s3` |
| `STORAGE_PATH` | Compliance Service | Default `./storage` |
| `MAX_FILE_SIZE` | Compliance Service | Default `52428800` (50MB) |
| `CORS_ORIGIN` | All | Default `http://localhost:3000` |

---

## 14. SQL Migration Files

| File | Version | Date | Description |
|---|---|---|---|
| `backend/src/database/init.sql` | init | — | Initial schema for compliance_hub |
| `backend/src/database/schema.sql` | schema | — | Full schema with all tables |
| `backend/src/database/seed-data.sql` | seed | — | 20 roles + initial reference data |
| `backend/database/microservices-init.sql` | init | — | Create 3 databases + grant privileges |
| `backend/database/microservices-migrate.sql` | migration | — | Copy data from legacy single-DB setup |
| `backend/database/v0.0.30-migration.sql` | v0.0.30 | 2026-04-16 | Remove 8 legacy roles, fix DB table ownership |
| `backend/database/v0.0.31-migration.sql` | v0.0.31 | 2026-04-16 | Add role_capabilities table + seed + VIEWs + Sub-Q roleCode elevation |

---

## 15. Key Source Files

### Backend

| File | Purpose |
|---|---|
| `src/modules/users/entities/user.entity.ts` | `UserRole` enum + User ORM entity |
| `src/modules/users/entities/role-definition.entity.ts` | `role_definitions` ORM entity |
| `src/modules/users/entities/role-capability.entity.ts` | `role_capabilities` ORM entity (NEW v0.0.31) |
| `src/modules/users/role-capabilities.service.ts` | Startup-cached capability lookup service (NEW v0.0.31) |
| `src/modules/users/users.service.ts` | CRUD for users + `DEFAULT_ROLE_DEFINITIONS` seed |
| `src/modules/auth/auth.service.ts` | Login, Google OAuth, JWT generation |
| `src/apps/compliance-jwt.strategy.ts` | JWT decode for compliance/users services |
| `src/apps/ticketing-jwt.strategy.ts` | JWT decode for ticketing service |
| `src/common/guards/roles.guard.ts` | `@Roles()` decorator — checks `user.role` or `user.roleCode` |
| `src/common/guards/unit-access.guard.ts` | Per-unit access scoping |
| `src/modules/tickets/services/ticket.service.ts` | Core ticket logic — uses `RoleCapabilitiesService` |
| `src/modules/tickets/services/attendance.service.ts` | Technician attendance — uses `RoleCapabilitiesService` |
| `src/modules/tickets/services/ticket-settings.service.ts` | Categories, keyword rules, escalation config |
| `src/modules/documents/services/document.service.ts` | Document logic — uses `RoleCapabilitiesService` |
| `src/modules/kpi/services/kpi.service.ts` | `canManage()` / `canViewAll()` role checks |
| `backend/database/` | SQL migration files |

### Frontend

| File | Purpose |
|---|---|
| `src/lib/types/auth.ts` | `UserRole` enum (mirrors backend) |
| `src/lib/api/client.ts` | Axios instance — auth interceptors |
| `src/components/layout/Sidebar.tsx` | Nav item visibility by role |
| `src/contexts/AuthContext.tsx` | Auth state provider |
| `src/app/dashboard/tickets/page.tsx` | Ticket list with role-based filtering |
| `src/app/dashboard/documents/page.tsx` | Document list with focal access check |
| `src/app/dashboard/attendance/page.tsx` | Attendance grid for senior techs + ITO |

---

## 16. Code Conventions

- **`DB_SYNCHRONIZE=false`**: Never let TypeORM auto-sync. All schema changes are manual SQL migrations.
- **Migration naming**: `backend/database/vX.Y.Z-migration.sql`
- **Versioning**: Semantic versioning, PATCH bump for every production change. Both `backend/package.json` and `frontend/package.json` must be updated together.
- **`@Roles()` decorator**: Use `UserRole.ENUM_NAME` for direct role matching; string literals like `'focal'` / `'technician'` for roleCode-based routing.
- **No hardcoded role arrays in services**: Use `RoleCapabilitiesService` methods instead.
- **Frontend role checks**: Use `user?.roleCode === 'focal'` for focal-equivalent roles (not `user?.role`).
- **SQL injection prevention**: Use parameterized TypeORM QueryBuilder, never string interpolation for user data.
- **Input validation**: Use class-validator DTOs. Trim string inputs before persistence.

---

## 17. Files NOT to Touch Without Explicit Instruction

- `backend/src/database/init.sql` — Legacy init file.
- `backend/src/database/schema.sql` — Legacy full schema.
- `backend/database/microservices-migrate.sql` — One-time migration script.
- Any existing database VIEW in non-owner DBs (`users`, `units`, `attendance`, `role_definitions`, `role_capabilities`).

---

## 18. Change Log (All Versions)

### v0.0.31 — 2026-04-16
**role_capabilities table — eliminates all hardcoded role arrays**

- NEW: `compliance_hub_users.role_capabilities` table with 6 boolean flags per role (20 rows seeded)
- NEW: VIEWs in `compliance_hub_ticketing` and `compliance_hub` pointing to base table
- NEW: `backend/src/modules/users/entities/role-capability.entity.ts`
- NEW: `backend/src/modules/users/role-capabilities.service.ts` (startup-cached service)
- MODIFIED: `users.module.ts`, `tickets.module.ts`, `documents.module.ts` — register entity + provide/export service
- MODIFIED: `ticket.service.ts` — removed `FOCAL_NAMED_ROLES` const; all 8+ role arrays replaced with `RoleCapabilitiesService` calls
- MODIFIED: `attendance.service.ts` — `getItoRoles()` uses `roleCapSvc.getRolesWhere('isIto')`; scope checks use `isSeniorDesktop()` / `isSeniorItSupport()`
- MODIFIED: `document.service.ts` — removed `FOCAL_NAMED_ROLES` Set; all 4 usages replaced with `roleCapSvc.isFocal()`
- MODIFIED: `unit-access.guard.ts` — added `section_head` to `GLOBAL_ACCESS_ROLES` (was previously missing)
- DB (Sub-Q): `role_definitions.role_code = 'focal'` set for `desktop_sr`, `it_support_sr`, `pantawid_ict`
  - These roles now pass `@Roles('focal')` controller guards
  - Frontend `user.roleCode === 'focal'` now returns true for these roles
- Version: 0.0.30 → **0.0.31**

### v0.0.30 — 2026-04-16
**Remove 8 legacy roles + DB table ownership fixup**

- REMOVED: `reviewer`, `focal`, `technician`, `auditor`, `technician_desktop`, `technician_it_support`, `technician_it_staff`, `technician_desktop_staff`
- Fixed DB table ownership: `attendance` BASE TABLE is in `compliance_hub_users`
- Frontend updated: `user.roleCode === 'focal'` pattern for named focal roles
- Version: 0.0.27 → **0.0.30**

---

## 19. Pending Work / Known Issues

### Security Audit (v0.0.32 scope)
- Review rate limiting implementation (ThrottlerModule configuration)
- Review all unprotected/public endpoints
- Add Content-Security-Policy headers
- Review error response sanitization (no stack traces in production)
- JWT tokens in localStorage — document risk acceptance for intranet context

### Feature Backlog
- Frontend awareness of `role_capabilities` (currently uses hardcoded role arrays in some page components)
- API endpoint to expose role_capabilities matrix to authenticated admins
- Admin UI to modify capability flags without SQL migration


| Service | Entry Point | Port | Database |
|---|---|---|---|
| Gateway (HTTP) | `gateway.main.ts` | 4000 | Routes to other services |
| Compliance Service | `compliance-service.main.ts` | 4001 | `compliance_hub` |
| Ticketing Service | `ticketing-service.main.ts` | 4002 | `compliance_hub_ticketing` |
| Users Service | `users-service.main.ts` | 4003 | `compliance_hub_users` |

### 3.2 Databases (MariaDB)

| Database | Owns (BASE TABLES) | Exposes (VIEWs to other DBs) |
|---|---|---|
| `compliance_hub_users` | `users`, `role_definitions`, `attendance`, `user_unit_access` | VIEWs used by ticketing + compliance |
| `compliance_hub_ticketing` | `tickets`, `ticket_comments`, `ticket_events`, `ticket_escalations`, `ticket_categories`, `ticket_keyword_rules`, `escalation_focal_configs`, `office_days` | VIEWs: `users`, `attendance`, `role_definitions`, `units` |
| `compliance_hub` | `units`, `documents`, `document_versions`, `document_assignments`, `kpi_metrics`, `mov_artifacts`, `issuances`, `incidents`, `reviews`, … | VIEWs: `users`, `role_definitions` |

> **SQLRule**: Never store attendance, users, or role_definitions as BASE TABLES in compliance_hub or compliance_hub_ticketing — only VIEWs.

---

## 4. Environment Variables (`.env.example` / `.env`)

```
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=root           # XAMPP default
DB_DATABASE=compliance_hub
USERS_DB_DATABASE=compliance_hub_users
TICKETING_DB_DATABASE=compliance_hub_ticketing
COMPLIANCE_DB_DATABASE=compliance_hub
JWT_SECRET=...
JWT_EXPIRATION=30m
JWT_REFRESH_SECRET=...
JWT_REFRESH_EXPIRATION=7d
JWT_ISSUER=compliance-hub-api
JWT_AUDIENCE=compliance-hub-client
GOOGLE_CLIENT_ID=          # optional
REDIS_HOST=localhost
REDIS_PORT=6379
STORAGE_TYPE=local
STORAGE_PATH=./storage
CORS_ORIGIN=http://localhost:3000
```

---

## 5. Build & Run Commands

```powershell
# Backend — build
cd backend ; npx nest build

# Backend — start (all services via gateway)
cd backend ; node dist/apps/gateway.main.js
# OR individual services:
node dist/apps/compliance-service.main.js
node dist/apps/ticketing-service.main.js
node dist/apps/users-service.main.js

# Frontend — type-check only
cd frontend ; npx tsc --noEmit

# Frontend — start (dev)
cd frontend ; npm run dev

# Database — run SQL via XAMPP
$sql = Get-Content "path\to\file.sql" -Raw
$sql | & "C:\xampp\mysql\bin\mysql.exe" -u root -proot
```

---

## 6. Role System — Current State (v0.0.30)

### 6.1 `UserRole` Enum  (`backend/src/modules/users/entities/user.entity.ts`)

| Enum Value | DB String | roleCode | technicianType | Category |
|---|---|---|---|---|
| SUPER_ADMIN | super_admin | null | null | Admin |
| SECTION_HEAD | section_head | section_head | null | Supervisorial |
| COMPLIANCE_OFFICER | compliance_officer | compliance_officer | null | Compliance |
| CYBERSEC | cybersec | cybersecurity_officer | null | Compliance |
| INFOSEC | infosec | cybersecurity_officer | null | Compliance |
| LEAD_INFRA | lead_infra | focal | null | ITO Staff / Focal |
| SERVER_ADMIN | server_admin | focal | null | ITO Staff / Focal |
| DB_ADMIN | db_admin | focal | null | ITO Staff / Focal |
| NETWORK_ADMIN | network_admin | focal | null | ITO Staff / Focal |
| PROJECT_MGR | project_mgr | focal | null | ITO Staff / Focal |
| DEV_LEAD | dev_lead | focal | null | ITO Staff / Focal |
| SQA_LEAD | sqa_lead | focal | null | ITO Staff / Focal |
| RECORDS_OFFICER | records_officer | focal | null | ITO Staff / Focal |
| HR_ID_OFFICER | hr_id_officer | focal | null | ITO Staff / Focal |
| DESKTOP_SR | desktop_sr | null | desktop_support | Tech / Senior |
| IT_SUPPORT_SR | it_support_sr | null | it_support | Tech / Senior |
| DESKTOP_JR | desktop_jr | null | desktop_support | Tech / Junior |
| IT_SUPPORT_JR | it_support_jr | null | it_support | Tech / Junior |
| PANTAWID_ICT | pantawid_ict | null | pantawid_ict_support | Tech / Pantawid |
| USER | user | null | null | End User |

### 6.2 How `roleCode` Works

- Stored in `role_definitions.role_code` column (and in JWT payload)
- `RolesGuard` matches: `user.role === role || user.roleCode === role`
- Controller `@Roles('focal')` → matches any role whose `roleCode = 'focal'`
- `@Roles(UserRole.COMPLIANCE_OFFICER)` → matches `role = 'compliance_officer'` directly

### 6.3 `ticketMainFocal` and `ticketTechnician` (user-level flags)

- `users.ticket_main_focal` — flags a user as the primary ticket focal contact
- `users.ticket_technician` — flags a user as a technician (for display / filtering)
- These are per-user overrides, not role-level

---

## 7. Hardcoded Role Arrays — Current Locations (TARGET FOR ELIMINATION)

These are all the inline role lists that should eventually come from the `role_capabilities` table:

| Location | Array / Constant | Roles Listed | Replace With |
|---|---|---|---|
| `ticket.service.ts:25` | `FOCAL_NAMED_ROLES` | lead_infra, server_admin, db_admin, network_admin, project_mgr, dev_lead, sqa_lead, records_officer, hr_id_officer | `role_capabilities.is_focal = 1` |
| `document.service.ts:24` | `FOCAL_NAMED_ROLES` (Set) | same 9 roles | `role_capabilities.is_focal = 1` |
| `unit-access.guard.ts:4` | `GLOBAL_ACCESS_ROLES` | super_admin, compliance_officer, cybersec, infosec | `role_capabilities.is_ito = 1` (partial) |
| `ticket.service.ts:748` | `SEE_ALL_ROLES` | super_admin, section_head, compliance_officer, desktop_sr, it_support_sr, pantawid_ict | `role_capabilities.is_ito = 1` |
| `ticket.service.ts:598,944,1012` | `SENIOR_AUTO_ASSIGN_EXCLUDED` (×3) | it_support_sr, desktop_sr | Derived: `is_ito=1 AND (is_desktop=1 OR is_it_support=1)` |
| `ticket.service.ts:866` | `priorityRoles` | section_head, super_admin, compliance_officer, cybersec, infosec, pantawid_ict, desktop_sr, it_support_sr, desktop_jr, it_support_jr + FOCAL_NAMED_ROLES | `is_ito=1 OR is_desktop=1 OR is_it_support=1 OR is_pantawid_ict=1` |
| `ticket.service.ts:881` | `SENIOR_AUTHORITY_ROLES` | super_admin + FOCAL_NAMED_ROLES + section_head, compliance_officer, it_support_sr, desktop_sr | `is_ito=1 OR is_focal=1` |
| `ticket.service.ts:1057` | `allowedActors` | super_admin, section_head, compliance_officer, cybersec, infosec, pantawid_ict, desktop_sr, it_support_sr, desktop_jr, it_support_jr + FOCAL_NAMED_ROLES | any `is_focal=1 OR is_desktop=1 OR is_it_support=1 OR is_pantawid_ict=1` |
| `attendance.service.ts:97` | `getItoRoles()` | section_head, compliance_officer, cybersec, infosec, lead_infra, server_admin, db_admin, network_admin, project_mgr, dev_lead, sqa_lead, records_officer, hr_id_officer | `role_capabilities.is_ito = 1` |
| `attendance.service.ts:40` | `excludedAttendanceRoleValues` | user, super_admin | `is_focal=0 AND is_desktop=0 AND is_it_support=0 AND is_pantawid_ict=0 AND is_ito=0` |
| `attendance.service.ts:108` | `getTechnicianTypeRoles()` | queries role_definitions.technicianType | `role_capabilities.is_desktop / is_it_support / is_pantawid_ict` |
| `ticket-settings.controller.ts:31` | `SETTINGS_ROLES` | super_admin, desktop_sr, it_support_sr, pantawid_ict | Controller-level, low priority |

---

## 8. Proposed: `role_capabilities` Table

> **Status**: PROPOSED — Pending implementation decision (see Section 9)

### 8.1 Table Definition (in `compliance_hub_users`)

```sql
CREATE TABLE role_capabilities (
  id           INT          NOT NULL AUTO_INCREMENT PRIMARY KEY,
  role_value   VARCHAR(50)  NOT NULL UNIQUE,        -- FK ref to role_definitions.value
  is_focal     TINYINT(1)   NOT NULL DEFAULT 0,     -- compliance document access
  is_desktop   TINYINT(1)   NOT NULL DEFAULT 0,     -- handles desktop support tickets
  is_it_support TINYINT(1)  NOT NULL DEFAULT 0,     -- handles IT support tickets
  is_pantawid_ict TINYINT(1) NOT NULL DEFAULT 0,    -- handles Pantawid ICT tickets
  is_ito       TINYINT(1)   NOT NULL DEFAULT 0,     -- ITO staff (full ticket/attendance visibility)
  is_escalation_focal TINYINT(1) NOT NULL DEFAULT 0, -- can receive escalated tickets
  created_at   DATETIME     DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME     DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
```

### 8.2 Seed Data Matrix

| role_value | is_focal | is_desktop | is_it_support | is_pantawid_ict | is_ito | is_escalation_focal |
|---|---|---|---|---|---|---|
| super_admin | 0 | 0 | 0 | 0 | 0 | 0 |
| section_head | 1 | 0 | 0 | 0 | 1 | 1 |
| compliance_officer | 1 | 0 | 0 | 0 | 1 | 1 |
| cybersec | 1 | 0 | 0 | 0 | 1 | 1 |
| infosec | 1 | 0 | 0 | 0 | 1 | 1 |
| lead_infra | 1 | 0 | 0 | 0 | 1 | 0 |
| server_admin | 1 | 0 | 0 | 0 | 1 | 0 |
| db_admin | 1 | 0 | 0 | 0 | 1 | 0 |
| network_admin | 1 | 0 | 0 | 0 | 1 | 0 |
| project_mgr | 1 | 0 | 0 | 0 | 1 | 0 |
| dev_lead | 1 | 0 | 0 | 0 | 1 | 0 |
| sqa_lead | 1 | 0 | 0 | 0 | 1 | 0 |
| records_officer | 1 | 0 | 0 | 0 | 1 | 0 |
| hr_id_officer | 1 | 0 | 0 | 0 | 0 | 0 |
| desktop_sr | 1 | 1 | 0 | 0 | 1 | 1 |
| it_support_sr | 1 | 0 | 1 | 0 | 1 | 1 |
| desktop_jr | 0 | 1 | 0 | 0 | 0 | 0 |
| it_support_jr | 0 | 0 | 1 | 0 | 0 | 0 |
| pantawid_ict | 1 | 0 | 0 | 1 | 1 | 0 |
| user | 0 | 0 | 0 | 0 | 0 | 0 |

### 8.3 Derived Logic (replaces hardcoded multi-role arrays)

| What to determine | Query condition |
|---|---|
| Is focal (compliance access) | `is_focal = 1` |
| Is ITO staff (full ticket visibility, attendance tracked) | `is_ito = 1` |
| Is technician of any type | `is_desktop = 1 OR is_it_support = 1 OR is_pantawid_ict = 1` |
| Is senior tech (excluded from auto-assign) | `is_ito = 1 AND (is_desktop = 1 OR is_it_support = 1)` |
| Is attendance-trackable | `is_focal = 1 OR is_desktop = 1 OR is_it_support = 1 OR is_pantawid_ict = 1 OR is_ito = 1` |
| Can receive escalation | `is_escalation_focal = 1` |
| Sees all tickets (not own-only) | `is_ito = 1` |
| Can change ticket priority | `is_focal = 1 OR is_it_support = 1 OR is_desktop = 1 OR is_pantawid_ict = 1 OR is_ito = 1` |

---

## 9. Open Decisions (Pending User Input)

See Section 10 — Pending Choices.

---

## 10. Key Source Files

### Backend

| File | Purpose |
|---|---|
| `src/modules/users/entities/user.entity.ts` | `UserRole` enum + User ORM entity |
| `src/modules/users/entities/role-definition.entity.ts` | `role_definitions` ORM entity |
| `src/modules/users/users.service.ts` | CRUD for users + `DEFAULT_ROLE_DEFINITIONS` seed |
| `src/modules/auth/auth.service.ts` | Login, Google OAuth, JWT generation, `buildAuthResponse()` |
| `src/modules/auth/interfaces/auth.interface.ts` | `JwtPayload` and `AuthResponse` types |
| `src/apps/compliance-jwt.strategy.ts` | JWT decode for compliance/users services |
| `src/apps/ticketing-jwt.strategy.ts` | JWT decode for ticketing service |
| `src/common/guards/roles.guard.ts` | `@Roles()` decorator matcher — checks `user.role` or `user.roleCode` |
| `src/common/guards/unit-access.guard.ts` | Per-unit access scoping (`GLOBAL_ACCESS_ROLES`) |
| `src/modules/tickets/services/ticket.service.ts` | Core ticket logic — all hardcoded role arrays here |
| `src/modules/tickets/services/attendance.service.ts` | Technician attendance + `getItoRoles()` + `getTechnicianTypeRoles()` |
| `src/modules/tickets/services/ticket-settings.service.ts` | Categories, keyword rules, escalation focal config |
| `src/modules/tickets/controllers/ticket-settings.controller.ts` | `SETTINGS_ROLES` const + escalation focal endpoints |
| `src/modules/documents/services/document.service.ts` | `FOCAL_NAMED_ROLES` (Set) used for document access scoping |
| `src/modules/kpi/services/kpi.service.ts` | `canManage()` / `canViewAll()` role checks |
| `src/modules/reviews/controllers/review.controller.ts` | Review access roles |
| `backend/database/` | SQL migration files (one file per version) |
| `backend/src/database/seed-data.sql` | Seed data for all roles + initial data |

### Frontend

| File | Purpose |
|---|---|
| `src/lib/types/auth.ts` | `UserRole` enum (mirrors backend) |
| `src/components/layout/Sidebar.tsx` | Nav item visibility by role |
| `src/app/dashboard/tickets/page.tsx` | `isFocalTech`, `isLowerLevelTech`, `isJuniorTech` checks |
| `src/app/dashboard/documents/page.tsx` | `isFocal` (uses `roleCode`) |
| `src/app/dashboard/page.tsx` | Dashboard widget visibility |

---

## 11. Database Migration Files

| File | Version | Description |
|---|---|---|
| `backend/database/microservices-init.sql` | init | Create 3 databases |
| `backend/database/microservices-migrate.sql` | migration | Copy data from legacy DB |
| `backend/src/database/init.sql` | init | Schema for compliance_hub |
| `backend/src/database/schema.sql` | schema | Full schema |
| `backend/src/database/seed-data.sql` | seed | 20 roles + initial data |
| `backend/database/v0.0.30-migration.sql` | v0.0.30 | Remove 8 legacy roles, fix DB structure |

---

## 12. Conventions

- **DB_SYNCHRONIZE=false**: All schema changes MUST be manual SQL migration files
- **Migration naming**: `backend/database/vX.Y.Z-migration.sql` (e.g. `v0.0.31-migration.sql`)
- **Versioning**: Semantic version, PATCH bump for every production change
- **`@Roles()` strings**: Use `UserRole.ENUM_NAME` for direct matches, or string literals like `'focal'` / `'technician'` for `roleCode`-based routing
- **roleCode routing**: `'focal'` → focal-equivalent staff; `'compliance_officer'` → compliance access; `'section_head'` → section head access
- **No enum values removed without migration**: Always provide ALTER TABLE MODIFY COLUMN to update ENUM values
- **All SQL in XAMPP**: `C:\xampp\mysql\bin\mysql.exe -u root -proot`
- **Frontend role checks**: Use `user?.roleCode === 'focal'` not `user?.role === 'focal'` for named focal roles

---

## 13. Pending Implementation: `role_capabilities` Table

> **Decision required** — the table design is complete (Section 8).  
> Awaiting user selection from the choices below before code is written.

### Choice A — Full Recommended Implementation ✅ (Recommended)
Implements everything:
1. New SQL migration: `v0.0.31-migration.sql` — creates `role_capabilities` table + seeds all 20 rows + creates VIEWs in the other two DBs
2. New TypeORM entity: `backend/src/modules/users/entities/role-capability.entity.ts`
3. New service: `backend/src/modules/users/services/role-capabilities.service.ts` — startup-cached lookup service
4. Module registration in `users.module.ts`, `compliance-service.module.ts`, `ticketing-service.module.ts`
5. Replace in `ticket.service.ts` — all 8 hardcoded role arrays replaced with `RoleCapabilitiesService` calls
6. Replace in `attendance.service.ts` — `getItoRoles()` and `getTechnicianTypeRoles()` replaced
7. Replace in `document.service.ts` — `FOCAL_NAMED_ROLES` set replaced
8. Replace in `unit-access.guard.ts` — `GLOBAL_ACCESS_ROLES` replaced
9. `role_definitions.technicianType` kept for backward compat but superseded
10. `desktop_sr`, `it_support_sr`, `pantawid_ict` get `is_focal=1` (service-level only — see sub-choice below)
11. Version bump to `v0.0.31`
12. Update MASTER-CONTEXT.md + CHANGELOG.md

### Choice B — Table + Service Layer Only (no guard changes)
Same as A except:
- Unit-access guard `GLOBAL_ACCESS_ROLES` stays hardcoded
- `@Roles()` decorators in controllers unchanged
- Safer/smaller scope

### Choice C — Table + Seed Only (no code migration yet)
- Only the SQL migration and TypeORM entity
- Existing code untouched
- Sets up the DB foundation so the code migration can be done in a controlled follow-up

---

### Sub-Choice: Should `desktop_sr`, `it_support_sr`, `pantawid_ict` get controller-level focal access?

Currently their `role_definitions.roleCode = null`, so `@Roles('focal')` denies them compliance endpoints.  
The capability table marks them `is_focal=1` at SERVICE level — but the controller `@Roles()` guard still blocks those endpoints.

| Sub-Choice | Action | Effect |
|---|---|---|
| **P** — Service focal only | No change to `roleCode` | Desktop/IT/Pantawid roles can be checked in service logic but blocked at controller `@Roles('focal')` endpoints |
| **Q** — Full focal controller access | Set `role_definitions.role_code = 'focal'` for `desktop_sr`, `it_support_sr`, `pantawid_ict` | These roles gain access to ALL compliance document endpoints, review pages, issuances, etc |
| **R** — Senior techs only get focal controller access | Set `role_code = 'focal'` for `desktop_sr`, `it_support_sr` only; `pantawid_ict` stays as-is | Partial elevation |

---

## 14. Version History

| Version | Date | Summary |
|---|---|---|
| v0.0.30 | 2026-04-16 | Remove 8 legacy roles (reviewer, focal, technician, auditor, and 4 technician_* variants); fix DB table ownership; create attendance BASE TABLE in compliance_hub_users |
| v0.0.31 | TBD | Add `role_capabilities` table; replace all hardcoded role arrays |
