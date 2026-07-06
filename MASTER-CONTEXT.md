# MASTER CONTEXT - Compliance Hub

> **Keeper file.** Updated on every architectural, schema, convention, or significant code change.
> Current version: **v0.0.115 (Backend) / v0.0.109 (Frontend)** | Last updated: **2026-07-06**

---

## 1. Project Overview

**Compliance Hub** is an internal ICT compliance and help-desk platform for DSWD-RICTMS.

It is used for:
- ICT compliance document submission, review, and reportorial tracking
- KPI monitoring and Means of Verification (MoV) management
- Help-desk ticketing for IT support, desktop support, and Pantawid ICT support
- Attendance tracking for ITO staff and technicians
- Cybersecurity and information security incident management
- Organization unit management and user/role directory management
- Document repositories with version history, previews, and text extraction
- Issuance management for ICT-related government issuances
- Audit logging of database mutations

---

## 2. Runtime and Deployment

Compliance Hub is designed to run in Docker Compose.

The current runtime stack is:
- `db` - MariaDB 10.11
- `redis` - Redis 7
- `users-service` - NestJS microservice on port `4101`
- `ticketing-service` - NestJS microservice on port `4102`
- `compliance-service` - NestJS microservice on port `4103`
- `gateway` - NestJS API gateway on port `4000`
- `frontend` - React frontend on port `3000`

Docker Compose mounts `./db-init` into MariaDB's `/docker-entrypoint-initdb.d`, so the database bootstrap scripts in `db-init/` are the most reliable current source of schema truth.

Important:
- `db-init/` contains both schema and seed data.
- Some init scripts also contain drop/truncate/reset behavior.
- Because of that, `db-init/` is not just a schema dump; it is the schema + bootstrap data layer for the Docker deployment.
- The versioned SQL files in `backend/database/migrations/` are useful as audit snapshots, but they may not fully reflect the live bootstrap schema. Verify them against `db-init/` and runtime code before assuming they are authoritative.

---

## 3. Repository Structure

