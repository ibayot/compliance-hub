# AGENT-CONTEXT — Compliance Hub (Antigravity Working Context)

> **Keeper file for Antigravity agent.** Updated to reflect live codebase state.
> MASTER-CONTEXT.md is at v0.0.31 — significantly STALE. This file adds all deltas through **v0.0.60**.
> Git repo: `https://github.com/ibayot/compliance-hub.git` (branch: `microservices`)

---

## 1. Project Overview

**Compliance Hub** is an internal ICT compliance and help-desk management application for **DSWD-RICTMS** (Regional ICT Infrastructure and Monitoring Service). Manages:
- ICT compliance document submissions, review workflows, reportorial tracking
- KPI monitoring, Means of Verification (MoV) artifacts, compliance reports
- Help-desk ticketing: IT support, desktop support, Pantawid ICT support
- Attendance tracking for ITO professional staff and technicians
- Cybersecurity and information security incident management
- Organization unit management and user/role directory
- Document repositories with version history, preview generation, metrics extraction
- Issuance management (ICT-referenced issuances from government bodies)

---

## 2. Technology Stack

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 14 (App Router) + React + TypeScript | Runs at :3000 |
| UI Library | Material UI (MUI) v5 | ThemeModeContext (dark/light) |
| Backend | NestJS (TypeScript) — 4 services (gateway + 3 microservices) | Monorepo in `/backend/` |
| Database | MariaDB 11 — XAMPP local / Docker prod | 3 databases |
| ORM | TypeORM | `DB_SYNCHRONIZE=false` — ALL schema changes are manual SQL migrations |
| Auth | JWT (access + refresh) + optional Google OAuth (ID token) | sessionStorage (NOT localStorage since v0.0.37) |
| Queue | Bull (Redis-backed) | Document preview/text extraction |
| File Storage | Local filesystem (`./storage`) or AWS S3 | Configurable via env |
| Inter-Service | http-proxy-middleware (gateway) + custom HTTP clients | `UsersHttpClient`, `ComplianceHttpClient` |
| Event Bus | Redis pub/sub (`EventBusService`) | Cache invalidation for role capabilities |
| Rate Limiting | express-rate-limit | 1000 req/15min on `/api` and `/api/v1` |
| Security | helmet, timing-safe comparisons, sessionStorage tokens | OWASP hardening pass in v0.0.37 |

---

## 3. Microservices Architecture (CURRENT — v0.0.50+)

### 3.1 Service Map

| Service | Entry Point | Port | Database | Image Tag |
|---|---|---|---|---|
| API Gateway (HTTP) | `gateway.main.ts` | 4000 | Proxy only | `compliance-hub/api-gateway` |
| Users Service | `users-service.main.ts` | 4101 | `compliance_hub_users` | `compliance-hub/users-service` |
| Ticketing Service | `ticketing-service.main.ts` | 4102 | `compliance_hub_ticketing` | `compliance-hub/ticketing-service` |
| Compliance Service | `compliance-service.main.ts` | 4103 | `compliance_hub` | `compliance-hub/compliance-service` |

> **Deployment reality**: 4 Docker containers on 1 virtual server with 1 MariaDB instance hosting 3 logical databases (single-vm-multi-container topology).

### 3.2 Gateway Route Map

| Path Prefix | Routes To | Port |
|---|---|---|
| `/api/auth` | users-service | 4101 |
| `/api/users` | users-service | 4101 |
| `/api/units` | users-service | 4101 |
| `/api/tickets` | ticketing-service | 4102 |
| `/api/attendance` | ticketing-service | 4102 |
| `/api/ticket-settings` | ticketing-service | 4102 |
| `/api/documents` | compliance-service | 4103 |
| `/api/document-types` | compliance-service | 4103 |
| `/api/comparisons` | compliance-service | 4103 |
| `/api/issuances` | compliance-service | 4103 |
| `/api/metrics` | compliance-service | 4103 |
| `/api/incidents` | compliance-service | 4103 |
| `/api/cybersecurity` | compliance-service | 4103 |
| `/api/kpi` | compliance-service | 4103 |
| `/api/mov` | compliance-service | 4103 |
| `/api/compliance/role-capabilities` | users-service | 4101 (alias) |
| `/api/v1/*` | Same as above | All (v1 alias added in v0.0.54) |

### 3.3 Module Composition (per service)

