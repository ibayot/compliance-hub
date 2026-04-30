# Service Ownership Map
# Compliance Hub — Constrained Microservices (Single MariaDB Instance)
# Last updated: 2026-04-30 (v0.0.49)

## Infrastructure

- 1 physical/virtual server
- 3 Docker containers: users-service, ticketing-service, compliance-service
- 1 gateway container (HTTP proxy)
- 1 MariaDB 11 instance with 3 databases
- 1 Redis instance (optional, for document processing queue)

## Database Ownership

| Database                    | Owner Service       | Access Pattern |
|-----------------------------|---------------------|----------------|
| compliance_hub_users        | users-service       | Read/Write     |
| compliance_hub_ticketing    | ticketing-service   | Read/Write     |
| compliance_hub              | compliance-service  | Read/Write     |

## Cross-Service Data Access (Current Constraints)

The following cross-DB views exist as temporary compatibility bridges.
These are *read-only* access patterns. The owning service is the sole writer.

| View                                    | Hosted In               | Points To                        | Purpose                                   |
|-----------------------------------------|-------------------------|----------------------------------|-------------------------------------------|
| compliance_hub.users                    | compliance_hub          | compliance_hub_users.users       | Compliance queries user display names     |
| compliance_hub.role_definitions         | compliance_hub          | compliance_hub_users.role_definitions | Role label lookups in compliance reports |
| compliance_hub_users.units              | compliance_hub_users    | compliance_hub.units             | User unit resolve                         |
| compliance_hub_ticketing.users          | compliance_hub_ticketing| compliance_hub_users.users       | Ticket owner name resolution              |
| compliance_hub_ticketing.units          | compliance_hub_ticketing| compliance_hub.units             | Ticket unit resolution                    |
| compliance_hub_ticketing.role_definitions| compliance_hub_ticketing| compliance_hub_users.role_definitions | Ticketing role checks                |
| compliance_hub_ticketing.attendance     | compliance_hub_ticketing| compliance_hub_users.attendance  | Attendance queries in ticketing context   |

**Deprecation target**: These views should be replaced by inter-service HTTP API calls
in a future version when independent DB engines become feasible.

## Table Ownership (per database)

### compliance_hub_users (users-service)
**Base Tables:**
- users
- role_definitions
- role_capabilities
- user_unit_access
- attendance

**Views (read-only, owned by other services):**
- units → compliance_hub.units

### compliance_hub_ticketing (ticketing-service)
**Base Tables:**
- tickets
- ticket_comments
- ticket_events
- ticket_categories
- ticket_keyword_rules
- ticket_issue_types
- ticket_escalations
- escalation_focal_configs
- office_days

**Views (read-only, owned by other services):**
- users → compliance_hub_users.users
- attendance → compliance_hub_users.attendance
- role_definitions → compliance_hub_users.role_definitions
- role_capabilities → compliance_hub_users.role_capabilities
- units → compliance_hub.units

### compliance_hub (compliance-service)
**Base Tables:**
- units
- documents
- document_versions
- document_references
- document_assignments
- manual_reviews
- version_comparisons
- reportorial_document_types
- issuances
- metrics
- metric_templates
- metric_applicability
- metric_results
- incidents
- incident_daily_snapshots
- cybersecurity_metrics
- kpi_master
- kpi_monitoring
- kpi_thresholds
- kpi_scoring_rules
- mov_artifacts

**Note:** `document_issuances` pivot table does NOT exist in production. The `issuances` table is the source of truth. ManyToMany document linking is conditionally guarded in code; will be enabled only when/if this table is explicitly added via migration.

**Views (read-only, owned by other services):**
- attendance → compliance_hub_users.attendance
- role_capabilities → compliance_hub_users.role_capabilities
- role_definitions → compliance_hub_users.role_definitions
- users → compliance_hub_users.users

## API Route Ownership (via Gateway)

The gateway (port 4000) proxies by path prefix:

| Path prefix      | Routes to           | Port |
|------------------|---------------------|------|
| /api/auth        | users-service       | 4101 |
| /api/users       | users-service       | 4101 |
| /api/roles       | users-service       | 4101 |
| /api/units       | compliance-service  | 4103 |
| /api/tickets     | ticketing-service   | 4102 |
| /api/documents   | compliance-service  | 4103 |
| /api/reviews     | compliance-service  | 4103 |
| /api/references  | compliance-service  | 4103 |
| /api/metrics     | compliance-service  | 4103 |
| /api/kpi         | compliance-service  | 4103 |
| /api/incidents   | compliance-service  | 4103 |
| /api/mov         | compliance-service  | 4103 |
| /api/cybersec    | compliance-service  | 4103 |

## Write Rules (Enforced at App Code Level)

1. users-service MUST NOT write to compliance_hub or compliance_hub_ticketing
2. ticketing-service MUST NOT write to compliance_hub or compliance_hub_users
3. compliance-service MUST NOT write to compliance_hub_users or compliance_hub_ticketing
4. All three services MAY read from compliance_hub_users.role_definitions and compliance_hub_users.attendance via cross-DB views (read-only)
5. compliance-service owns `units` — other services read via cross-DB view only

## Health Endpoints (per service)

| Endpoint               | Purpose                        | Notes                          |
|------------------------|--------------------------------|--------------------------------|
| GET /api/health        | Legacy liveness (backward compat) | Always 200 ok               |
| GET /api/health/live   | Liveness — is process up?      | Always 200 if process running  |
| GET /api/health/ready  | Readiness — is DB reachable?   | 503 if SELECT 1 fails          |

Gateway uses `/api/health` for service availability checks (backward compatible).
