# Architecture Audit — RICTMS Compliance Hub
*Audit date: 2026-04-30 | Auditor: BMAD Orchestrator (Senior Microservices Architect role)*
*Assessed against codebase state: v0.0.50, commit ec233cf*

---

## Executive Classification

| Dimension | Score | Verdict |
|---|---|---|
| Service boundary definition | 3/5 | Cross-boundary entity imports still present |
| Database isolation | 2/5 | 3 schemas in 1 MariaDB, cross-DB SQL views still active |
| Communication patterns | 3/5 | HTTP proxy gateway + new HTTP clients; no async event bus |
| Deployability | 3/5 | Per-service Docker containers + image tags; CI/CD not yet automated |
| Failure isolation | 3/5 | Gateway 503 fallback; no circuit breaker; cross-DB views create coupled failure paths |

### **Classification: Advanced Distributed Monolith (transitioning toward Constrained Microservices)**

**Justification:**  
The system runs 4 separate processes (users:4101, ticketing:4102, compliance:4103, gateway:4000) with per-service Docker image tags, independent startup scripts, distinct JWT strategies per service, versioned migration files, HTTP inter-service clients (v0.0.50), and an internal API layer with token-guarded endpoints. However, it still has critical architectural coupling: **cross-boundary TypeORM entity imports** (tickets module imports `User`, `RoleCapability`, `Unit` entities directly), **in-process module coupling** (modules share entity classes instead of DTOs), and **cross-DB SQL views as the primary JOIN mechanism** — all of which prevent true independent deployability and failure isolation.  

Progress since last audit: DDL extraction ✅, HTTP clients ✅, correlation IDs ✅, gateway timeouts ✅, image tags ✅  
Still blocking true microservices: entity coupling, no circuit breaker, no async events, RoleCapabilitiesService duplicated in-process across services.

---

## Full Violation Inventory

### CRITICAL violations (block independent deployability)

#### C1 — Cross-boundary TypeORM entity imports
**Affected files:**
- `tickets/tickets.module.ts`: imports `User`, `RoleDefinitionEntity`, `RoleCapability`, `Unit` from `../users/` and `../units/`
- `documents/documents.module.ts`: imports `RoleCapability` from `../users/`
- `kpi/kpi.service.ts`: imports `Unit`, `User` from `../../units/` and `../../users/`
- `incidents/entities/incident.entity.ts`: imports `User` from `../../users/`
- `documents/entities/document-assignment.entity.ts`: imports `User`, `Unit`
- `documents/entities/document-reference.entity.ts`: imports `User`
- `units/entities/unit.entity.ts`: imports `User` (back-reference)

**Problem:** Each entity import creates a compile-time + runtime coupling. If users-service is deployed with a schema change, ticketing and compliance services must redeploy simultaneously — this is the definition of a distributed monolith. Independent deployability is impossible as long as entity classes cross service boundaries.

**Impact:** HIGH — prevents true independent deploy/rollback per service.

#### C2 — RoleCapabilitiesService duplicated in every service process
`RoleCapabilitiesService` is instantiated in:
- users-service (owns the table)
- ticketing-service (via `TicketsModule` + `AttendanceController` + `TicketSettingsController`)
- compliance-service (via `DocumentsModule`, `KpiModule`)

Each instance queries its own local cross-DB VIEW of `role_capabilities`. This means:
- Cache coherence is per-process — role changes in users-service take 0ms to reflect locally but may take minutes (restart required) in ticketing/compliance
- A view refresh failure in one DB silently starves the cache in that service
- The service that owns the table (users) does not signal the others when capabilities change

#### C3 — No circuit breaker on inter-service HTTP calls
`UsersHttpClient` and `ComplianceHttpClient` timeout gracefully but do not implement circuit breaker logic. If users-service is flapping (returning errors within the timeout window), ticketing and compliance services will retry every call with no backoff, no open-circuit short-circuit, and no fallback route. Under a degraded users-service, all services degrade.

### HIGH violations (impair reliability and observability)

#### H1 — Cross-DB SQL views are the primary JOIN mechanism
TypeORM FKs in `tickets` entities JOIN to `users`, `units`, `role_definitions`, `attendance` via cross-DB views. This means:
- A DDL change in `compliance_hub_users.users` (e.g., column rename) silently breaks queries in `compliance_hub_ticketing` at runtime — no compile error
- Views hold no FK constraints — data integrity is fully unguarded across schemas
- If `compliance_hub_users` is unavailable (even briefly), any ticketing query involving user JOINs throws SQL error

#### H2 — Structured logging incomplete — no per-request log context
`X-Request-ID` is propagated as an HTTP header (gateway → downstream) but **not injected into the NestJS Logger context**. Log lines from the same request are not traceable in a log stream because there is no way to filter them by correlation ID without parsing each line manually.

#### H3 — No graceful degradation per domain on the gateway
Gateway returns `503 Service currently unavailable` as a flat string for ALL service failures (auth, tickets, compliance). There is no domain-specific degradation:
- Compliance service down → tickets still fully operable → should succeed
- Users service down → gateway login fails but should return specific error, not generic 503