```
UsersServiceAppModule
  └── AuthModule      (login, Google OAuth, JWT, refresh, change-password, reauthenticate)
  └── UsersModule     (CRUD users, role definitions, role capabilities CRUD)
  └── UnitsModule     (unit management — BASE TABLE owner)
  └── InternalModule  (internal HTTP endpoints for service-to-service calls — v0.0.50)
  └── HttpClientsModule (shared HTTP clients)

TicketingServiceAppModule
  └── TicketsModule   (tickets, attendance, ticket-settings, email, escalations)
  └── HttpClientsModule (UsersHttpClient, RoleCapabilitiesHttpClient)

ComplianceServiceAppModule
  └── DocumentsModule (doc upload, versioning, storage, processing queue)
  └── MetricsModule   (compliance metrics computation)
  └── ReviewsModule   (manual review, comparison)
  └── ReferencesModule (issuances)
  └── IncidentsModule (incident reports)
  └── CybersecurityModule (cybersec dashboards)
  └── KpiModule       (KPI tracking)
  └── MovModule       (MoV artifacts)
  └── HttpClientsModule (UsersHttpClient, ComplianceHttpClient, RoleCapabilitiesHttpClient)
```

---

## 4. Database Schema

### 4.1 Database Ownership

| Database | BASE TABLES | VIEWs (read-only, pointing to other DBs) |
|---|---|---|
| `compliance_hub_users` | `users`, `role_definitions`, `role_capabilities`, `user_unit_access`, `attendance` | `units` → compliance_hub.units |
| `compliance_hub_ticketing` | `tickets`, `ticket_comments`, `ticket_events`, `ticket_categories`, `ticket_keyword_rules`, `ticket_issue_types`, `ticket_escalations`, `escalation_focal_configs`, `office_days` | `users`, `attendance`, `role_definitions`, `role_capabilities`, `units` |
| `compliance_hub` | `units`, `documents`, `document_versions`, `document_references`, `document_assignments`, `manual_reviews`, `version_comparisons`, `reportorial_document_types`, `issuances`, `metrics`, `metric_templates`, `metric_applicability`, `metric_results`, `incidents`, `incident_daily_snapshots`, `cybersecurity_metrics`, `kpi_master`, `kpi_monitoring`, `kpi_thresholds`, `kpi_scoring_rules`, `mov_artifacts` | `attendance`, `role_capabilities`, `role_definitions`, `users` |

> **CRITICAL SQL RULE**: `users`, `attendance`, `role_definitions`, `role_capabilities` are BASE TABLES ONLY in `compliance_hub_users`. NEVER create them as BASE TABLES in other databases.
> **NOTE on `document_issuances`**: The pivot table `document_issuances` in the `compliance_hub` database has been changed/simplified to the `issuances` table. `issuances` is the sole source of truth for this domain, and code/database configurations must reflect this update.

### 4.2 Key Table Schemas

#### `compliance_hub_users.users`
```sql
users (
  id INT AUTO_INCREMENT PK,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255),
  first_name, middle_name, last_name, suffix VARCHAR(255),
  staff_id, position, position_full, designation VARCHAR(255),
  ticket_main_focal TINYINT(1) DEFAULT 0,  -- per-user: primary ticket focal
  ticket_technician TINYINT(1) DEFAULT 0,  -- per-user: is a technician
  auth_provider ENUM('local','google') DEFAULT 'local',
  google_sub VARCHAR(255) UNIQUE,
  role ENUM(20 roles) DEFAULT 'user',
  active TINYINT(1) DEFAULT 1,
  last_login DATETIME, created_at DATETIME, updated_at DATETIME
)
```

#### `compliance_hub_users.role_capabilities` (v0.0.31 — EXPANDED to v0.0.50)
```sql
role_capabilities (
  id INT AUTO_INCREMENT PK,
  role_value VARCHAR(50) UNIQUE,
  is_focal TINYINT(1) DEFAULT 0,
  is_desktop TINYINT(1) DEFAULT 0,
  is_it_support TINYINT(1) DEFAULT 0,
  is_pantawid_ict TINYINT(1) DEFAULT 0,
  is_ito TINYINT(1) DEFAULT 0,
  is_escalation_focal TINYINT(1) DEFAULT 0,
  is_ticket_settings_focal TINYINT(1) DEFAULT 0,  -- v0.0.32
  is_all_tickets TINYINT(1) DEFAULT 0,             -- v0.0.33
  is_ticket_focal TINYINT(1) DEFAULT 0,            -- v0.0.33
  is_kpi_access TINYINT(1) DEFAULT 0,              -- v0.0.42/v0.0.49+
  is_kpi_manage TINYINT(1) DEFAULT 0,
  is_attendance_access TINYINT(1) DEFAULT 0,
  is_attendance_manage TINYINT(1) DEFAULT 0,
  is_reports_access TINYINT(1) DEFAULT 0,
  is_reviews_access TINYINT(1) DEFAULT 0,
  is_mov_access TINYINT(1) DEFAULT 0,
  is_documents_access TINYINT(1) DEFAULT 0,
  is_repository_access TINYINT(1) DEFAULT 0,
  is_issuances_access TINYINT(1) DEFAULT 0,
  is_metrics_access TINYINT(1) DEFAULT 0,
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
  priority VARCHAR(10) NULL,
  category_id VARCHAR(36) NULL, requester_id INT NULL, reported_by_id INT NULL,
  assigned_to_id INT NULL, resolution_notes TEXT NULL, resolved_at DATETIME NULL,
  sla_deadline DATETIME NULL, satisfaction_rating TINYINT NULL,
  satisfaction_comment TEXT NULL, satisfaction_submitted_at DATETIME NULL,
  satisfaction_form_data TEXT NULL,
  duplicate_of_id VARCHAR(36) NULL, user_closed TINYINT(1) DEFAULT 0,
  created_at DATETIME, updated_at DATETIME
)
```

