# Active Application Profile: Compliance Hub

Status: active. Reviewed against repository source on 2026-10-20. This profile selects context; it does not certify that implementation complies with every baseline.

## Purpose and boundaries

Internal ICT compliance, document review, help-desk ticketing, attendance/duty, user administration, and governance-record workflows. The runtime includes a React/Vite frontend, a NestJS gateway and three service processes, MariaDB, Redis, document processing, and a Capacitor mobile target.

## Enabled packs

Use only the concern-specific files in these packs; do not load all pack contents.

| Concern | Active selection | Evidence |
| --- | --- | --- |
| Language | [TypeScript](../technology/languages/typescript/INDEX.md), [JavaScript](../technology/languages/javascript/INDEX.md), [SQL](../technology/languages/sql/INDEX.md), [PowerShell](../technology/languages/powershell/INDEX.md); [shell](../technology/languages/shell/INDEX.md) for existing container scripts | backend/frontend manifests and repository scripts |
| Frontend | [React 18](../technology/frameworks/react/INDEX.md), [MUI 5](../technology/libraries/mui-theme-component-pattern.md), [React Router 6](../technology/libraries/react-router-pattern.md), [React Query 5](../technology/libraries/tanstack-query-pattern.md), [React Hook Form/Zod](../technology/libraries/form-schema-pattern.md), [Axios](../technology/libraries/axios-transport-pattern.md), Vite | frontend/package.json |
| Backend | [Node](../technology/frameworks/node/INDEX.md) runtime selected by Dockerfile; [NestJS 10](../technology/frameworks/nestjs/INDEX.md), TypeORM, class-validator, JWT, Bull/RxJS | backend/package.json and Dockerfile |
| Mobile | [Capacitor 8](../technology/frameworks/capacitor/INDEX.md); Android build scripts; iOS dependency is not evidence of a validated iOS release | frontend/package.json and capacitor.config.ts |
| Platform | [Web](../platforms/web/INDEX.md), [HTTP API](../platforms/api/INDEX.md), [workers](../platforms/worker/INDEX.md), [mobile](../platforms/mobile/INDEX.md) | source entrypoints |
| Containers | [Docker](../containers/docker/INDEX.md) and [Compose](../containers/compose/INDEX.md), Nginx frontend | root Compose and application Dockerfiles |
| Data | MariaDB 10.11 and Redis 7 in local Compose; filesystem-backed uploads and preview processing | docker-compose.yml and storage services |
| Operations | Service health, request correlation, logs, application version checks | gateway and common modules |

Locate exact pack patterns through [technology](../technology/INDEX.md), [platforms](../platforms/INDEX.md), and [containers](../containers/INDEX.md). PHP/Laravel, Dart/Flutter, Electron/desktop, and other absent stacks remain inactive reference packs.

## Required application rules

- APP-CH-001 MUST use the existing shared API client for authenticated frontend API calls.
- APP-CH-002 MUST preserve backend capability checks plus resource, unit, ownership, and status restrictions.
- APP-CH-003 MUST preserve audit history and authorized retrieval for material records and files.
- APP-CH-004 MUST verify database target and repeatability for environment-managed SQL.
- APP-CH-005 MUST preserve the application-specific in-app release-note requirements.
- APP-CH-006 MUST treat a UI consistency change as presentation work unless workflow/permission changes were explicitly requested.

## Domain routing

| Signal | Application overlay |
| --- | --- |
| Runtime ownership, source truth, gateway routing | [system map](compliance-hub/system-map.md) |
| Tickets, SLA, escalation, comments, images, duty, attendance | [ticketing](compliance-hub/ticketing.md) |
| Documents, versions, reviews, metrics, KPI, MoV | [compliance](compliance-hub/compliance.md) |
| Identities, staff directory, units, capabilities, security settings | [administration](compliance-hub/administration.md) |
| Issuances, incidents, cybersecurity records | [governance records](compliance-hub/governance-records.md) |
| Release versions and in-app changelogs | [release policy](compliance-hub/release-policy.md) |
| Canonical components and existing source | [implementation map](../inventory/canonical-implementations.md) |

## Validation commands

Read package scripts before execution. Frontend build: npm run build in frontend. Frontend lint: npm run lint in frontend. Backend build: npm run build in backend. Backend tests: npm run test -- --runInBand in backend. Playwright: npm run test:e2e in frontend, with suitable environment and data. Backend lint currently includes --fix and therefore mutates files; do not run it for a read-only audit. Container validation uses an explicitly selected Compose file set and must not print resolved secrets.

## Unknown or environment-dependent inputs

Production topology and database names, legal obligations, retention periods, recovery objectives, approved external AI/data handling, validated iOS distribution, and security acceptance are not established by this context bootstrap. Verify the relevant environment and accountable requirements when work depends on them. Do not read or reproduce secret values to fill the profile.
