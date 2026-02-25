# RICMS Compliance Hub - Setup Guide

> Update (`v1.1.0-dev`, 2026-02-24): setup and smoke-test guidance now assume blob-backed document persistence (`file_blob`, `preview_blob`) with DOCX→PDF preview conversion.

> Local setup/tracking document (not included in `v1.0.0` release push package).

## Current Runtime Defaults (2026-02-24)

- Backend API: `http://localhost:4000/api`
- Frontend (Vite): `http://localhost:3000` (or next available dev port)
- Database: MariaDB
- Queue/cache: Redis

## Prerequisites

Before you begin, ensure you have the following installed:
- **Node.js** 20.x or higher ([Download](https://nodejs.org/))
- **Docker Desktop** ([Download](https://www.docker.com/products/docker-desktop))
- **Git** ([Download](https://git-scm.com/))
- **A code editor** (VS Code recommended)

## Step-by-Step Setup Instructions

### 1. Clone the Repository

```powershell
# Navigate to your projects directory
cd C:\Users\mjdibay\source\repos

# If you need to pull latest changes
cd "Compliance Hub"
git pull
```

### 2. Backend Setup

```powershell
# Navigate to backend directory
cd backend

# Copy environment file
Copy-Item .env.example .env

# Install dependencies
npm install
```

**Edit `.env` file if needed** (default values should work for local development):
```env
NODE_ENV=development
PORT=4000
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=ricms_user
DB_PASSWORD=ricms_password
DB_DATABASE=ricms_compliance
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-this-in-production
REDIS_HOST=localhost
REDIS_PORT=6379
```

### 3. Frontend Setup

```powershell
# Navigate to frontend directory (from root)
cd ..\frontend

# Copy environment file
Copy-Item .env.example .env.local

# Install dependencies
npm install
```

### 4. Start MariaDB and Redis with Docker

```powershell
# Navigate back to root directory
cd ..

# Start only database services
docker-compose up -d mariadb redis
```

**Wait for services to be healthy** (check with):
```powershell
docker-compose ps
```

### 5. Set Up the Database

```powershell
# Navigate to backend
cd backend

# The database will be created automatically by TypeORM synchronize
# For production, you would run migrations instead:
# npm run migration:run
```

### 6. Create Initial Admin User

You have two options:

**Option A: Using psql (if installed)**
```powershell
# Connect to database
psql -h localhost -U ricms_user -d ricms_compliance

# Create admin user (password will be "Admin@123")
INSERT INTO users (email, password_hash, first_name, last_name, role, active, created_at, updated_at)
VALUES (
  'admin@ricms.gov.ph',
  '$2b$10$YQmE9Z8K7qY6Z8K7qY6Z8O8K7qY6Z8K7qY6Z8K7qY6Z8K7qY6Z8K7q',
  'System',
  'Administrator',
  'super_admin',
  true,
  NOW(),
  NOW()
);
```

**Option B: Create a seed script** (recommended)

Create `backend/src/database/seeds/initial-user.ts`:
```typescript
import * as bcrypt from 'bcrypt';

export async function seedInitialUser(dataSource: any) {
  const userRepository = dataSource.getRepository('User');
  
  const existingAdmin = await userRepository.findOne({
    where: { email: 'admin@ricms.gov.ph' }
  });
  
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash('Admin@123', 10);
    
    await userRepository.save({
      email: 'admin@ricms.gov.ph',
      passwordHash,
      firstName: 'System',
      lastName: 'Administrator',
      role: 'super_admin',
      active: true,
    });
    
    console.log('✅ Admin user created: admin@ricms.gov.ph / Admin@123');
  }
}
```

### 7. Start the Backend Server

```powershell
# From backend directory
npm run start:dev
```

**You should see**:
```
🚀 Application is running on: http://localhost:4000/api
```

**Test the API**:
```powershell
# In a new PowerShell window
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -Headers @{"Content-Type"="application/json"} -Body '{"email":"admin@ricms.gov.ph","password":"Admin@123"}'
```

### 8. Start the Frontend

```powershell
# In a new PowerShell window, navigate to frontend
cd frontend

# Start development server
npm run dev
```

**You should see**:
```
- Local:        http://localhost:3000
```

### 9. Access the Application

1. Open your browser and go to: **http://localhost:3000**
2. You'll be redirected to the login page
3. Log in with:
   - **Email**: `admin@ricms.gov.ph`
   - **Password**: `Admin@123`
4. You should be redirected to the dashboard

## Alternative: Using Docker Compose for Everything

If you prefer to run everything in Docker:

```powershell
# From root directory
docker-compose up --build
```

This will start:
- PostgreSQL on port 5432
- Redis on port 6379
- Backend API on port 4000
- Frontend on port 3000

**Note**: First build may take several minutes.

## Troubleshooting

### Issue: Port already in use

**Fix**: Stop the service using the port or change the port in `.env` files.

```powershell
# Check what's using a port (e.g., 4000)
netstat -ano | findstr :4000

# Kill the process (replace PID)
taskkill /F /PID <PID>
```

### Issue: Cannot connect to MariaDB

**Fix**: Ensure Docker is running and PostgreSQL container is healthy.

```powershell
# Check Docker containers
docker ps

# View MariaDB logs
docker logs ricms_mariadb

# Restart container if needed
docker-compose restart mariadb
```

### Issue: EReferenceError: localStorage is not defined

**Fix**: This happens during server-side rendering. The code already handles this with `typeof window !== 'undefined'` checks. If you see this, ensure you're using the latest code.

### Issue: Module not found errors

**Fix**: Reinstall dependencies.

```powershell
# Backend
cd backend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install

# Frontend
cd ../frontend
Remove-Item -Recurse -Force node_modules
Remove-Item package-lock.json
npm install
```

### Issue: CORS errors

**Fix**: Ensure `CORS_ORIGIN` in backend `.env` matches your frontend URL (http://localhost:3000).

## Development Workflow

### Running Tests

**Backend:**
```powershell
cd backend
npm run test           # Unit tests
npm run test:e2e       # E2E tests
npm run test:cov       # Coverage report
```

**Frontend:**
```powershell
cd frontend
npm run test
```

### Code Formatting

```powershell
# Backend
cd backend
npm run format

# Frontend
cd frontend
npm run format
```

### Database Migrations (Production)

```powershell
cd backend

# Generate migration
npm run migration:generate -- src/database/migrations/MigrationName

# Run migrations
npm run migration:run

# Revert last migration
npm run migration:revert
```

## Next Steps

After successful setup:

1. **Review the BMAD documentation** in `.bmad/` directory:
   - `01_PRD.md` - Product Requirements
   - `02_ARCH.md` - Architecture Design
   - `03_TASKS.md` - Task Breakdown

2. **Start implementing features** following the sprint plan in `03_TASKS.md`

3. **Current Sprint Status**: Sprint 0 (Project Setup) and Sprint 1 (Auth & Core Entities) are mostly complete

4. **Next Sprints**:
   - Sprint 2: Document Management

## Quick Verification: Issuance Mapping (Post-release patch)

1. Login as `super_admin` or `reviewer`.
2. Open `Issuances` page.
3. Confirm `Add Issuance` and mapping (link icon) actions are visible.
4. Open mapping dialog and link a document to an issuance.
5. Unlink the same document and verify both actions succeed.
6. Login as non-compliance role and confirm read-only behavior on issuance actions.
7. Open `User Manual` from sidebar and verify `/dashboard/user-manual` loads.
8. As super_admin/reviewer, return a pending document with mandatory remarks and verify focal visibility.
9. As super_admin, create/edit/deactivate/delete issue types and categories from Issues page.
   - Sprint 3: Compliance Engine
   - Sprint 4: Reviews & Comparison
   - Sprint 5: References & Tickets
   - Sprint 6: Dashboard & Reporting
   - Sprint 7: Testing & Deployment

## Useful Commands

### Docker Commands

```powershell
# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# View logs
docker-compose logs -f

# Rebuild containers
docker-compose up --build

# Remove all containers and volumes
docker-compose down -v
```

### Git Commands

```powershell
# Create feature branch
git checkout -b feature/your-feature-name

# Commit changes
git add .
git commit -m "Description of changes"

# Push to remote
git push origin feature/your-feature-name
```

## Support

For questions or issues:
- Check the [README.md](../README.md)
- Review architecture docs in `.bmad/` directory
- Contact the development team

---

**Happy Coding! 🚀**