---

## 5. Role System (CURRENT v0.0.31+)

### 5.1 UserRole Enum (20 Roles)

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
| DESKTOP_SR | desktop_sr | **focal** | desktop_support | 1 | 0 | 1 | 0 | 0 | 1 |
| IT_SUPPORT_SR | it_support_sr | **focal** | it_support | 1 | 0 | 0 | 1 | 0 | 1 |
| DESKTOP_JR | desktop_jr | null | desktop_support | 0 | 0 | 1 | 0 | 0 | 0 |
| IT_SUPPORT_JR | it_support_jr | null | it_support | 0 | 0 | 0 | 1 | 0 | 0 |
| PANTAWID_ICT | pantawid_ict | **focal** | pantawid_ict_support | 1 | 0 | 0 | 0 | 1 | 0 |
| USER | user | null | null | 0 | 0 | 0 | 0 | 0 | 0 |

### 5.2 Multi-Layer Role System

**Layer 1 — `user.role`**: Raw role string in JWT and DB.

**Layer 2 — `user.roleCode`** (from `role_definitions.role_code`):
- In JWT payload. `RolesGuard` matches: `user.role === role || user.roleCode === role`
- `@Roles('focal')` → all roles with `roleCode = 'focal'`
- Frontend: `user?.roleCode === 'focal'`

**Layer 3 — `role_capabilities` flags** (DB-driven boolean matrix):
- Accessed via `RoleCapabilitiesService` (users-service) or `RoleCapabilitiesHttpClient` (ticketing/compliance)
- NO hardcoded role arrays in service code

**Layer 4 — per-user overrides**: `ticketMainFocal`, `ticketTechnician` on `users` table.

### 5.3 RoleCapabilitiesService (users-service) / RoleCapabilitiesHttpClient (other services)

`backend/src/modules/users/role-capabilities.service.ts` — startup-cached, direct DB access.
`backend/src/common/http-clients/role-capabilities.http-client.ts` — ticketing/compliance use this instead.

| Method | Description |
|---|---|
| `isFocal(role)` | Compliance document access |
| `isIto(role)` | Non-tech ITO professional staff (attendance ITO group) |
| `isDesktop(role)` | Desktop/hardware ticket handler |
| `isItSupport(role)` | IT/software ticket handler |
| `isPantawidIct(role)` | Pantawid ICT ticket handler |
| `isEscalationFocal(role)` | Can receive escalated tickets |
| `isTechnician(role)` | Any technician (desktop ∨ IT ∨ Pantawid) |
| `isSeniorTech(role)` | isFocal AND (isDesktop OR isItSupport) |
| `isTicketSettingsFocal(role)` | Ticket settings management access |
| `isAllTickets(role)` | Can see all tickets (not just own) |
| `isTicketFocal(role)` | Can assign/reassign tickets |
| `isKpiAccess/Manage(role)` | KPI read / write access |
| `isAttendanceAccess/Manage(role)` | Attendance read / write |
| `isReportsAccess/ReviewsAccess/MovAccess(role)` | Module access flags |
| `isDocumentsAccess/RepositoryAccess/IssuancesAccess/MetricsAccess(role)` | More module flags |
| `canSeeAllTickets(role)` | Alias for `isAllTickets` |
| `canChangePriority(role)` | isFocal OR isIto OR any technician |
| `isSeniorAuthority(role)` | super_admin OR isFocal OR isIto |
| `canAssignTickets(role)` | isTicketFocal OR isTicketSettingsFocal |
| `canEscalateTickets(role)` | canAssignTickets OR canSeeAllTickets OR any technician |
| `getRolesWhere(cap)` | All roles with that capability = true |
| `getSeniorTechRoles()` | Senior tech role values |
| `getTechnicianRoles()` | All technician role values |
| `findAll() / findOne() / updateOne()` | Admin CRUD (users-service only) |

### 5.4 CapabilityGuard (v0.0.43+)

`backend/src/common/guards/capability.guard.ts` — enforces `role_capabilities` flags on routes.
Use `@RequireCapability('isKpiAccess')` + `@UseGuards(JwtAuthGuard, RolesGuard, CapabilityGuard)`.
All 20 capability keys are mapped. `super_admin` always passes.

