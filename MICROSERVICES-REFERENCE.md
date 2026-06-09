# Compliance Hub — Microservices Reference

> **Note:** This file is working documentation only. It is NOT committed to git.
> Generated: v0.0.29

---

## Architecture Overview

```
Browser / Frontend (Next.js :3000)
        │
        ▼
  Gateway (:4000)  ── http-proxy-middleware ──►  Users Service (:4101)
                                              └─►  Ticketing Service (:4102)
                                              └─►  Compliance Service (:4103) [future]
```

In **development/production**, the monolith (`main.ts` → `AppModule`) runs all modules on port `4000` directly. The microservices split (`users-service.main.ts`, `ticketing-service.main.ts`) is reserved for future scaling.

---

## Service 1 — Users Service (Port 4101)

**Entry:** `src/apps/users-service.main.ts`  
**Module:** `UsersServiceAppModule`  
**Database:** `compliance_hub_users`

### Modules

| Module | Description |
|--------|-------------|
| `AuthModule` | JWT authentication, Google OAuth, login/logout, password change |
| `UsersModule` | User CRUD, role assignment, staff management |
| `UnitsModule` | Organizational units (divisions/sections) |

### API Endpoints

#### Auth (`/api/auth`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/login` | Local email + password login; returns JWT + roleCode |
| POST | `/refresh` | Refresh access token using refresh token |
| POST | `/google-login` | Google OAuth login via ID token |
| GET | `/me` | Get current user profile (includes roleCode) |
| POST | `/logout` | Invalidate refresh token |
| POST | `/change-password` | Change authenticated user's password |
| POST | `/reauthenticate` | Verify current password before sensitive op |

#### Users (`/api/users`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/roles` | List all role definitions |
| POST | `/roles` | Create a new role definition |
| PATCH | `/roles/:value` | Update a role definition |
| DELETE | `/roles/:value` | Delete a role definition |
| POST | `/` | Create a new user |
| GET | `/search-email` | Search users by email |
| GET | `/` | List all users |
| GET | `/federated` | List federated (Google-linked) users |
| GET | `/:id` | Get a user by ID |
| PATCH | `/:id` | Update a user |
| DELETE | `/:id` | Deactivate a user |

#### Units (`/api/units`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create an organizational unit |
| GET | `/` | List all units |
| GET | `/:id` | Get a unit by ID |
| PATCH | `/:id` | Update a unit |
| DELETE | `/:id` | Delete a unit |

### Key Entities

| Entity | Table | Notes |
|--------|-------|-------|
| `User` | `users` | role, roleCode, active, last_login, ticketMainFocal, ticketTechnician |
| `Unit` | `units` | Organizational divisions |
| `RoleDefinitionEntity` | `role_definitions` | assignable, value, label, technicianType |

### Notes

- `AttendanceService` is `@Optional()` injected into `AuthService`. In monolith (via `TicketsModule` import in `AuthModule`), auto-attendance is triggered on login for all non-user/non-super_admin roles.
- `autoCorrectAbsentOnLogin()` is called after every successful login. Skips `user` and `super_admin` roles only.

---

## Service 2 — Ticketing Service (Port 4102)

**Entry:** `src/apps/ticketing-service.main.ts`  
**Module:** `TicketingServiceAppModule`  
**Database:** `compliance_hub_ticketing` (+ VIEWs into `compliance_hub_users`)

### Modules

| Module | Description |
|--------|-------------|
| `TicketsModule` | Help desk tickets, comments, escalations, proofs, CSAT |
| `AttendanceModule` | Technician attendance tracking, office days |
| `TicketSettingsModule` | Categories, keyword rules, escalation focal configuration |

### API Endpoints

#### Tickets (`/api/tickets`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/` | Create a new ticket |
| GET | `/` | List tickets (role-filtered: management sees all; technicians/ITO see own) |
| GET | `/statistics` | Ticket counts by status |
| GET | `/technicians` | List available technicians |
| GET | `/dashboard` | Dashboard stats (open, in_progress, resolved, CSAT) |
| GET | `/assigned-stats` | Per-technician open ticket count |
| GET | `/reports` | Reporting data (for charts) |
| GET | `/report-technicians` | Technician performance per period |
| GET | `/:id` | Get a single ticket with comments, escalations |
| PATCH | `/:id` | Update ticket fields (status, priority, notes) |
| GET | `/requester/:requesterId/open` | Open tickets for a requester |
| PATCH | `/:id/assign` | Assign ticket to a technician |
| PATCH | `/:id/mark-viewed` | Mark ticket as viewed |
| GET | `/:id/events` | Ticket event/audit log |
| POST | `/:id/comments` | Add a comment to a ticket |
| POST | `/:id/satisfaction` | Submit CSAT survey |
| GET | `/satisfaction/unit-suggestions` | Autocomplete unit names for CSAT |
| GET | `/:id/escalations` | List escalations for a ticket |
| POST | `/:id/escalate` | Escalate ticket to an escalation focal |
| PATCH | `/:id/escalation/:eid/accept` | Accept an escalation (auto sets in_progress) |
| PATCH | `/:id/escalation/:eid/return` | Return escalation to originating technician |
| GET | `/proof/:ticketId/:filename` | Serve escalation proof file |

