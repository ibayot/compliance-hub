# RICTMS Compliance Hub - Installation Guide

> **Release `v1.4.0` (2026-03-03):** Pull latest code, run `npm run db:seed` in `backend/`, then restart backend/frontend. This release expands Issuances baseline references (laws, IRRs, standards, Executive Orders, DICT/NPC circular references, NCSP) and adds amendment metadata fields displayed in Issuances UI. Package versions are aligned to `1.4.0` (backend/frontend).

> **Patch (`v1.4.0`, 2026-03-03):** Install VS Code PDF viewer extension (`tomoki1207.pdf`) for local PDF inspection. For manual issuance validation, place files under `issuance-file-drop/` and run `python scripts/classify_issuance_drop.py` to generate `issuance-file-drop/classification-results.csv` with Included / Mark-for-Removal / Mark-for-Review outputs. This workflow does not delete existing seeded issuances.

> **Patch 2 (`v1.4.0`, 2026-03-03):** Deep-dive classification additionally writes `issuance-file-drop/deepdive-assessment.md` and enriches CSV with policy grouping/category fields. AO/MC files are included by rule as `INTERNAL_POLICY` categories.

> **Patch 3 (`v1.4.0`, 2026-03-03):** Reassessment applies a public-service inclusion criterion. Re-run `python scripts/classify_issuance_drop.py` after adding files and validate that public-service issuances are included while sector-specific non-general issuances are explicitly deferred with reason text.

> **Patch 4 (`v1.4.0`, 2026-03-03):** After pulling latest code, run `npm run db:seed` in `backend/` to load internal AO/MC issuance rows and `NPC-CIRCULAR-17-01` into Issuances. Build frontend (`npm run build` in `frontend/`) to apply category label formatting updates in Issuances filters.

> **Patch 5 (`v1.4.0`, 2026-03-03):** Issuances now include DB-backed attachment fields and APIs. Re-run `npm run db:seed` (or start backend once to auto-apply `ALTER TABLE` from the references service), then run frontend build/type-check. Validate that row actions are under ellipsis, pagination appears under Issuances table, and title-click opens attachment only when no source link exists.

> **Release `v1.3.0.22` (2026-03-03):** Pull latest code, run `npm run db:seed` in `backend/`, then restart backend/frontend. This update enables Issuances dropdown filters (Authority/Category/Status), active/inactive status management for issuances, and deeper applicability/relevance seeded narratives. If backend start fails with `EADDRINUSE` on `:4000`, stop the existing listener and restart.

> **Release `v1.3.0.21` (2026-03-03):** Backend + frontend + seed update. Pull latest code, run `npm run db:seed` in `backend/`, then restart backend/frontend. This applies comprehensive ICT issuance inclusion (laws/circulars/memorandums/IRRs/ISO/NIST), adds issuance metadata fields (`issuance_type`, `applicability_scope`, `relevance_notes`), and enables the new Applicability/Relevance modal action in Issuances. No destructive migration required; seed includes `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` safeguards.

> **Release `v1.3.0.20` (2026-03-03):** Seed and documentation update. Pull latest code, run `npm run db:seed` in `backend/`, then restart backend/frontend. This refreshes Issuances baseline to ICT-relevant operational/governance/safety items with authoritative links and adds traceability reference `ICT-ISSUANCE-RELEVANCE-MAP.md`. No schema migration required.

> **Release `v1.3.0.19` (2026-03-03):** Frontend trend-rendering patch only (no schema changes). Pull latest code and rebuild frontend/backend. Optional reseed (`npm run db:seed` in `backend/`) was smoke-validated and remains stable (`12` active metrics, `12` applicability rows, `10` pending docs). Post-upgrade check: KPI/Reports Quarterly/Semestral/Annual trend cells should display zigzag movement over visible points, and arrowheads should follow natural line angle with no forced tilt.