### 5.5 GLOBAL_ACCESS_ROLES (UnitAccessGuard)

```typescript
const GLOBAL_ACCESS_ROLES = new Set(['super_admin', 'section_head', 'compliance_officer', 'cybersec', 'infosec']);
```
`roleCode === 'focal'` or `'technician'` — unit-scoped access only.

---

## 6. Authentication Flow

1. `POST /api/auth/login` → `AuthService.login()` → bcrypt verify → `generateTokens()`
2. `generateTokens()` → `usersService.getRoleCodeForRole(user.role)` → queries `role_definitions.role_code`
3. JWT payload: `{sub, email, role, roleCode, units[]}`
4. Returns `{accessToken, refreshToken, user: {..., roleCode, units}}`
5. Frontend stores tokens in **`sessionStorage`** (changed from localStorage in v0.0.37!)
6. `ApiClient` sends `Authorization: Bearer <token>` on every request
7. On 401: refresh via `POST /api/auth/refresh` → update sessionStorage → retry
8. Google OAuth: `POST /api/auth/google-login` with `{idToken}` → verify via Google API → same flow
9. Session lock after 15 min inactivity (`AuthContext`) → reauthenticate via `POST /api/auth/reauthenticate`

**Login side effects:**
- `attendanceService.autoCorrectAbsentOnLogin()` — marks user present if absent
- `ticketService.assignPendingTicketsOnLogin()` — auto-assigns queued OPEN tickets

**Heartbeat**: AuthContext polls `GET /api/auth/me` every 60s to detect deactivated accounts.

---

## 7. Inter-Service Communication (v0.0.50+)

### HTTP Clients

| Client | File | Usage |
|---|---|---|
| `UsersHttpClient` | `common/http-clients/users.http-client.ts` | Enriches user data in compliance/ticketing services |
| `ComplianceHttpClient` | `common/http-clients/compliance.http-client.ts` | Enriches unit data in users/ticketing services |
| `RoleCapabilitiesHttpClient` | `common/http-clients/role-capabilities.http-client.ts` | Drop-in replacement for `RoleCapabilitiesService` in non-users services |

### Internal Service Guard

`InternalServiceGuard` on `InternalModule` endpoints (`/api/internal/*`).
Validates `X-Service-Token` against `INTERNAL_SERVICE_TOKENS` env (per-service map) with fallback to `INTERNAL_SERVICE_SECRET`.

### Event Bus

`EventBusService` — Redis pub/sub for cache invalidation.
`capabilities.updated` event → `RoleCapabilitiesHttpClient` reloads its in-memory cache.

### Correlation IDs

`CorrelationIdMiddleware` — generates/preserves `X-Request-ID` UUID on every request.
Gateway propagates it to all downstream services. All services echo it back.

---

## 8. Frontend Architecture

### 8.1 Key Contexts

| Context | File | Purpose |
|---|---|---|
| `AuthContext` | `contexts/AuthContext.tsx` | user, myCap, login/logout, session lock, heartbeat |
| `SidebarContext` | `contexts/SidebarContext.tsx` | Sidebar open/close state |
| `PageTitleContext` | `contexts/PageTitleContext.tsx` | Dynamic page titles |
| `ThemeModeContext` | `contexts/ThemeModeContext.tsx` | Light/dark mode toggle |

**Key AuthContext additions** (not in MASTER-CONTEXT):
- `myCap: RoleCapabilityRecord | null` — the current user's capability row, fetched via `usersApi.getMyCapabilities()` after login
- `isSessionLocked: boolean` — 15min inactivity lock
- `unlockSession(password)` — reauthenticate without logout

### 8.2 API Client

`frontend/src/lib/api/client.ts`:
- Base URL: `VITE_API_URL` env var or `/api` (Vite proxy in dev)
- Auto-adds `Authorization: Bearer <accessToken>` header
- Tokens in `sessionStorage` (NOT localStorage)
- 401 interceptor: queue-based single-refresh-at-a-time pattern → redirect to `/login?reason=session_expired`

### 8.3 Frontend Role Checks Pattern

```typescript
// From JWT
const isFocal = user?.roleCode === 'focal';
const isComplianceOfficer = user?.role === 'compliance_officer' || user?.roleCode === 'compliance_officer';
const isSuperAdmin = user?.role === 'super_admin';

// From myCap (capability matrix)
const canSeeTicketSettings = myCap?.isTicketSettingsFocal;
const canManageKpi = myCap?.isKpiManage;
```

### 8.4 Dashboard Pages