**Role-based visibility for `GET /tickets`:**
- `super_admin`, `section_head`, `reviewer`, `compliance_officer`, `desktop_sr`, `it_support_sr`, `pantawid_ict` → see ALL tickets
- ITO staff roles (`cybersec`, `infosec`, `lead_infra`, `server_admin`, `db_admin`, `network_admin`, `project_mgr`, `dev_lead`, `sqa_lead`, `records_officer`, `hr_id_officer`) → see only tickets assigned to them or submitted by them
- All other roles → see only own assigned/submitted tickets

#### Attendance (`/api/attendance`)

| Method | Path | Description |
|--------|------|-------------|
| GET | `/` | Get attendance records for a date range |
| POST | `/` | Set attendance for a user |
| POST | `/bulk` | Bulk set attendance |
| DELETE | `/all` | Admin: clear all attendance (destructive) |
| GET | `/technicians` | List technicians, optionally by type, filtered by today's attendance (absent/OOO excluded) |
| GET | `/office-days` | Get office day calendar |
| POST | `/office-days` | Set a single office day |
| POST | `/office-days/bulk` | Bulk set office days |
| GET | `/staff-logins` | Get staff who logged in on a date |
| GET | `/staff-logins-monthly` | ITO/management staff list for monthly login grid |

**Attendance Types (ticketType param):**
- `desktop_support` — Desktop support team
- `it_support` — IT support team
- `pantawid_ict_support` — Pantawid ICT team
- `ito` — All ITO management/specialist roles
- _(no param)_ — All assignable roles

#### Ticket Settings (`/api/ticket-settings`)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/email-test` | Test email sending |
| GET | `/categories` | List ticket categories |
| GET | `/categories/:id` | Get a category |
| POST | `/categories` | Create a category |
| PATCH | `/categories/:id` | Update a category |
| DELETE | `/categories/:id` | Delete a category |
| GET | `/keyword-rules` | List keyword auto-classification rules |
| GET | `/keyword-rules/:id` | Get a keyword rule |
| POST | `/keyword-rules` | Create a keyword rule |
| PATCH | `/keyword-rules/:id` | Update a keyword rule |
| DELETE | `/keyword-rules/:id` | Delete a keyword rule |
| GET | `/escalation-focals` | List configured escalation focal roles |
| GET | `/escalation-available-roles` | List roles eligible to be escalation focals |
| POST | `/escalation-focals` | Add a role as an escalation focal |
| DELETE | `/escalation-focals/:id` | Remove an escalation focal config |

**Escalation Focal Notes:**
- Configured per ticket type (`desktop_support`, `it_support`, `pantawid_ict_support`, `all`)
- Available roles exclude: `user`, `super_admin`, `section_head`, `compliance_officer`
- ITO specialist roles (cybersec, infosec, lead_infra, server_admin, db_admin, network_admin, project_mgr, dev_lead, sqa_lead, records_officer, hr_id_officer) ARE available as escalation focals

### Key Entities

| Entity | Table | Notes |
|--------|-------|-------|
| `Ticket` | `tickets` | Full help desk ticket, assignedToId, requesterId, status, etc. |
| `TicketComment` | `ticket_comments` | Comments and internal notes |
| `TicketEscalation` | `ticket_escalations` | Escalation records with proof files |
| `TicketCategoryConfig` | `ticket_category_configs` | Ticket category definitions |
| `TicketKeywordRule` | `ticket_keyword_rules` | Auto-classification rules |
| `TechAttendance` | `attendance` | Daily attendance records |
| `OfficeDay` | `office_days` | Calendar of working days |
| `TicketEvent` | `ticket_events` | Audit log for ticket state changes |
| `EscalationFocalConfig` | `escalation_focal_configs` | Which roles can receive escalations per ticket type |

---

## Service 3 — Compliance Service (Port 4103)

**Entry:** `src/apps/compliance-service.main.ts`  
**Module:** `ComplianceServiceAppModule`  
**Status:** Future — not yet implemented as a separate microservice

### Modules (in monolith)

