# RICTMS Compliance Hub

> **Current Version:** `v0.0.136` (Backend) / `v0.0.133` (Frontend)

Compliance Hub is an internal document governance and compliance platform for government teams. It supports document intake and review workflows, ticketing and escalation, issuance mapping, KPI monitoring, and role-based operations across split microservices.

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MariaDB](https://img.shields.io/badge/mariadb-11.x-blue.svg)](https://mariadb.org/)
[![Vite](https://img.shields.io/badge/vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![NestJS](https://img.shields.io/badge/nestjs-10.x-red.svg)](https://nestjs.com/)

## What This README Covers

This README is intentionally focused on:
- What the system is
- How to run it
- Where to find detailed docs

Release-by-release history is maintained in `CHANGELOG.md`.

## Core Features

- Role-based access controls for super admin, compliance, section heads, focal, and technician roles
- Split microservices architecture (`users-service`, `ticketing-service`, `compliance-service`, `api-gateway`)
- Document upload, review, approval, and repository flows
- Ticket lifecycle with escalation, assignment, and reporting
- SLA timers based on issue-type configuration, including live overdue tracking
- Keyword-based category and issue selection with selected-support-type tie-breaking
- Server-Sent Events for live ticket, notification, attendance, and settings updates
- Issuance/reference management and document mapping
- KPI monitoring, scoring, dashboards, and trends

## Architecture

- Frontend: React 18 + Vite + TypeScript + MUI
- Backend: NestJS 10 + TypeScript
- Data: MariaDB (multi-database) + Redis
- Runtime: Docker Compose (recommended for local and staging)

Primary service ports:
- Frontend: `3000`
- API gateway: `4000`
- Users service: `4101`
- Ticketing service: `4102`
- Compliance service: `4103`

## Quick Start (Docker, Recommended)

1. Clone and enter the repository.
2. Start MariaDB and Redis.
3. Run microservices migration SQL once.
4. Start all microservices and frontend.

```bash
git clone <remote-url>
cd "Compliance Hub"

docker compose --profile microservices up -d mariadb redis
docker exec -i ricms_mariadb mysql -uroot -pricms_password < backend/database/microservices-migrate.sql

docker compose --profile microservices up -d users-service ticketing-service compliance-service api-gateway
docker compose up -d frontend
```

Health check:

```bash
curl http://localhost:4000/api/health
```

## Local Dev (Without Full Docker Frontend)

Backend services can run in Docker while frontend runs locally for faster UI iteration:

```bash
cd frontend
npm install
npm run dev
```

## Ticket SLA and Assignment Behavior

- SLA hours are configured on `ticket_issue_types.sla_hours`.
- When a ticket has an issue type, its business-hours deadline is calculated from that issue type. Tickets without an issue type use the system fallback SLA.
- The ticket detail countdown changes to a live overdue timer when the deadline passes; no page refresh is required.
- Keyword rules populate the matching category and issue type. If the same keyword exists for multiple support types, the selected support type is preferred.
- Automatic assignment uses the configured `CAPPED_ROUND_ROBIN` strategy when selected in Routing Configuration. It considers only technicians explicitly marked `PRESENT`, excludes senior technician roles and the requester, and selects the eligible technician with the oldest `lastAssignedAt` timestamp.
- The capped strategy counts the SLA hours of tickets assigned during the current Asia/Manila calendar week. A technician at or above the configured weekly cap is skipped, and support-type fallback is applied in this order: Desktop -> IT Support -> Pantawid ICT; IT Support -> Desktop -> Pantawid ICT; Pantawid ICT -> any eligible technician.
- The cap check currently compares the technician's existing weekly load with the cap before assignment. It does not yet reject a ticket when `existing weekly load + incoming ticket SLA` would exceed the cap; treat the configured cap as a selection threshold rather than a strict maximum until that rule is tightened.
- A newly assigned ticket starts `IN_PROGRESS` when the selected technician has no active ticket or has a breached active ticket. Otherwise, it is placed in the technician's waiting queue.
- Manual assignment requires an explicit `PRESENT` attendance record. Absent, out-of-office, half-day, and missing attendance records are rejected.
- When an active ticket breaches its SLA, the next queued ticket for the same technician is promoted to `IN_PROGRESS` alongside the breached ticket.
- Automatic queue promotion is checked by the ticket cron every minute. The browser timer changes immediately, while queue promotion may take up to one minute.
- The SSE browser URL uses a short-lived encrypted connection ticket rather than the JWT. SSE remains compatible with the HTTP/1.1 deployment and sends heartbeat events to keep connections alive.
- Year selectors use a rolling seven-year range: three years before the current year through three years after it.

## Environment Variables (High-Level)

Key variables used across services:
- `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`
- `USERS_DB_DATABASE`, `TICKETING_DB_DATABASE`, `COMPLIANCE_DB_DATABASE`
- `JWT_SECRET`, `JWT_REFRESH_SECRET`
- `CORS_ORIGIN`
- `USERS_SERVICE_URL`, `TICKETING_SERVICE_URL`, `COMPLIANCE_SERVICE_URL`
- `NEXT_PUBLIC_API_URL`

Use strong secrets outside local development. Do not commit `.env` files.

## Repository Notes

- `regulatory-issuances/` is intentionally tracked as source corpus for issuance deep-dive classification workflows.
- `scripts/classify_issuance_drop.py` and `scripts/quick-escalation-smoke.mjs` are maintained utility scripts for assessment and smoke testing.

## Documentation Index

- Deployment: `deployment.md`
- Setup: `SETUP.md` and `INSTALLATION.md`
- Main system docs: `MAIN-SYSTEM-DOCUMENTATION.md`
- QA guide: `QA-USER-MANUAL.md`
- Walkthrough: `WALKTHROUGH.md`
- Contribution process: `CONTRIBUTING.md`
- Security policy: `SECURITY.md`
- Release history: `CHANGELOG.md`