| Route | Access | Purpose |
|---|---|---|
| `/dashboard` | All authenticated | Main dashboard with widgets |
| `/dashboard/documents` | isDocumentsAccess | Document list/upload/workflow |
| `/dashboard/tickets` | All staff | Ticket list (role-filtered) |
| `/dashboard/attendance` | isAttendanceAccess | Daily attendance grid |
| `/dashboard/issuances` | isIssuancesAccess | ICT issuance library |
| `/dashboard/reviews` | isReviewsAccess | Document review queue |
| `/dashboard/reports` | isReportsAccess | Compliance reports |
| `/dashboard/kpi` | isKpiAccess | KPI monitoring |
| `/dashboard/metrics` | isMetricsAccess | Metrics dashboard |
| `/dashboard/mov` | isMovAccess | MoV artifact management |
| `/dashboard/incidents` | cybersec + infosec + super_admin | Cybersecurity incidents |
| `/dashboard/units` | super_admin | Unit management |
| `/dashboard/settings` | super_admin | System settings, user management |
| `/dashboard/ticket-settings` | isTicketSettingsFocal | Ticket categories, keyword rules |
| `/dashboard/ticket-reports` | All (backend scope-filtered) | Ticket reports and analytics |
| `/dashboard/repository` | isRepositoryAccess | Compliant document repository |
| `/dashboard/user-manual` | All | In-app user manual |

---

## 9. Ticket System Logic

### 9.1 Ticket Types
- `it_support` — IT/software (handled by IT_SUPPORT_SR, IT_SUPPORT_JR)
- `desktop_support` — Hardware/desktop (handled by DESKTOP_SR, DESKTOP_JR)
- `pantawid_ict_support` — Pantawid-specific ICT (handled by PANTAWID_ICT)

### 9.2 Ticket Status Flow
```
OPEN → ASSIGNED → IN_PROGRESS → RESOLVED → CLOSED
     ↘ FREEZE (any status → FREEZE → back to previous)
     ↘ DUPLICATE (terminal)
```

### 9.3 Ticket Visibility Rules (DB-driven via role_capabilities)
- `isAllTickets = 1`: sees ALL tickets (super_admin, section_head, compliance_officer, cybersec, infosec, desktop_sr, it_support_sr, pantawid_ict)
- ITO staff roles: see only tickets assigned to them OR submitted by them
- All other roles: see only own assigned/submitted tickets

### 9.4 Auto-Assignment Logic
1. Check office day AND technician marked PRESENT in attendance
2. Pantawid: always auto-assign to `pantawid_ict` tech with fewest open tickets
3. Other: filter out SENIOR techs (`isSeniorTech()`) — they self-assign
4. Pick junior tech with ZERO active tickets (strict zero)
5. On tech login: `assignPendingTicketsOnLogin()` processes their OPEN ticket queue

### 9.5 Escalation System
- `isEscalationFocal = 1` → can receive escalated tickets
- `isTicketFocal = 1` → can assign/reassign tickets
- Escalation focal configs stored in `escalation_focal_configs` table
- Accepts escalation → auto-sets ticket to `in_progress`
- Proof files stored in `storage/escalation-proof/`

---

## 10. Document System

### 10.1 Document Submission Pipeline
1. Upload → saved to `storage/documents/`
2. Enqueued to Bull queue (`document-processing`)
3. `DocumentProcessor`: extracts text from DOCX/PDF → stores in `documents.extracted_text`
4. `MetricsService`: computes compliance metrics
5. Preview generated in `storage/previews/`

### 10.2 Blob Storage Columns (v0.0.49+)
`document_versions.file_blob`, `document_versions.preview_blob`, `documents.file_blob` — LONGBLOB columns for inline storage as fallback.

---

## 11. Key Source Files