| Module | Description |
|--------|-------------|
| `DocumentsModule` | Document management, file upload, previews |
| `ReviewsModule` | Document review workflow |
| `ReferencesModule` | Reference documents and compliance references |
| `MetricsModule` | Compliance metrics tracking |
| `CybersecurityModule` | Cybersecurity compliance items |
| `KpiModule` | KPI tracking and reporting |
| `MovModule` | Means of Verification management |
| `IncidentsModule` | Incident reporting and tracking |

---

## Gateway (Port 4000)

**Entry:** `src/apps/gateway.main.ts`  
**Purpose:** HTTP reverse proxy routing requests to the correct microservice.

| Path Prefix | Routes To |
|-------------|-----------|
| `/api/auth` | Users Service (:4101) |
| `/api/users` | Users Service (:4101) |
| `/api/units` | Users Service (:4101) |
| `/api/tickets` | Ticketing Service (:4102) |
| `/api/attendance` | Ticketing Service (:4102) |
| `/api/ticket-settings` | Ticketing Service (:4102) |
| `/api/documents` | Compliance Service (:4103) |
| `/api/reviews` | Compliance Service (:4103) |
| _(all others)_ | Compliance Service (:4103) |

---

## Role Reference

| Role Value | Type | Ticket Visibility | Notes |
|-----------|------|-------------------|-------|
| `super_admin` | System | All | Hidden from Role Management UI |
| `section_head` | Management | All | Full management view |
| `reviewer` | Management | All | Compliance Officer equivalent |
| `compliance_officer` | Management | All | roleCode-based, assigned per user |
| `desktop_sr` | Senior Tech | All | Focal for desktop support |
| `it_support_sr` | Senior Tech | All | Focal for IT support |
| `pantawid_ict` | Senior Tech | All | Focal for Pantawid ICT support |
| `cybersec` | ITO Staff | Own only | Can be escalation focal |
| `infosec` | ITO Staff | Own only | Can be escalation focal |
| `lead_infra` | ITO Staff | Own only | Can be escalation focal |
| `server_admin` | ITO Staff | Own only | Can be escalation focal |
| `db_admin` | ITO Staff | Own only | Can be escalation focal |
| `network_admin` | ITO Staff | Own only | Can be escalation focal |
| `project_mgr` | ITO Staff | Own only | Can be escalation focal |
| `dev_lead` | ITO Staff | Own only | Can be escalation focal |
| `sqa_lead` | ITO Staff | Own only | Can be escalation focal |
| `records_officer` | ITO Staff | Own only | Can be escalation focal |
| `hr_id_officer` | ITO Staff | Own only | Can be escalation focal |
| `desktop_jr` | Junior Tech | Own only | Can escalate tickets |
| `it_support_jr` | Junior Tech | Own only | Can escalate tickets |
| `technician_it_staff` | Tech Staff | Own only | Can escalate tickets |
| `technician_desktop_staff` | Tech Staff | Own only | Can escalate tickets |
| `focal` | Focal | Own + assigned | Legacy role |
| `user` | End User | Own submitted | No attendance |
| `auditor` | Auditor | — | Compliance audit access only |

---

## Environment Variables (Backend)

| Variable | Service | Description |
|----------|---------|-------------|
| `PORT` | All | Listening port (default: 4000 monolith, 4101/4102/4103 microservices) |
| `DB_HOST` | All | MySQL host |
| `DB_PORT` | All | MySQL port (default: 3306) |
| `DB_USERNAME` | All | MySQL username |
| `DB_PASSWORD` | All | MySQL password |
| `DB_DATABASE` | Monolith | Default database name |
| `USERS_DB_DATABASE` | Users Service | `compliance_hub_users` |
| `DB_SYNCHRONIZE` | Dev only | Auto-sync TypeORM schema (default: false) |
| `JWT_SECRET` | Auth | JWT signing secret (min 16 chars) |
| `JWT_REFRESH_SECRET` | Auth | Refresh token secret (min 16 chars) |
| `JWT_ISSUER` | Auth | Token issuer claim |
| `JWT_AUDIENCE` | Auth | Token audience claim |
| `JWT_EXPIRATION` | Auth | Access token TTL |
| `CORS_ORIGIN` | All | Allowed CORS origins (comma-separated) |
| `REDIS_HOST` | Monolith | Redis for Bull queues |
| `REDIS_PORT` | Monolith | Redis port (default: 6379) |
| `GOOGLE_CLIENT_ID` | Auth | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Auth | Google OAuth client secret |
| `USERS_SERVICE_URL` | Gateway | e.g., `http://localhost:4101` |
| `TICKETING_SERVICE_URL` | Gateway | e.g., `http://localhost:4102` |
| `COMPLIANCE_SERVICE_URL` | Gateway | e.g., `http://localhost:4103` |
| `MICROSERVICES_STRICT` | Gateway | If `false`, proxy continues even if a service is down |

---

*Last updated: v0.0.29*
