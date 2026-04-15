# Contributing to RICTMS Compliance Hub

## Overview

This is an internal enterprise application. Contributions are made by the in-house development team following the BMAD development methodology. This guide describes how to set up a development environment, make changes, and submit work for review.

---

## Development Environment Setup

### Prerequisites

Install the following on your development machine before cloning the repository:

| Tool | Minimum Version | Purpose |
|---|---|---|
| Node.js | 18 LTS | Backend and frontend runtime |
| npm | 9 | Package manager |
| Docker Desktop | 24 (Engine) | Container runtime for local services |
| Docker Compose plugin | 2 | Compose orchestration |
| Git | Any current stable | Version control |
| MariaDB client (optional) | 11 | Direct DB inspection during development |

### Cloning and Installing Dependencies

```bash
# Clone the repository
git clone <remote-url>
cd "Compliance Hub"

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Starting the Development Environment

The recommended local development startup is via Docker Compose. This starts MariaDB, Redis, and all backend microservices:

```bash
# Start all services (first time or after schema changes)
docker compose --profile microservices up -d

# Check that all containers are healthy
docker compose ps
```

The frontend can also be run from Docker Compose:

```bash
docker compose up -d frontend
```

Or run outside Docker for faster hot-reload during active frontend development:

```bash
cd frontend
npm run dev
```

### First-Time Database Initialization

After MariaDB is healthy, run the migration script once to set up all three split databases and their compatibility objects:

```bash
docker exec -i ricms_mariadb mysql -uroot -pricms_password < backend/database/microservices-migrate.sql
```

Then restart the backend services to pick up the migrated state:

```bash
docker compose --profile microservices restart users-service ticketing-service compliance-service api-gateway
```

### Seed Development Data

To load KPI, metrics, issuances, and document sample data:

```bash
cd backend
npm run db:seed
```

---

## Branch and Commit Conventions

### Branching

- Create feature branches from the current development branch (not `main` unless directed).
- Branch name format: `feature/<short-description>`, `fix/<short-description>`, or `hotfix/<short-description>`.
- Example: `feature/attendance-export`, `fix/kpi-null-score`

### Commit Messages

Follow this format:

```
<type>(<scope>): <short description>

[optional body]
```

Types:
- `feat` — new feature
- `fix` — bug fix
- `refactor` — internal restructure with no behavior change
- `test` — adding or updating tests
- `chore` — dependency or config change
- `docs` — documentation only

Example:

```
fix(kpi): correct lower_is_better scoring formula

target/actual*100 was inverted; now uses actual/target*100 with clamp.
```

### Versioning

This project uses semantic versioning (`x.y.z`). Every change must increment the patch version (`z`). Update `package.json` in both `backend/` and `frontend/` and add a corresponding entry to `CHANGELOG.md`.

---

## Code Style and Quality

### Backend (NestJS / TypeScript)

- Follow existing module structure. New domain modules go under `backend/src/modules/`.
- Services, controllers, and entities follow NestJS conventions (decorated classes, dependency injection).
- Do not use `DB_SYNCHRONIZE=true` in any environment. Schema changes require explicit migration SQL.
- Always exclude sensitive fields (e.g., `passwordHash`) from API responses using `@Exclude()` and the global `ClassSerializerInterceptor`.
- Run the test suite before submitting changes:
  ```bash
  cd backend
  npm run test
  ```

### Frontend (Vite + React / TypeScript)

- Pages go under `frontend/src/app/dashboard/`.
- Shared components go under `frontend/src/components/`.
- API calls go through `frontend/src/lib/api/`.
- Use Material-UI (MUI) components consistently with existing patterns.
- Run the type checker before submitting:
  ```bash
  cd frontend
  npm run build
  ```

### Environment Variables

Never commit secrets. Use `docker-compose.yml` defaults only for local development. For any deployment use `.env` files that are excluded from version control. See the `deployment.md` guide for the full environment variable reference and production secrets guidance.

---

## Testing Expectations

Before submitting any change for review:
1. **Backend unit tests pass**: `cd backend && npm run test`
2. **Backend build succeeds**: `cd backend && npm run build`
3. **Frontend build and type-check succeeds**: `cd frontend && npm run build`
4. **All running services healthy**: `curl http://localhost:4000/api/health` returns all services as `true`.
5. **Core smoke paths verified**: login, dashboard load, documents list, tickets list, KPI dashboard load without a 500 error.

---

## Pull Request / Code Review Process

1. Open a pull request (PR) or code review request against the target branch.
2. Fill in the PR description including:
   - What changed and why
   - Affected files
   - Test steps and results
   - QA validation summary (reference relevant stories from `INHOUSE-QA-USER-STORIES.md`)
3. At least one reviewer approval is required before merging.
4. All CI checks (build, test, lint) must pass.
5. Update `CHANGELOG.md` with the release entry before merge.

---

## Additional References

- Architecture and system overview: `MAIN-SYSTEM-DOCUMENTATION.md`
- Deployment procedure: `deployment.md`
- QA user stories and acceptance criteria: `INHOUSE-QA-USER-STORIES.md`
- User walkthrough: `WALKTHROUGH.md`
- QA validation manual: `QA-USER-MANUAL.md`
- Change history: `CHANGELOG.md`