> **Release `v1.3.0.18` (2026-03-03):** Frontend + seed refinement patch. Pull latest code, rebuild frontend/backend, then run `npm run db:seed` in `backend/`. This applies subtle KPI/Reports trend arrowhead tilt tuning (~5°), keeps metric applicability scoped as one global set + one targeted set per unit document type, and updates pending Jan/Feb/Mar 2025 queue samples (`doc-017..022`) to `Monthly Report` types so targeted metric mappings remain isolated. Repository modal now supports direct download from preview. Rollback: revert to previous commit/tag and rerun seed.

> **Release `v1.3.0.17` (2026-03-03):** Frontend + seed reliability patch. Pull latest code, run `npm run build` in `backend/`, then run `npm run db:seed` in `backend/` (new seed runner at `src/database/seed.ts`). This reseed restores required baseline data: 12 active metrics (3 per type), 12 applicability mappings, and pending sample documents (`doc-017..022`) visible in Documents queue for focal scope (`uploaded_by=3`). No schema migration required. Rollback: checkout previous tag/commit and rerun prior seed baseline.

> **Release `v1.3.0.16` (2026-03-04):** Frontend + backend + seed update. Pull latest code, rebuild both applications, and re-run `backend/src/database/seed-data.sql` to load Jan/Feb/Mar 2025 per-unit report samples (`doc-017..022`). No schema migration required. Post-upgrade checks: KPI/Reports direction column (`↑/↓`) in single-unit KPI tables, trend sparkline arrowheads, lower-is-better scoring behavior (`target/actual` clamped), KPI band pie filter-scoping + transparent `PARTIAL` slice, and repository table without status/compliance columns.
> **Release `v1.3.0.15` (2026-03-04):** Frontend + backend + seed update. Pull latest code, rebuild both apps, and re-run `backend/src/database/seed-data.sql` to load expanded issuance references and pending 2026 sample queue records. No new schema migration required. Restart services after seeding. Post-upgrade smoke checks: KPI/Reports monthly previous-month range, Q/S average-based trend direction, Reports chart legends removed, Documents/Reviews pending-only queues, Repository modal preview + ready/compliant-only listing.
> **Release `v1.3.0.9` (2026-02-27):** Frontend-only changes (no schema changes, no re-seed required). Pull latest code and rebuild frontend (`npm run build` in `frontend/`). Backend rebuild is optional — no backend files were changed.
> **Release `v1.3.0.8` (2026-02-27):** Frontend-only changes (no schema changes, no re-seed required). Pull latest code and rebuild frontend (`npm run build` in `frontend/`). Backend rebuild is optional — no backend files were changed.
> **Release `v1.3.0.7` (2026-02-27):** Hotfix — no schema changes, no re-seed required. Pull latest, run `npm run build` in `backend/` (or restart with `dist/main.js`). If you previously manually set `DB_SYNCHRONIZE=true` in your `.env`, set it to `false` to prevent the startup `Cannot drop index` FK constraint error. Frontend changes only require a rebuild (`npm run build` in `frontend/`).
> **Release `v1.3.0.6` (2026-02-28):** Frontend-only changes (no schema changes). Pull latest code, run the seed SQL (`backend/src/database/seed-data.sql`) to load IT Unit Jan–Dec 2025 and Finance Unit Feb–Aug 2025 monitoring data, then restart frontend. Seed is a complete re-seed (TRUNCATE + INSERT) — existing KPI monitoring data will be replaced.
> **Release `v1.3.0.5` (2026-02-27):** Bug fix release. No schema changes. Pull latest code and restart frontend only (the fix is in React components).
> **Release `v1.3.0.4` (2026-02-28):** No schema changes. Pull latest code and restart backend/frontend. The new timeseries endpoint is served automatically via the existing KPI module registration.
> **Release `v1.3.0.3` (2026-02-27):** NaN SQL error fix (no schema change). `ALTER TABLE kpi_master` adds `semestral` to frequency enum. Pull latest, run the ALTER, restart backend/frontend. See CHANGELOG for full detail.
> **Release `v1.3.0.2` (2026-02-27):** KPI Dashboard tab bug fixed — graphs now display immediately on page load (tab 0 = Dashboard). No schema changes; pull latest code and restart frontend/backend.
> **Release `v1.3.0.1` (2026-02-27):** Includes KPI access-control/runtime hotfixes and graph dashboard updates. If upgrading from `v1.2.0.4`, restart backend/frontend services after pulling latest code and ensure users re-login to refresh JWT role/unit claims before KPI smoke testing.

