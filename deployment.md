# Compliance Hub Deployment Guide

## 1. Purpose
This document is the step-by-step deployment basis for installing the current code from this repository in a split microservices runtime.

## 2. Scope of This Guide
This guide is based on the current repository content:
- Backend source and service entrypoints are in `backend/`.
- Frontend source is in `frontend/`.
- Container definitions are in `docker-compose.yml`.
- Split database scripts are in `backend/database/microservices-init.sql` and `backend/database/microservices-migrate.sql`.

## 3. Runtime Architecture (Current)
- `users-service` (NestJS, port 4101)
- `ticketing-service` (NestJS, port 4102)
- `compliance-service` (NestJS, port 4103)
- `api-gateway` (NestJS, port 4000)
- `frontend` (Vite app, port 3000)
- `mariadb` (port 3306)
- `redis` (port 6379)

## 4. Prerequisites

### 4.1 Infrastructure
- 1 application server with Docker support
- 1 database server (or MariaDB container host) reachable over intranet
- Internal DNS or static IP mapping for app and DB hosts

### 4.2 Software
Install on deployment host:
- Docker Engine 24+
- Docker Compose plugin 2+
- Git

### 4.3 Access
- Sudo/admin access for initial host setup and firewall configuration

## 5. Required Network Ports
Open and allow only required ports:
- 3000 (frontend)
- 4000 (api-gateway)
- 4101 (users-service)
- 4102 (ticketing-service)
- 4103 (compliance-service)
- 3306 (MariaDB)
- 6379 (Redis)

## 6. Deployment Steps

### Step 1: Clone the Repository
Replace `<remote-url>` with the actual Git remote URL of this repository as configured by your organization:
```bash
git clone <remote-url>
cd "Compliance Hub"
```

### Step 2: Build Backend and Frontend Images
```bash
docker compose build
```

### Step 3: Start Core Data Services First
```bash
docker compose --profile microservices up -d mariadb redis
```

### Step 4: Wait for Health
```bash
docker compose ps
```
Ensure MariaDB and Redis are healthy before continuing.

### Step 5: Start Backend Microservices (Separated Containers)
```bash
docker compose --profile microservices up -d users-service ticketing-service compliance-service api-gateway
```

### Step 6: Start Frontend
```bash
docker compose up -d frontend
```

### Step 7: Run Split-DB Migration Script Once
Run from repository root while MariaDB container is running:
```bash
docker exec -i ricms_mariadb mysql -uroot -pricms_password < backend/database/microservices-migrate.sql
```

### Step 8: Restart API Services to Pick Up Migrated DB State
```bash
docker compose --profile microservices restart users-service ticketing-service compliance-service api-gateway
```

### Step 9: Verify Health
Check gateway health:
```bash
node -e "fetch('http://localhost:4000/api/health').then(r=>r.text()).then(console.log).catch(e=>{console.error(e.message);process.exit(1);});"
```
Expected: JSON payload with `services.users`, `services.ticketing`, `services.compliance` status flags.

## 7. How Backend Servers Are Separated in Containers
All backend services come from the same backend codebase/image and are separated by command entrypoint:
- users-service: `npm run start:users:dev`
- ticketing-service: `npm run start:ticketing:dev`
- compliance-service: `npm run start:compliance:dev`
- api-gateway: `npm run start:gateway:dev`

This mapping is already present in `docker-compose.yml` and does not require code relocation.

## 8. Environment Variables (Current Compose Baseline)

The following variables are defined in `docker-compose.yml` and used at container startup. Override these in your compose environment or a `.env` file at the repository root when deploying outside the default development baseline.

### 8.1 MariaDB Service
| Variable | Default | Purpose |
|---|---|---|
| `MYSQL_ROOT_PASSWORD` | `ricms_password` | MariaDB root password |
| `MYSQL_DATABASE` | `compliance_hub` | Initial database created at first boot |
| `MYSQL_USER` | `ricms_user` | Application database user |
| `MYSQL_PASSWORD` | `ricms_password` | Application database user password |