#### H4 — Health/readiness endpoints do not check critical dependencies
`/api/health/ready` on each service only checks `SELECT 1` (DB reachable). It does not check:
- Cross-DB view availability
- Redis reachability (for compliance Bull queue)
- Whether role_capabilities cache is populated

#### H5 — No service dependency registry (machine-readable)
Who calls whom is not formally documented in a format that tooling can read. `SERVICE-OWNERSHIP.md` documents table ownership but not the call graph. This makes it impossible to automate impact analysis for a change.

#### H6 — No async event bus
All inter-service communication is synchronous HTTP. When a user is deleted, ticketing service has no way to know (unless it polls). When a role capability changes, compliance and ticketing caches are stale until restart. There is no publish/subscribe mechanism for cross-domain state changes.

### MEDIUM violations

#### M1 — Shared entity classes couple service compile artifacts
Even though entities like `User` are read-only in ticketing (via cross-DB VIEW), they are imported as TypeScript class references. This means both services compile against the same entity — a TypeScript change to `User` entity requires both services to rebuild.

#### M2 — No API versioning on internal or public endpoints
All routes are unversioned (`/api/tickets`, `/api/users`, etc.). Adding a breaking field change requires coordinated deploy of gateway + all consumers simultaneously.

#### M3 — `INTERNAL_SERVICE_SECRET` is a static shared secret
The current inter-service auth uses a single static token in env vars. There is no token rotation mechanism, no per-service identity, and no audit trail of which service called which endpoint. Should be replaced with per-service JWT tokens or mTLS.

#### M4 — Redis is a shared dependency with no isolation
The Bull queue in compliance-service uses a single Redis instance shared with all services. A compliance document-processing flood can saturate Redis and degrade ticketing-service health checks or other Redis-dependent operations.

#### M5 — No bulkhead controls on expensive endpoints
Large document blob uploads, PDF parsing, and metrics computation in compliance-service run in-process with no concurrency cap. A single large upload flood can saturate the compliance process, which also handles issuances, KPI, and MoV — all degrading together.

### LOW violations

#### L1 — Frontend calls services via a single gateway with no retry
Vite/React frontend uses a single Axios instance pointing at `http://localhost:4000/api`. No retry logic, no exponential backoff, no circuit awareness on the frontend.

#### L2 — No release artifact tracking per commit
`release-checklist.ps1` creates an artifact but it is not stored in a versioned folder or pushed to a release registry.

#### L3 — No per-service metrics endpoint
No Prometheus `/metrics` endpoint exposed per service. Latency, error rate, and queue depth cannot be monitored without accessing the app logs.

---

## Refactoring Recommendations

### Phase A — Decouple entity coupling (removes C1, M1) — 2–3 days

**Instead of importing User/Unit entity classes across service boundaries:**
1. Create `backend/src/shared/` folder with **value-object stub interfaces** (no ORM decorators):
   - `UserRef { id: number; email: string; first_name: string; last_name: string; role: string; }`
   - `UnitRef { id: number; name: string; code?: string; }`
2. In ticketing-service entities, replace `@ManyToOne(() => User)` with an integer FK column `user_id: number` + a non-entity `userRef?: UserRef` virtual field populated at query time.
3. In compliance-service documents entities, same pattern.
4. This removes all cross-boundary TypeORM entity imports and allows services to compile independently.
5. Data enrichment (display name, role label) happens via `UsersHttpClient.getUserById()` — already built in v0.0.50.

### Phase B — Replace RoleCapabilitiesService cross-process copies (removes C2) — 1 day

1. Move `RoleCapabilitiesService` out of ticketing and compliance modules.
2. Add `GET /api/internal/role-capabilities/:role` endpoint to InternalController (already has X-Service-Token auth).
3. Create a lightweight `RoleCapabilitiesHttpClient` that fetches from users-service and caches locally with a 30s TTL (stale-while-revalidate pattern).
4. On capability update, users-service publishes a `capabilities.updated` event (Redis pub/sub) → other services flush their local cache.

### Phase C — Circuit breaker wrapper (removes C3) — half day

Add a simple circuit breaker around `fetchWithTimeout()` in both HTTP clients:
- States: CLOSED (normal) → OPEN (5 consecutive errors) → HALF_OPEN (single probe after 30s)
- When OPEN, return cached response or null immediately without calling the service
- Log state transitions for observability
- No new library needed — implement with a small state class per client

### Phase D — Structured per-request log context (removes H2) — half day

1. In each service's main bootstrap, register `CorrelationIdMiddleware` (already created in v0.0.50).
2. Create a `RequestContext` AsyncLocalStorage store that holds `requestId`.
3. Wrap NestJS Logger to prefix every log line with `[reqId: ${requestId}]`.
4. This makes logs grep-able by correlation ID across services.

### Phase E — Enhanced readiness checks (removes H4) — half day

Extend `/api/health/ready` on each service to verify:
- Users-service: DB, `role_capabilities` row count > 0
- Ticketing-service: DB, cross-DB views exist (`SHOW TABLES LIKE 'users'`), Redis ping
- Compliance-service: DB, Redis ping, Bull queue connected

