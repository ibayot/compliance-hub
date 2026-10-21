# Compliance Hub System Map

Observed on 2026-10-20; inspect current entrypoints before changing routing or ownership.

| Process | Responsibility | Source |
| --- | --- | --- |
| Gateway | Unified HTTP routing, service availability, request forwarding | [gateway](../../../backend/src/apps/gateway.main.ts) |
| Users | Auth, users, capabilities, security settings, units, staff integration | [module](../../../backend/src/apps/users-service.module.ts) |
| Ticketing | Tickets, duty, attendance, notifications, knowledge base | [module](../../../backend/src/apps/ticketing-service.module.ts) |
| Compliance | Documents, review, issuances, metrics, KPI, MoV, incidents/cybersecurity | [module](../../../backend/src/apps/compliance-service.module.ts) |
| Frontend | React UI and Capacitor bridge | [manifest](../../../frontend/package.json) |

CH-MAP-001 MUST check current gateway routes and module ownership before moving an endpoint or changing database access. Historical ownership documents may differ, especially for units and compatibility views.

CH-MAP-002 MUST preserve existing single-writer boundaries and explicitly document any new cross-service or cross-database dependency. Existing read-only compatibility views are evidence to inspect; they do not authorize new cross-database writes.

[Compose](../../../docker-compose.yml) defines local runtime wiring. [Bootstrap guidance](../../../db-init/README.md) describes environment-managed SQL and fresh initialization. Do not infer deployed database names or production security from local defaults.