### Backend
| File | Purpose |
|---|---|
| `src/apps/gateway.main.ts` | HTTP reverse proxy — all route registrations, CORS, rate limiting, health, correlation ID |
| `src/apps/users-service.main.ts` | Users microservice entry (port 4101) |
| `src/apps/users-service.module.ts` | Users module registration (AuthModule, UsersModule, UnitsModule, InternalModule) |
| `src/apps/ticketing-service.main.ts` | Ticketing microservice entry (port 4102) |
| `src/apps/ticketing-service.module.ts` | Ticketing module registration (TicketsModule, HttpClientsModule) |
| `src/apps/compliance-service.main.ts` | Compliance microservice entry (port 4103) |
| `src/apps/compliance-service.module.ts` | Compliance module registration (all compliance modules + HttpClientsModule) |
| `src/apps/compliance-jwt.strategy.ts` | JWT decode for compliance/users services |
| `src/apps/ticketing-jwt.strategy.ts` | JWT decode for ticketing service |
| `src/modules/users/entities/user.entity.ts` | `UserRole` enum (20 roles) + User ORM entity |
| `src/modules/users/entities/role-capability.entity.ts` | `role_capabilities` ORM entity (19 boolean columns) |
| `src/modules/users/entities/role-definition.entity.ts` | `role_definitions` ORM entity |
| `src/modules/users/role-capabilities.service.ts` | Startup-cached capability service (users-service) |
| `src/modules/users/users.service.ts` | User CRUD, role definitions CRUD, roleCode lookup |
| `src/modules/users/users.module.ts` | Exports UsersService, RoleCapabilitiesService |
| `src/modules/auth/auth.service.ts` | Login, Google OAuth, JWT, refresh, reauthenticate |
| `src/modules/auth/interfaces/auth.interface.ts` | JwtPayload, AuthResponse types |
| `src/modules/tickets/tickets.module.ts` | RoleCapabilitiesService provided by RoleCapabilitiesHttpClient |
| `src/modules/tickets/services/ticket.service.ts` | Core ticket logic — all role checks use RoleCapabilitiesService |
| `src/modules/tickets/services/attendance.service.ts` | Technician attendance — uses RoleCapabilitiesService |
| `src/modules/tickets/services/ticket-settings.service.ts` | Categories, keyword rules, escalation focal config |
| `src/modules/tickets/services/email.service.ts` | Ticket email notifications |
| `src/modules/documents/services/document.service.ts` | Document logic — uses RoleCapabilitiesService |
| `src/modules/internal/internal.controller.ts` | `/api/internal/users`, `/api/internal/units` — InternalServiceGuard |
| `src/common/guards/roles.guard.ts` | Checks `user.role === role || user.roleCode === role` |
| `src/common/guards/unit-access.guard.ts` | Per-unit access scoping (GLOBAL_ACCESS_ROLES) |
| `src/common/guards/capability.guard.ts` | `@RequireCapability(flag)` guard — uses RoleCapabilitiesService |
| `src/common/guards/internal-service.guard.ts` | `X-Service-Token` guard for internal endpoints |
| `src/common/http-clients/role-capabilities.http-client.ts` | HTTP-based drop-in for RoleCapabilitiesService |
| `src/common/http-clients/users.http-client.ts` | HTTP calls to users-service |
| `src/common/http-clients/compliance.http-client.ts` | HTTP calls to compliance-service |
| `src/common/events/event-bus.service.ts` | Redis pub/sub for cache invalidation |
| `src/common/middleware/correlation-id.middleware.ts` | X-Request-ID propagation |
| `src/common/security/security-validators.ts` | Centralized OWASP-aligned validators |
| `backend/SERVICE-OWNERSHIP.md` | Machine-readable table/API ownership map |
| `backend/SERVICE-DEPENDENCY-GRAPH.json` | Service dependency + topology metadata |

### Frontend
| File | Purpose |
|---|---|
| `src/lib/types/auth.ts` | `UserRole` enum (mirrors backend) |
| `src/lib/api/client.ts` | Axios instance — sessionStorage tokens, queue-based 401 handler |
| `src/contexts/AuthContext.tsx` | Auth state, myCap, session lock, heartbeat |
| `src/components/layout/Sidebar.tsx` | Nav item visibility by role + capability |
| `src/app/dashboard/tickets/page.tsx` | Ticket list with role/capability-based filtering |
| `src/app/dashboard/documents/page.tsx` | Document list with focal access check |
| `src/app/dashboard/attendance/page.tsx` | Attendance grid for senior techs + ITO |

---

## 12. Conventions & Rules

- **`DB_SYNCHRONIZE=false`**: ALL schema changes are manual SQL migration files. TypeORM never auto-syncs.
- **Migration naming**: `backend/database/vX.Y.Z-migration.sql` (one file per version)
- **Schema changes as code**: From v0.0.50, services must NOT do DDL in `onModuleInit()`. DDL goes to migration files.
- **Versioning**: Semantic versioning. PATCH bump for every production change. Both `backend/package.json` and `frontend/package.json` updated together.
- **`@Roles()` decorator**: Use `UserRole.ENUM_NAME` for direct role match; string literals like `'focal'`, `'compliance_officer'` for roleCode routing.
- **No hardcoded role arrays in services**: Use `RoleCapabilitiesService` or `RoleCapabilitiesHttpClient`.
- **Frontend role checks**: `user?.roleCode === 'focal'` (not `user?.role === 'focal'`) for named focal roles.
- **myCap over role checks**: For capability-backed features, use `myCap?.isXxx` in frontend.
- **Token storage**: sessionStorage, NOT localStorage (changed in v0.0.37 security pass).
- **SQL injection prevention**: Parameterized TypeORM QueryBuilder; never string interpolation for user data.
- **Input validation**: class-validator DTOs. Trim string inputs before persistence.
- **Cross-DB VIEWs**: Acceptable bridge under current constraints (single-VM). Views must use `SELECT *` so new columns auto-propagate to all viewer DBs.
- **`document_issuances`**: This table has been changed/simplified to the `issuances` table in the `compliance_hub` database.
- **Service write rules**: Each service writes ONLY to its own DB. Cross-DB access is read-only via views.