> **Release `v1.2.0.4` (2026-02-26):** KPI tables were added (`kpi_master`, `kpi_monitoring`, `kpi_thresholds`, `kpi_scoring_rules`) together with `role_definitions`. If upgrading an existing DB, re-run `schema.sql`, then `seed.sql` (or `seed-data.sql`) to load KPI baseline records and lookup defaults.

> Update (`v1.1.0-dev`, 2026-02-24): installation flow now includes blob-enabled schema (`file_blob`, `preview_blob`) and conversion smoke-test expectations.

> Patch (`v1.1.1-dev`, 2026-02-25): post-install verification now includes settings password change, theme toggle, and super-admin focal-user provisioning checks.

> **Hotfix `v1.1.2.2` (2026-02-25):** if `npm run dev` (frontend) or `npm run start:dev` (backend) exit with code 1 and the error contains `Unexpected token 'âˆ©â•—â”'`, your `package.json` was saved with a UTF-8 BOM by your editor. Fix: run the following PowerShell in each affected directory:
> ```powershell
> $f = 'package.json'; $b = [IO.File]::ReadAllBytes($f); if ($b[0] -eq 0xEF -and $b[1] -eq 0xBB -and $b[2] -eq 0xBF) { [IO.File]::WriteAllBytes($f, $b[3..($b.Length-1)]); Write-Host 'BOM removed' }
> ```

> **Release `v1.2.0.1` (2026-02-26):** New `reportorial_document_types` table is auto-created by TypeORM `synchronize:true` on next backend start. Columns `documents.reportorial_doc_type_id` and `metric_applicability.reportorial_doc_type_id` (both nullable FK) are also added automatically. Run `seed.sql` after upgrading to populate 16 metric templates and 4 reportorial document type examples. No manual schema migration needed.

> **Hotfix `v1.1.2.3` (2026-02-25):** If you encounter `Error: listen EADDRINUSE :::4000` when starting the backend, a previous `npm run start:dev` process is still holding the port. Find and kill it:
> ```powershell
> # Find the PID using port 4000
> netstat -ano | findstr ":4000" | findstr "LISTENING"
> # Kill the PID shown in the rightmost column (e.g., 39940)
> Stop-Process -Id 39940 -Force
> # Then restart the backend normally
> npm run start:dev
> ```

> **Release `v1.1.2` (2026-02-25):** seed data updated â€” run `seed.sql` to load all 4 metric template types, HTML preview blobs, and correct column schema. A `preview_mime_type VARCHAR(50)` column is required on `document_versions` (auto-added by `ALTER TABLE` or TypeORM synchronize). No LibreOffice required â€” mammoth provides DOCXâ†’HTML preview fallback on Windows.