### Phase F — Service dependency registry (removes H5) — 1 hour

Create `backend/SERVICE-DEPENDENCY-GRAPH.json` (machine-readable):
```json
{
  "services": ["users","ticketing","compliance","gateway"],
  "edges": [
    { "from": "ticketing", "to": "users", "type": "sync-http", "endpoints": ["GET /api/internal/users/:id"] },
    { "from": "compliance", "to": "users", "type": "sync-http", "endpoints": ["GET /api/internal/users"] },
    { "from": "compliance", "to": "users", "type": "cross-db-view", "views": ["users","role_capabilities"], "deprecated": true }
  ]
}
```

### Phase G — External compatibility (for other apps using your services) — 1 day

For other apps to consume your services:
1. Add OpenAPI/Swagger documentation per service (NestJS `@ApiProperty` + `SwaggerModule.setup()`).
2. Expose `GET /api/openapi.json` on each service — other apps discover your API contract.
3. Version the public API: `app.setGlobalPrefix('api/v1')` on users, ticketing, compliance.
4. Keep `/api/health`, `/api/health/live`, `/api/health/ready` at root level (not versioned).
5. Add `X-Service-Version` response header from each service so callers can detect version.

### Phase H — Async event bus for ownership changes (removes H6) — 2–3 days

Use Redis pub/sub (already present, no new infra):
1. Create `EventBusService` that wraps `ioredis` pub/sub.
2. users-service publishes: `user.created`, `user.updated`, `user.deleted`, `capabilities.updated`
3. ticketing-service subscribes: `user.deleted` → soft-purge user tickets cache; `capabilities.updated` → reload capability cache
4. compliance-service subscribes: same events for document assignment updates
5. This is "fire and forget" — no guarantees, but eliminates the restart-to-see-capability-changes problem

---

## Risk Assessment

| Violation | Risk Level | Effort to Fix | Priority |
|---|---|---|---|
| C1 — Entity coupling | HIGH | 3 days | Must fix for true microservices |
| C2 — RoleCapSvc duplication | HIGH | 1 day | Fix in Phase B |
| C3 — No circuit breaker | HIGH | 0.5 day | Fix in Phase C |
| H1 — Cross-DB views as primary JOIN | HIGH | 2 weeks (full migration) | Plan but don't rush |
| H2 — No log correlation | MEDIUM | 0.5 day | Fix in Phase D |
| H3 — Flat gateway 503 | MEDIUM | 0.5 day | Fix in Phase E |
| H4 — Shallow readiness checks | MEDIUM | 0.5 day | Fix in Phase E |
| H5 — No dependency registry | LOW | 1 hour | Fix in Phase F |
| H6 — No async events | MEDIUM | 2–3 days | Fix in Phase H |
| M1 — Shared entity compile coupling | HIGH | Resolved by Phase A | |
| M2 — No API versioning | MEDIUM | 1 day | Fix in Phase G |
| M3 — Static internal token | MEDIUM | Future (staging) | |
| M4 — Shared Redis | LOW | Future (staging) | |
| M5 — No bulkhead controls | MEDIUM | 1 day | Near term |

---

## Updated Hardening Roadmap (v2)

### Immediate (this sprint — single dev, ~5 days)
| ID | Action | Removes |
|---|---|---|
| D | Structured log correlation (AsyncLocalStorage) | H2 |
| E | Enhanced readiness checks | H4 |
| C | Circuit breaker in HTTP clients | C3 |
| F | Service dependency graph JSON | H5 |
| G | OpenAPI per service + API versioning + X-Service-Version header | M2, external compatibility |

### Short term (~2 weeks)
| ID | Action | Removes |
|---|---|---|
| B | RoleCapabilitiesHttpClient + cache invalidation via Redis pub/sub | C2 |
| A (partial) | UserRef/UnitRef value objects in shared/, begin entity decoupling in tickets | C1 partial |
| H (partial) | Redis pub/sub for capabilities.updated | H6 partial |

### Medium term (~1 month)
| ID | Action | Removes |
|---|---|---|
| A (full) | Complete entity decoupling in all services | C1 full, M1 |
| H (full) | Full event bus: user lifecycle events | H6 full |
| M5 | Bulkhead: concurrency limiter on document processing | M5 |
| H1 (partial) | Begin replacing cross-DB views with HTTP API data enrichment in new code | H1 |

### Long term (staging available)
- Per-service Redis namespace isolation
- mTLS or per-service JWT for M3
- Prometheus metrics per service (L3)
- CI/CD pipeline
- Frontend retry + circuit breaker (L1)

---

## Summary

The system is now at ~60% toward constrained microservices. The v0.0.50 changes (DDL extraction, HTTP clients, correlation IDs, gateway timeouts, image tags) moved it from pure distributed monolith to a credible transitional architecture. The remaining blockers are entity coupling (C1), RoleCapabilitiesService duplication (C2), and missing circuit breakers (C3). Fixing those three in the immediate sprint gets you to ~80% — the point where one service can fail without cascading to another, where services compile independently, and where role changes propagate without restarting dependent services.