---

## 13. Files NOT to Touch Without Explicit Instruction

- `backend/src/database/init.sql` — Legacy init file
- `backend/src/database/schema.sql` — Legacy full schema
- `backend/database/microservices-migrate.sql` — One-time migration script
- Any existing database VIEW in non-owner DBs
- `backend/src/modules/shared/entities/` — Shared entity stubs (read-only cross-service)

---

## 14. Build Commands

```powershell
# Backend — build all services
cd backend; npx nest build

# Backend — start individual services
node dist/apps/gateway.main.js       # port 4000
node dist/apps/users-service.main.js  # port 4101
node dist/apps/ticketing-service.main.js # port 4102
node dist/apps/compliance-service.main.js # port 4103

# npm run scripts
npm run start:gateway:dev    # gateway watch mode
npm run start:users:dev      # users service watch mode
npm run start:ticketing:dev  # ticketing service watch mode
npm run start:compliance:dev # compliance service watch mode

# Frontend — type-check only
cd frontend; npx tsc --noEmit 2>&1 | Select-Object -First 60

# Frontend — dev server
cd frontend; npm run dev

# SQL migration
$sql = Get-Content "backend\database\vX.Y.Z-migration.sql" -Raw
$sql | & "C:\xampp\mysql\bin\mysql.exe" -u root -proot

# Verify DB state
"SELECT role_value, is_focal, is_all_tickets FROM compliance_hub_users.role_capabilities ORDER BY role_value" | & "C:\xampp\mysql\bin\mysql.exe" -u root -proot
```

---

## 15. Environment Variables

| Variable | Service | Default | Notes |
|---|---|---|---|
| `NODE_ENV` | All | development | |
| `PORT` | Gateway | 4000 | Microservices: USERS_SERVICE_PORT=4101, etc. |
| `SERVICE_NAME` | All | — | Identifies service in logs/health |
| `DB_HOST/PORT/USERNAME/PASSWORD` | All | localhost/3306/root/root | |
| `DB_DATABASE` | All | compliance_hub | Fallback |
| `USERS_DB_DATABASE` | Users | compliance_hub_users | |
| `TICKETING_DB_DATABASE` | Ticketing | compliance_hub_ticketing | |
| `COMPLIANCE_DB_DATABASE` | Compliance | compliance_hub | |
| `DB_SYNCHRONIZE` | All | false | Must stay false |
| `JWT_SECRET` | Users | — | min 16 chars |
| `JWT_EXPIRATION` | Users | 30m | |
| `JWT_REFRESH_SECRET` | Users | — | min 16 chars |
| `JWT_REFRESH_EXPIRATION` | Users | 7d | |
| `JWT_ISSUER` | All | compliance-hub-api | |
| `JWT_AUDIENCE` | All | compliance-hub-client | |
| `GOOGLE_CLIENT_ID` | Users | — | Optional |
| `REDIS_HOST/PORT` | Compliance | localhost/6379 | Also users for event bus |
| `STORAGE_TYPE` | Compliance | local | or s3 |
| `STORAGE_PATH` | Compliance | ./storage | |
| `MAX_FILE_SIZE` | Compliance | 52428800 (50MB) | |
| `CORS_ORIGIN` | All | http://localhost:3000 | Comma-separated |
| `RATE_LIMIT_WINDOW_MS` | Gateway | 900000 | |
| `RATE_LIMIT_MAX_REQUESTS` | Gateway | 1000 | |
| `USERS_SERVICE_URL` | Gateway/Ticketing/Compliance | http://localhost:4101 | |
| `TICKETING_SERVICE_URL` | Gateway | http://localhost:4102 | |
| `COMPLIANCE_SERVICE_URL` | Gateway/Users/Ticketing | http://localhost:4103 | |
| `INTERNAL_SERVICE_SECRET` | All microservices | — | Legacy shared secret |
| `INTERNAL_SERVICE_TOKEN` | Each service | — | Per-service identity token |
| `INTERNAL_SERVICE_TOKENS` | Users | — | JSON map of per-service tokens |
| `MICROSERVICES_STRICT` | Gateway | true | false = continue even if service down |

---

## 16. Migration History (v0.0.30 → current)

| File | Version | Description |
|---|---|---|
| `backend/database/v0.0.30-migration.sql` | v0.0.30 | Remove 8 legacy roles, fix DB table ownership |
| `backend/database/v0.0.31-migration.sql` | v0.0.31 | Add role_capabilities table (6 flags) + seed + VIEWs + roleCode elevation |
| `backend/database/v0.0.32-migration.sql` | v0.0.32 | Add is_ticket_settings_focal column |
| `backend/database/v0.0.33-migration.sql` | v0.0.33 | Add is_all_tickets + is_ticket_focal columns |
| `backend/database/migrations/v0.0.49-schema-baseline.sql` | v0.0.49 | Capture all runtime self-healing DDL as explicit migration |
| `backend/database/migrations/v0.0.50-service-ddl-extraction.sql` | v0.0.50 | Document DDL removed from services + add 11 module-access columns to role_capabilities |