### 8.2 Backend / Microservice Variables (applied to all four backend containers)
| Variable | Default | Purpose |
|---|---|---|
| `NODE_ENV` | `development` | Runtime environment mode |
| `DB_HOST` | `mariadb` | Hostname of MariaDB container |
| `DB_PORT` | `3306` | MariaDB port |
| `DB_USERNAME` | `ricms_user` | Database user |
| `DB_PASSWORD` | `ricms_password` | Database user password |
| `DB_DATABASE` | `compliance_hub_users` | Default DB (overridden per service) |
| `USERS_DB_DATABASE` | `compliance_hub_users` | Users service database |
| `TICKETING_DB_DATABASE` | `compliance_hub_ticketing` | Ticketing service database |
| `COMPLIANCE_DB_DATABASE` | `compliance_hub` | Compliance service database |
| `REDIS_HOST` | `redis` | Redis container hostname |
| `REDIS_PORT` | `6379` | Redis port |
| `JWT_SECRET` | `dev-jwt-secret-change-in-production` | **Must be changed in production** — signs access tokens |
| `JWT_REFRESH_SECRET` | `dev-refresh-secret-change-in-production` | **Must be changed in production** — signs refresh tokens |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin for the frontend |
| `MICROSERVICES_STRICT` | `true` | When `true`, gateway returns 503 for unavailable services |

### 8.3 Frontend Variables
| Variable | Default | Purpose |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:4000/api` | Base URL frontend uses to reach the gateway |

### 8.4 Production Secrets Guidance
Before any production or staging deployment, override the following values with strong, randomly generated secrets:

1. **`MYSQL_ROOT_PASSWORD`** and **`MYSQL_PASSWORD`** — use a random 32-character alphanumeric string.
2. **`JWT_SECRET`** and **`JWT_REFRESH_SECRET`** — use a cryptographically random value (minimum 64 characters). These can be generated with:
   ```bash
   node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
   ```
3. **`CORS_ORIGIN`** — set to the actual intranet URL or hostname of the deployed frontend (e.g., `http://192.168.1.100:3000`).
4. **`NEXT_PUBLIC_API_URL`** — set to the actual intranet URL or hostname of the deployed gateway (e.g., `http://192.168.1.100:4000/api`).

Store secrets in a `.env` file at the repository root (which is excluded from version control) or inject them through your CI/CD or container orchestration tool. Never commit secrets to the repository.

## 9. Post-Deployment Validation Checklist
- Frontend opens at `http://<host>:3000`
- Gateway responds at `http://<host>:4000/api/health`
- Users API reachable through gateway `/api/users`
- Ticketing API reachable through gateway `/api/tickets`
- Compliance API reachable through gateway `/api/documents`
- Login succeeds
- Core dashboard pages load without API 500 errors

## 10. Troubleshooting

### 10.1 Port Already In Use
Symptoms: `EADDRINUSE` in service logs.
Action:
```bash
docker compose ps
docker compose logs <service-name>
```
Stop conflicting local process/container and restart target service.

### 10.2 Upstream Service Unavailable
Symptoms: gateway returns 503 with `Service currently unavailable`.
Action:
- check service container status
- check DB connectivity and env vars
- check gateway `/api/health` service flags

### 10.3 Migration Errors
Action:
- verify MariaDB is healthy
- rerun migration command
- inspect DB object state in `compliance_hub_users`, `compliance_hub_ticketing`, `compliance_hub`

## 11. Rollback (Safe Reversal)
1. Stop all application containers:
```bash
docker compose --profile microservices down
```
2. Restore DB from latest pre-deployment backup.
3. Checkout previous known-good tag/commit.
4. Rebuild and redeploy with previous compose image state.

## 12. Operational Notes
- Keep production-like healthchecks and restart policies in staging.
- Use regular DB backups before schema/migration runs.
- Prefer non-root runtime user for daily operations after initial setup.