## Table of Contents
1. [Prerequisites](#prerequisites)
2. [Installation Methods](#installation-methods)
3. [Manual Installation](#manual-installation)
4. [Docker Installation](#docker-installation)
5. [Configuration](#configuration)
6. [Database Setup](#database-setup)
7. [Running the Application](#running-the-application)
8. [Troubleshooting](#troubleshooting)

---

## Prerequisites

### Required Software

#### For Manual Installation
- **Node.js**: v18.x or v20.x LTS ([Download](https://nodejs.org/))
- **npm**: v9+ (comes with Node.js)
- **MariaDB**: 11.x or MySQL 8.x ([Download MariaDB](https://mariadb.org/download/))
- **Redis**: 7.x ([Download](https://redis.io/download))
- **Git**: Latest version ([Download](https://git-scm.com/downloads))

#### For Docker Installation
- **Docker**: 24.x+ ([Download](https://www.docker.com/products/docker-desktop))
- **Docker Compose**: v2.x+ (included with Docker Desktop)

### System Requirements
- **Operating System**: Windows 10/11, Windows Server 2016+, Linux (Ubuntu 20.04+), macOS 11+
- **RAM**: Minimum 4GB, 8GB recommended
- **Storage**: 10GB free space (plus additional space for document storage)
- **CPU**: 2+ cores recommended

### Network Requirements
- **Ports Required**:
  - `3000` - Frontend (Vite + React Router; may auto-fallback to 3001/3002)
  - `4000` - Backend API (NestJS)
  - `3306` - MariaDB/MySQL
  - `6379` - Redis

---

## Installation Methods

Choose one of the following installation methods based on your environment:

### Option 1: Docker Installation (Recommended)
âœ… **Pros**: Quick setup, isolated environment, includes all dependencies  
âŒ **Cons**: Requires Docker installed

### Option 2: Manual Installation
âœ… **Pros**: Direct control, easier debugging, native performance  
âŒ **Cons**: More setup steps, manual dependency management

---

## Manual Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/rictms-compliance-hub.git
cd rictms-compliance-hub
```

### Step 2: Install MariaDB

#### Windows
1. Download MariaDB installer from [mariadb.org](https://mariadb.org/download/)
2. Run the installer and follow the wizard
3. Set root password during installation
4. Ensure MariaDB service is running

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install mariadb-server
sudo systemctl start mariadb
sudo mysql_secure_installation
```

#### macOS
```bash
brew install mariadb
brew services start mariadb
mysql_secure_installation
```

### Step 3: Install Redis

#### Windows
1. Download Redis from [redis.io](https://redis.io/download) or use Windows Subsystem for Linux (WSL)
2. Or use Docker: `docker run -d -p 6379:6379 redis:7-alpine`

#### Linux (Ubuntu/Debian)
```bash
sudo apt install redis-server
sudo systemctl start redis-server
```

#### macOS
```bash
brew install redis
brew services start redis
```

### Step 4: Install Backend Dependencies

```bash
cd backend
npm install
```

### Step 5: Install Frontend Dependencies

```bash
cd ../frontend
npm install
```

---

## Docker Installation

### Step 1: Clone the Repository

```bash
git clone https://github.com/your-org/rictms-compliance-hub.git
cd rictms-compliance-hub
```

### Step 2: Start All Services

```bash
docker-compose up -d
```

This command will:
- Pull required Docker images (MariaDB, Redis, Node.js)
- Build backend and frontend containers
- Start all services
- Create necessary volumes for data persistence

### Step 3: Verify Services are Running

```bash
docker-compose ps
```

You should see all services in "Up" status:
```
ricms_mariadb     Up    3306/tcp
ricms_redis       Up    6379/tcp
ricms_backend     Up    4000/tcp
ricms_frontend    Up    3000/tcp
```

### Step 4: Initialize Database

```bash
docker-compose exec backend npm run migration:run
```

---

## Configuration

### Backend Configuration

Create or edit `backend/.env`:

```env
# Application
NODE_ENV=development
PORT=4000
APP_URL=http://localhost:4000
DB_SYNCHRONIZE=true

# Database (MariaDB)
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password_here
DB_DATABASE=rictms_compliance

# JWT Security
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_EXPIRATION=30m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
JWT_REFRESH_EXPIRATION=7d

# Redis (for Bull Queue)
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage Configuration
STORAGE_TYPE=local
STORAGE_PATH=./storage

# AWS S3 (Optional - only if using S3 storage)
# AWS_ACCESS_KEY_ID=your_access_key
# AWS_SECRET_ACCESS_KEY=your_secret_key
# AWS_REGION=us-east-1
# AWS_S3_BUCKET=rictms-documents

# File Upload Limits
MAX_FILE_SIZE=52428800
ALLOWED_FILE_TYPES=application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document

# CORS
CORS_ORIGIN=http://localhost:3000

# API Rate Limiting
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX_REQUESTS=300

# Queue Configuration
QUEUE_CONCURRENCY=2
```

Queue clients are configured to work with Bull processing defaults where Redis request retries are unbounded (`maxRetriesPerRequest: null`) to avoid upload-processing retry incompatibility.

### CI/CD Note

The repository includes a GitHub Actions workflow at `.github/workflows/ci.yml` for:
- backend/frontend build checks
- backend test hook execution
- dependency security audit checks

### Frontend Configuration

Create or edit `frontend/.env.local`:

```env
# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:4000/api

# Application
NEXT_PUBLIC_APP_NAME=RICTMS Compliance Hub
NEXT_PUBLIC_APP_VERSION=1.0.0

# Features (Optional)
NEXT_PUBLIC_ENABLE_ANALYTICS=false
NEXT_PUBLIC_ENABLE_DEBUG=false
```

---

## Database Setup

### Step 1: Create Database

#### Using MySQL/MariaDB CLI:

```bash
mysql -u root -p
```

Then run:

```sql
CREATE DATABASE rictms_compliance CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

#### Or run the initialization script:

```bash
cd backend
mysql -u root -p < src/database/init.sql
```

### Step 2: Run Schema Migration

```bash
cd backend
mysql -u root -p rictms_compliance < src/database/schema.sql
```

This will create all required tables:
- users
- units
- documents & document_versions
- metric_templates, metric_applicability, metric_results
- manual_reviews & version_comparisons
- issuances & document_issuances
- tickets & ticket_comments

### Step 3: Seed Sample Data (Optional)

For development and testing, populate the database with sample data:

```bash
mysql -u root -p rictms_compliance < src/database/seed.sql
```

This creates:
- 3 test users (admin, reviewer1, viewer1)
- 5 organizational units
- 5 regulatory issuances
- 5 sample documents with versions
- 5 metric templates
- Sample reviews and tickets

**Default Login Credentials** (after seeding):
- Username: `admin`
- Password: `Admin123!`

---

## Running the Application

### Manual Installation - Development Mode

#### Terminal 1: Start Redis (if not running as service)
```bash
redis-server
```

#### Terminal 2: Start Backend
```bash
cd backend
npm run start:dev
```

Backend will start on [http://localhost:4000](http://localhost:4000)  
API Documentation (Swagger): [http://localhost:4000/api](http://localhost:4000/api)

#### Terminal 3: Start Frontend
```bash
cd frontend
npm run dev
```

Frontend will start on [http://localhost:3000](http://localhost:3000)

### Docker Installation

All services start automatically with `docker-compose up -d`

View logs:
```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f backend
docker-compose logs -f frontend
```

### Production Build

#### Backend Production Build
```bash
cd backend
npm run build
npm run start:prod
```

#### Frontend Production Build
```bash
cd frontend
npm run build
npm run start
```

---

## Post-Installation Steps

### 1. Access the Application

Open your browser and navigate to:
- **Frontend**: [http://localhost:3000](http://localhost:3000)
- **Backend API**: [http://localhost:4000](http://localhost:4000)
- **API Docs**: [http://localhost:4000/api](http://localhost:4000/api)

### 2. Initial Login

If you ran the seed script:
- Username: `admin`
- Password: `Admin123!`

Otherwise, you'll need to create the first admin user directly in the database:

```sql
INSERT INTO users (id, username, email, password, role, is_active, created_at, updated_at) 
VALUES (
  UUID(), 
  'admin', 
  'admin@rictms.gov.ph', 
  '$2b$10$K7L1Ow1WlPqY5xZJX5Hn2.xvK3bC2aE9j9pFW6K7L1Ow1WlPqY5xZ',
  'admin', 
  TRUE, 
  NOW(), 
  NOW()
);
```

Password is `Admin123!` (hashed with bcrypt)

### 3. Create Storage Directories

```bash
cd backend
mkdir -p storage/documents storage/previews storage/temp
```

Or let the application create them automatically on first upload.

### 4. Verify Services

- âœ… Check if backend responds: `curl http://localhost:4000/api/health`
- âœ… Check if frontend loads: Visit `http://localhost:3000`
- âœ… Check if Redis is accessible: `redis-cli ping` (should return "PONG")
- âœ… Check if database is accessible: `mysql -u root -p rictms_compliance -e "SHOW TABLES;"`

### 5. Verify Settings + Focal Management

After login:

1. Open **Settings** and confirm:
  - Theme toggle switches between light/dark modes.
  - Password change succeeds with correct current password.
2. If logged in as `super_admin`, confirm **Focal User Management** is visible and can create focal/technician users with:
  - first/middle/last/suffix,
  - staff ID,
  - role,
  - position,
  - designation.
3. Open **Tickets** and verify category selection filters issue type options.

---

## Troubleshooting

### Issue: Upload fails with Redis `maxRetriesPerRequest` error

**Symptom**: Upload completes but background processing fails with retry-related Redis client errors.

**Resolution**:
1. Ensure backend is running the latest configuration where Bull Redis sets `maxRetriesPerRequest: null`.
2. Restart backend service after pulling latest changes.
3. Verify Redis connectivity using your local Redis health checks.

### Issue: Extracted text appears missing in one table

**Symptom**: Extracted text is visible in document views but not in version-level inspection (or vice versa).

**Resolution**:
1. Reprocess/upload a DOCX with the current build.
2. Confirm extraction is now persisted to both `documents.extracted_text` and `document_versions.extracted_text`.
3. If needed, trigger reprocessing for previously uploaded documents.

### Issue: Issuance mapping actions are missing in UI

**Symptom**: User can open Issuances but cannot see `Add/Edit/Delete` or link/unlink mapping actions.

**Resolution**:
1. Confirm account role is `super_admin` or `reviewer` (compliance role).
2. Re-login to refresh JWT role claims in frontend context.
3. Verify backend authorization for issuance endpoints is reachable at `/api/issuances`.

### Issue: Link button is not shown for a document in mapping dialogs

**Symptom**: A document appears in lists but cannot be linked to issuance or to another document.

**Resolution**:
1. Verify document status is `ready` (compliant).
2. If document is still `pending`, complete manual review and mark it `compliant`.
3. Reopen mapping dialog after status update.

### Issue: Return button is disabled for document records

**Expected Behavior**:
- Return is available only for pending documents.
- Return requires remarks and creates an auditable manual-review entry.

**Resolution**:
1. Ensure document is in `pending` status.
2. Provide mandatory return remarks in the return dialog.

### Issue: User Manual page shows 404 or does not open

**Symptom**: Sidebar displays `User Manual` but navigation fails.

**Resolution**:
1. Verify frontend route registration includes `/dashboard/user-manual`.
2. Confirm role is authenticated and sidebar access includes `roles: ['all']`.
3. Rebuild frontend after route changes and clear browser cache.

### Backend Won't Start

#### Error: "Cannot connect to database"
```
Solution:
1. Verify MariaDB/MySQL is running
2. Check database credentials in .env
3. Ensure database 'rictms_compliance' exists
4. Test connection: mysql -u root -p -e "SHOW DATABASES;"
```

#### Error: "Redis connection failed"
```
Solution:
1. Verify Redis is running
2. Check Redis connection in .env
3. Test connection: redis-cli ping
4. On Windows, consider using Docker for Redis
```

#### Error: "Port 4000 already in use"
```
Solution:
1. Change PORT in backend/.env to another port (e.g., 5000)
2. Update NEXT_PUBLIC_API_URL in frontend/.env.local accordingly
3. Or stop the process using port 4000
```

### Frontend Won't Start

#### Error: "Port 3000 already in use"
```
Solution:
1. Change port: npm run dev -- -p 3001
2. Or stop the process using port 3000
```

#### Error: "Cannot fetch from API"
```
Solution:
1. Ensure backend is running on port 4000
2. Check NEXT_PUBLIC_API_URL in frontend/.env.local
3. Check browser console for CORS errors
4. Verify CORS_ORIGIN in backend/.env includes frontend URL
```

### Database Issues

#### Error: "Access denied for user"
```
Solution:
1. Verify database credentials in backend/.env
2. Ensure user has proper permissions:
   GRANT ALL PRIVILEGES ON rictms_compliance.* TO 'root'@'localhost';
   FLUSH PRIVILEGES;
```

#### Error: "Database table doesn't exist"
```
Solution:
1. Run schema migration: mysql -u root -p rictms_compliance < backend/src/database/schema.sql
2. Check if database was created: SHOW DATABASES;
3. Use correct database: USE rictms_compliance; SHOW TABLES;
```

### Docker Issues

#### Error: "Cannot connect to Docker daemon"
```
Solution:
1. Start Docker Desktop
2. Verify Docker is running: docker --version
3. On Linux: sudo systemctl start docker
```

#### Error: "Port is already allocated"
```
Solution:
1. Stop conflicting services (MariaDB, Redis, etc.)
2. Or modify ports in docker-compose.yml
```

#### Error: "Container exits immediately"
```
Solution:
1. Check logs: docker-compose logs <service-name>
2. Verify environment variables in docker-compose.yml
3. Rebuild containers: docker-compose up --build
```

### File Upload Issues

#### Error: "File too large"
```
Solution:
1. Increase MAX_FILE_SIZE in backend/.env
2. Also check nginx/reverse proxy file size limits
```

#### Error: "Permission denied when writing to storage"
```
Solution:
1. Check storage directory permissions
2. Ensure app has write access: chmod -R 755 backend/storage
```

### Performance Issues

#### Slow Document Processing
```
Solution:
1. Increase QUEUE_CONCURRENCY in backend/.env
2. Check Redis memory usage
3. Consider allocating more RAM to services
```

#### High Memory Usage
```
Solution:
1. Reduce QUEUE_CONCURRENCY
2. Limit MAX_FILE_SIZE
3. Enable pagination in document lists
```

---

## Updating the Application

### Manual Installation

```bash
# Pull latest changes
git pull origin main

# Update backend
cd backend
npm install
npm run build

# Update frontend
cd ../frontend
npm install
npm run build

# Run any new migrations
cd ../backend
mysql -u root -p rictms_compliance < src/database/migrations/latest.sql
```

### Docker Installation

```bash
# Pull latest changes
git pull origin main

# Rebuild and restart containers
docker-compose down
docker-compose build
docker-compose up -d

# Run migrations
docker-compose exec backend npm run migration:run
```

---

## Uninstallation

### Manual Installation

```bash
# Stop services
# Stop backend (Ctrl+C in terminal or kill process)
# Stop frontend (Ctrl+C in terminal or kill process)

# Remove storage data
rm -rf backend/storage/*

# Drop database
mysql -u root -p -e "DROP DATABASE rictms_compliance;"

# Remove application files
cd ..
rm -rf rictms-compliance-hub
```

### Docker Installation

```bash
# Stop and remove all containers, networks, and volumes
docker-compose down -v

# Remove application files
cd ..
rm -rf rictms-compliance-hub
```

---

## Additional Resources

- **README.md**: Project overview and quick start
- **CAPABILITIES.md**: Complete feature list
- **WALKTHROUGH.md**: Step-by-step usage guide
- **CHANGELOG.md**: Version history and updates
- **API Documentation**: http://localhost:4000/api (when backend is running)

---

## Support

For issues and questions:
- Create an issue in the GitHub repository
- Contact the development team
- Check the troubleshooting section above

---

**Security Note**: Remember to change all default passwords and secrets before deploying to production!
