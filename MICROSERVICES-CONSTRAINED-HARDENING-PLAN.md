# Constrained Microservices Hardening Plan (Single-Instance DB)

Date: 2026-04-30
Scope: Run services as separate containers on the same server and MariaDB instance.
Goal: Make the architecture feel as close to microservices as possible under infrastructure constraints.

## Why true microservices is not fully achievable right now

1. Shared database instance and cross-schema reads/views reduce strict data ownership.
2. Infrastructure constraints prevent per-service database engines and full network isolation.
3. No CI/CD pipeline currently limits independent deployment automation and release governance.

Even with these constraints, we can materially improve autonomy, rollback safety, and failure isolation.

## Rollback baseline

1. Stable rollback tag: rollback-baseline-2026-04-30-b712167
2. Rollback command:

```powershell
git fetch --tags; git checkout rollback-baseline-2026-04-30-b712167
```

## Priority 1 (Do 1,2,3 with constraints)

### 1. Enforce service boundary contracts (without new infra)

1. Replace DB-level cross-service dependencies with internal HTTP APIs where practical.
2. Keep read-only fallback views temporarily only for legacy flows; mark as deprecated.
3. Add endpoint-level ownership map document per service.

### 2. Isolate data ownership inside one DB instance

1. Keep one MariaDB instance but enforce one owner schema per entity.
2. Disallow writes to non-owner schemas at app code level.
3. Add startup checks to fail fast on non-owner write attempts.

### 3. Harden communication patterns

1. Add explicit timeouts, retries, and circuit-breaker style wrappers for inter-service calls.
2. Standardize internal error envelopes and correlation IDs.
3. Add fallback behavior for read paths when dependency is down.

## Priority 2 (Do 1,2,3)

### 1. Remove runtime schema mutation from business services

1. Move ALTER/CREATE self-healing logic out of runtime services.
2. Use versioned migration scripts only.
3. Add startup schema-version guard.

### 2. Contract tests

1. Add per-service contract tests for gateway -> service routes.
2. Add compatibility tests for payload versioning.
3. Make contract tests required before release.

### 3. Service dependency catalog

1. Maintain machine-readable dependency graph (who calls whom).
2. Track sync vs async dependencies.
3. Use graph for release risk scoring.

## Priority 3 (Do 1,2,3)

### 1. Deployment independence inside same server

1. Build independent images/tags per service.
2. Use docker compose profile commands for per-service rollout.
3. Document independent rollback per service image tag.

### 2. Health and readiness hardening

1. Separate liveness and readiness endpoints.
2. Fail readiness on critical dependency mismatch.
3. Keep liveness permissive for controlled restart behavior.

### 3. Observability baseline

1. Structured logs with requestId/correlationId.
2. Service-level metrics (latency, error rate, saturation).
3. Per-service dashboard for gateway/users/ticketing/compliance.

## Priority 4 (Do 1,2,3 without CI/CD today)

### 1. Manual release process (CI/CD substitute)

1. Create release checklist script with:
   - backend build
   - frontend type-check/build
   - smoke tests
   - contract tests
2. Require checklist artifact before merge/deploy.
3. Store release artifacts in a versioned folder.

### 2. Versioning discipline

1. Enforce semantic patch bump per service change.
2. Add release notes template per deployment.
3. Record rollback commit and image tag every release.

### 3. Git-based guardrails

1. Protected branch rules on microservices branch.
2. Required code review for boundary/db-touching files.
3. Pre-merge scripts run locally if CI unavailable.

## Priority 5 (Do all)

### 1. Failure isolation improvements

1. Gateway per-service timeout budgets.
2. Graceful degradation responses by domain.
3. No cross-domain cascading retries.

### 2. Async integration where possible

1. Introduce internal event publishing for ownership changes.
2. Build local read models from events for dependent services.
3. Keep sync calls for strictly transactional paths only.

### 3. Security and resilience

1. Service-to-service auth tokens for internal API calls.
2. Rate limits at gateway and service edge.
3. Bulkhead controls for expensive endpoints.

## Validation gates per change

1. What to test:
- API route behavior in gateway
- Service startup/readiness
- documents/tickets/kpi/regression flows

2. How to test:
- npx nest build
- npx tsc --noEmit
- smoke-test.ps1
- targeted endpoint checks through /api/health and affected routes

3. Expected result:
- No contract regressions
- No cross-service schema side effects
- Graceful failure behavior retained

4. Edge cases:
- Missing join tables/views in legacy schemas
- Partial service outage (one service down)
- Role/capability matrix cache stale scenarios