```text
backend/
  src/
    apps/            - entrypoints for gateway and each microservice
    common/          - decorators, guards, middleware, events, http clients, logger, security helpers
    config/          - database configuration
    database/        - legacy/auxiliary SQL files used by backend startup and schema bootstrap
    modules/
      auth/
      audit/
      cybersecurity/
      documents/
      incidents/
      internal/
      kpi/
      metrics/
      mov/
      references/
      reviews/
      shared/
      tickets/
      units/
      users/
  database/
    migrations/      - versioned SQL snapshots / audit trail
    schema-savepoints/
  storage/           - uploaded files, previews, temporary artifacts

frontend/
  src/
    app/             - route components and pages
    components/      - reusable UI components
    contexts/        - auth, sidebar, page title, theme
    lib/             - API clients, theme, utilities, shared types
    shims/           - compatibility shims
  tests/
    e2e/             - Playwright end-to-end tests
  test-results/      - generated Playwright outputs

db-init/             - Docker bootstrap databases, schema, seed data, reset/truncate scripts
scripts/             - operational scripts, smoke tests, regression tests, schema helpers
regulatory-issuances/ - reference PDFs and related generated outputs
scratch/             - temporary working files
Top-level repo also contains:
MASTER-CONTEXT.md
AGENTS.md
README.md
MAIN-SYSTEM-DOCUMENTATION.md
docker-compose.yml
CHANGELOG.md
several audit, deployment, setup, and QA documents
## 4. Backend Architecture
The backend is a NestJS monorepo with three runtime services plus an API gateway.

**Entry points:**
- `backend/src/apps/gateway.main.ts`
- `backend/src/apps/users-service.main.ts`
- `backend/src/apps/ticketing-service.main.ts`
- `backend/src/apps/compliance-service.main.ts`

**Service map:**
- **gateway** - unified HTTP surface and health routing
- **users-service** - authentication, user management, role definitions, role capabilities, units
- **ticketing-service** - tickets, attendance, escalations, ticket settings, knowledge base, email
- **compliance-service** - documents, reviews, references, incidents, cybersecurity, KPI, metrics, MoV

**Shared backend patterns:**
- `common/decorators` and `common/guards` for authorization
- `common/http-clients` for cross-service data enrichment
- `common/events` for internal service events
- `shared/contracts` and `shared/entities` for lightweight shared references
- **TypeORM** for persistence
- **Bull** for background document processing
- **JWT** for auth tokens
- **class-validator** DTOs for request validation

The backend currently uses cross-service HTTP enrichment instead of cross-database ORM joins in several areas.

---

## 5. Database Architecture
The Docker bootstrap scripts create four databases:
- `02_db_stg_compliance_hub_users`
- `02_db_stg_compliance_hub_ticketing`
- `02_db_stg_compliance_hub`
- `02_db_audit_stg`

**Database ownership:**
- `02_db_stg_compliance_hub_users` owns user-facing identity and access data
- `02_db_stg_compliance_hub_ticketing` owns ticketing domain data
- `02_db_stg_compliance_hub` owns compliance, document, KPI, incident, MOV, and reference data
- `02_db_audit_stg` owns audit logging

**Current bootstrap files in `db-init/`:**
- `01-create-dbs.sql` - creates the four databases
- `02-users.sql` - users database schema and seed data
- `03-compliance.sql` - compliance database schema and seed data
- `04-ticketing.sql` - ticketing database schema and seed data
- `05-audit.sql` - audit database schema
- `staging-updates-03-to-09.sql` - staging adjustments and schema/data updates

**Important schema notes:**
- `attendance`, `users`, `role_definitions`, and `role_capabilities` are base tables in the users database
- Other databases may expose these as views or compatibility objects
- `db-init/02-users.sql` and `db-init/04-ticketing.sql` include truncation/reset logic for selected tables
- `backend/database/migrations/` contains versioned SQL snapshots, but those should be treated as audit artifacts unless independently verified

**Core logical table groups:**
- **Users DB**: users, attendance, feedback, role_definitions, role_capabilities, security_config, units, user_unit_access
- **Ticketing DB**: tickets, ticket_comments, ticket_events, ticket_escalations, ticket_categories, ticket_keyword_rules, escalation_focal_configs, office_days, ticketing_configs, knowledge_base_articles, mov_artifacts
- **Compliance DB**: documents, document_versions, document_assignments, document_references, document_issuances, issuances, incidents, cybersecurity_metrics, KPI tables, review tables, repository/support tables, unit tables
- **Audit DB**: audit_log and supporting database functions

---

## 6. Authentication and Roles
**Authentication flow:**
1. Client posts credentials to `/api/auth/login`
2. AuthService validates the password
3. Login updates user activity timestamps and emits a login event
4. JWT access and refresh tokens are generated
5. JWT payload includes `sub`, `email`, `role`, `roleCode`, and `units`
6. Frontend stores tokens in sessionStorage
7. API client automatically adds `Authorization: Bearer <token>`
8. On 401, the client tries refresh once, then redirects to login if refresh fails
9. Google OAuth is supported through server-side ID token verification

**Important auth behaviors:**
- Deactivated users cannot log in or refresh
- Login may trigger attendance auto-correction and ticket assignment side effects
- MFA and password-change flows are part of the current auth experience

**Role model:**
- `user.role` is the raw role string stored in the DB and JWT
- `user.roleCode` is derived from `role_definitions.role_code`
- `role_capabilities` is the capability matrix used by services
- `ticketMainFocal` and `ticketTechnician` are per-user overrides in the users table

**The `role_capabilities` matrix now includes capability flags for:**
- focal access
- desktop support
- IT support
- Pantawid ICT support
- ITO attendance grouping
- escalation focal
- ticket settings focal
- SMTP settings access
- security settings access
- all-tickets visibility
- ticket focal assignment authority
- KPI access and management
- attendance access and management
- reports access
- reviews access
- MoV access
- documents access
- repository access
- issuances access
- metrics access
- role capabilities access
- system roles access

---

## 7. Frontend Architecture
The frontend is a React application built with:
- React 18
- TypeScript
- Vite
- React Router
- MUI v5
- React Query
- Axios
- Google OAuth support

> **Important note:** The frontend has `next.config.js` and a `next/navigation` shim, but the actual runtime boots through `frontend/src/main.tsx` with BrowserRouter and Vite. This is a React/Vite app, not a true Next.js runtime.

**Frontend entry and structure:**
- `frontend/src/main.tsx` - app bootstrap
- `frontend/src/App.tsx` - top-level route shell
- `frontend/src/app/` - route components and page modules
- `frontend/src/components/` - reusable UI
- `frontend/src/contexts/` - auth, sidebar, title, theme
- `frontend/src/lib/api/` - API clients
- `frontend/src/lib/utils/` - helper utilities
- `frontend/src/lib/theme.ts` - MUI theme config

**Frontend route areas currently include:**
- login
- mfa-verify
- dashboard
- api

**Dashboard sections currently include:**
- attendance, audit-logs, documents, incidents, issuances, knowledge-base, kpi, metrics, mov, reports, repository, reviews, settings, ticket-reports, ticket-settings, tickets, units, user-manual

**Frontend auth state:**
- The app uses `AuthContext`
- Token storage is `sessionStorage`
- The API client retries once on refresh and otherwise redirects to login

---

## 8. Ticketing System
**Ticket types:**
- `it_support`
- `desktop_support`
- `pantawid_ict_support`

**Ticket lifecycle:**
- open -> assigned -> in_progress -> resolved -> closed
- freeze
- pause
- duplicate

**Ticketing features:**
- auto-shift based on keyword rules
- auto-assignment based on attendance and workload
- escalations with proof photo uploads
- SLA deadlines and freeze/pause logic
- CSAT capture on resolution
- knowledge-base-assisted ticket deflection
- ticket events and history

**Important runtime behavior:**
- Senior technicians are treated differently from junior technicians in assignment logic
- Pantawid ICT assignment is handled separately from the other ticket types
- Login can trigger assignment of queued tickets
- Escalation targets must be valid and present

**Known business-rule dependency:**
- Ticketing logic depends heavily on `RoleCapabilitiesService` rather than hardcoded role arrays

---

## 9. Document and Compliance System
**Document system features:**
- document upload
- version history
- preview generation
- text extraction
- reportorial document types
- references and issuance mapping
- assignment and submission workflow

**Document processing flow:**
1. Upload to storage
2. Enqueue background processing
3. Extract text from document content
4. Persist extracted data and derived metrics
5. Generate previews
6. Expose documents through the frontend repository and dashboard

**Compliance areas:**
- document review workflow
- KPI tracking
- MOV management
- repository management
- issuance library
- compliance reporting

---

## 10. Security and Operational Notes
**Security posture:**
- JWT access and refresh tokens
- issuer and audience validation
- class-validator DTO validation
- guard-based authorization
- unit scoping for data access
- upload type/size validation
- server-side Google token verification

**Operational notes:**
- Gateway health endpoint is available at `/api/health`
- Service health endpoints are checked in Docker Compose
- Redis is used for background job processing
- Docker networking has IPv6 disabled
- File storage is local by default, with optional S3 support

**Known gaps and review items:**
- Some configuration values are currently hardcoded in Docker Compose for local/staging convenience and should be externalized for production
- `db-init/` is authoritative for current bootstrap state, but migrations may drift from it
- The frontend uses session storage for tokens, which should be treated as a deliberate internal-app tradeoff
- The codebase still has some older compatibility files and legacy SQL helpers that should be handled carefully

---

## 11. Build and Validation
**Backend:**
```bash
cd backend
npm run build
npm run test
npm run test:e2e
```

**Frontend:**
```bash
cd frontend
npm run build
npm run dev
```

**Docker:**
```bash
docker compose up -d --build
```

**Database bootstrap:**
- The MariaDB container consumes `db-init/` automatically on first initialization
- Use the bootstrap scripts rather than assuming `backend/database/migrations/` is the live source of truth

**Validation guidance:**
- Verify backend build after any API, module, entity, or SQL bootstrap change
- Verify frontend build after UI, routing, auth, or API client changes
- If a change touches schema or seeding, confirm it against `db-init/` and the relevant runtime code path

---

## 12. Environment Variables
**Common variables:**
`NODE_ENV`, `PORT`, `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, `DB_DATABASE`, `REDIS_HOST`, `REDIS_PORT`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `JWT_ISSUER`, `JWT_AUDIENCE`, `GOOGLE_CLIENT_ID`, `STORAGE_TYPE`, `STORAGE_PATH`, `MAX_FILE_SIZE`, `CORS_ORIGIN`, `USERS_SERVICE_URL`, `TICKETING_SERVICE_URL`, `COMPLIANCE_SERVICE_URL`, `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`