---

## 17. Deltas: MASTER-CONTEXT.md (v0.0.31) vs. Live Codebase (v0.0.60)

The MASTER-CONTEXT.md is STALE at v0.0.31. Key things it misses:

| What Changed | Where |
|---|---|
| `role_capabilities` table gained 13 more columns (is_ticket_settings_focal, is_all_tickets, is_ticket_focal, is_kpi_access, is_kpi_manage, is_attendance_access, is_attendance_manage, is_reports_access, is_reviews_access, is_mov_access, is_documents_access, is_repository_access, is_issuances_access, is_metrics_access) | v0.0.32/33/42/49/50 |
| `RoleCapabilitiesService` has 20+ methods (not just the 8 in MASTER-CONTEXT) | role-capabilities.service.ts |
| `RoleCapabilitiesHttpClient` — drop-in replacement for cross-service use | common/http-clients/ |
| `CapabilityGuard` — new guard for controller-level capability enforcement | common/guards/capability.guard.ts |
| Token storage moved from localStorage → sessionStorage | v0.0.37 |
| Session lock after 15min inactivity | AuthContext.tsx |
| `myCap` in AuthContext — user's own capability row | AuthContext.tsx |
| Microservices are LIVE (not future) — gateway proxies to 4101/4102/4103 | gateway.main.ts |
| `/api/v1/*` alias routes added | v0.0.54 |
| `InternalModule` + `InternalServiceGuard` for service-to-service auth | v0.0.50 |
| HTTP inter-service clients (UsersHttpClient, ComplianceHttpClient) | v0.0.50 |
| Correlation ID middleware across all services | v0.0.50/53 |
| DDL no longer lives in service `onModuleInit()` — all schema is in migration files | v0.0.50 |
| Redis EventBus for capability cache invalidation | v0.0.52 |
| All compliance module controllers use `CapabilityGuard` (KPI, MoV, Reviews, Issuances) | v0.0.43 |
| `SERVICE-OWNERSHIP.md` added to backend | v0.0.49 |
| `INTERNAL_SERVICE_TOKENS` per-service token map | v0.0.54 |
| Port numbers in MASTER-CONTEXT are wrong (says 4001/4002/4003 in one section; actual is 4101/4102/4103) | — |
| `ticket_issue_types` table added to ticketing DB | backend/ |
| Reporting ticket endpoint scope splits (privileged vs. own-only) | v0.0.45 |
| Security: timing-safe comparison, sandboxed iframes for previews, path traversal protection | v0.0.37 |
| Health endpoints: `/api/health`, `/api/health/live`, `/api/health/ready` on all services | v0.0.49 |
| Backend version is now **0.0.60** (not 0.0.31) | backend/package.json |

---

## 18. Current Version State

- **Backend**: `0.0.60` (`backend/package.json`)
- **Database Schema Update**: The pivot table `document_issuances` in the `compliance_hub` database has been updated and simplified directly to the `issuances` table.
- **Latest Git commit**: `ac84df5` — "Improve escalation matrix smoke coverage and diagnostics"
- **Branch**: `microservices`
- **Most recent notable commits**:
  - `ac84df5` — escalation smoke coverage
  - `fa033bb` — fix escalation tab visibility
  - `aa14b75` — align ticketing escalation access to capability matrix
  - `6c07bdf` — enforce escalation focal matrix semantics
  - `f981ae6` — fix ticket visibility to honor isAllTickets only
  - `cbffcdc` — harden service bootstrap readiness + gateway route versioning
  - `3365acc` — update architecture docs + version metadata
  - `cfd2d42` — v0.0.52: circuit breaker, readiness checks, OpenAPI, role-caps HTTP endpoint
  - `ec233cf` — v0.0.50: service DDL extraction, HTTP inter-service clients
  - `d4e878` — auth: sync role matrix rows and phase-2 capability guards

---

## 19. Health Endpoints (per service)

| Endpoint | Purpose |
|---|---|
| `GET /api/health` | Legacy liveness (always 200 OK) |
| `GET /api/health/live` | Liveness — always 200 if process running |
| `GET /api/health/ready` | Readiness — DB + critical view/Redis checks + topology metadata |

Gateway aggregates health of all 3 services at its own `GET /api/health`.

### Recent Changes by Antigravity
- **Ticketing Service**: Fixed issue_type nullable schema mismatch in 	icket.entity.ts and 	icket.service.ts to adhere to DB NOT NULL DEFAULT 'other' constraint.