**Service-specific notes:**
- The backend services may use distinct DB names for users, ticketing, and compliance
- The frontend defaults to `/api` in development through the Vite proxy
- Docker Compose wires the services together using container hostnames

---

## 13. Files Not to Touch Without Care
**Treat these as high-risk files:**
- `db-init/*.sql` - authoritative Docker bootstrap; modify carefully
- `backend/database/migrations/*.sql` - audit snapshots and partial migrations
- `backend/src/database/init.sql` - legacy bootstrap file
- `backend/src/database/schema.sql` - legacy schema file
- `backend/src/database/setup-complete.sql` - helper SQL file
- `docker-compose.yml` - runtime wiring for all services
- `frontend/src/main.tsx` - app bootstrap
- `frontend/src/lib/api/client.ts` - token refresh and auth behavior

---

## 14. Recent Architectural Additions
**The codebase currently reflects several newer patterns:**
- audit logging through database and application-level audit support
- SLA freeze/pause handling in ticketing
- AI-assisted knowledge-base support in ticket workflows
- cross-service HTTP enrichment instead of cross-database joins
- MFA and password-change support in auth
- stricter attachment handling for ticket comments and proof files
- richer ticket status and escalation handling

---

## 15. Change Log / Current Context
**This file should be updated whenever:**
- a database schema changes
- a migration or bootstrap script changes
- a service boundary changes
- a major role or auth rule changes
- a route, module, or build path changes
- a significant business rule changes