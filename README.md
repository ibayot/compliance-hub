# RICTMS Compliance Hub
> **Release `v1.2.0.1` (2026-02-26):** Reportorial Document Types per unit (base name + period suffix filename validation, monthly/quarterly/annual); metrics now linked to documents via FK (not free-text strings); navigation fixes (Dashboard exact match, Issuances restricted to reviewers); breadcrumbs show document titles; version history layout fixed; deactivate user bug fixed; user creation dialog with unit assignment; 16 metric templates seeded (4 per type); Document upload fully overhauled.
> Documentation update (`v1.1.0-dev`, 2026-02-24): document versions now support blob-backed source/preview storage with filesystem fallback for legacy rows.

> Patch update (`v1.1.1-dev`, 2026-02-25): settings now include password change + light/dark mode, and super-admins can provision focal users with extended profile fields.

> **Hotfix `v1.1.2.3` (2026-02-25):** fixed DOCX document viewer returning 404 for uploaded DOCX files (on-demand mammoth fallback in `getPreview()`); fixed `passwordHash` being exposed in all API responses (`ClassSerializerInterceptor` now registered globally); documented EADDRINUSE port conflict resolution.

> **Hotfix `v1.1.2.2` (2026-02-25):** fixed frontend dev server crash caused by UTF-8 BOM in `package.json` files. Vite's PostCSS loader threw `SyntaxError: Unexpected token '∩╗┐'` on BOM-prefixed JSON. All smoke tests pass: login, 5 roles, document preview (`text/html`), document download (`Content-Disposition: attachment`), units, metrics.

> **Release `v1.1.2` (2026-02-25):** fixed document download filename, DOCX preview via mammoth HTML fallback, seeded 4 metric template types, dynamic Role Management in Settings with card layout, Document Viewer renamed, Reviews preview fix, and expanded User Manual field-level documentation.

> A comprehensive document management and compliance tracking system for government agencies

[![License](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Node.js](https://img.shields.io/badge/node-%3E%3D18.0.0-brightgreen.svg)](https://nodejs.org/)
[![MariaDB](https://img.shields.io/badge/mariadb-11.x-blue.svg)](https://mariadb.org/)
[![Vite](https://img.shields.io/badge/vite-5.x-646CFF.svg)](https://vitejs.dev/)
[![NestJS](https://img.shields.io/badge/nestjs-10.x-red.svg)](https://nestjs.com/)

## Overview

The **Regional ICT Management System (RICTMS) Compliance Hub** is an enterprise-grade document management system designed to help government agencies maintain regulatory compliance through intelligent document processing, automated metrics analysis, and collaborative review workflows.

## User Manuals

- Full user walkthrough: [WALKTHROUGH.md](WALKTHROUGH.md)
- QA-focused validation guide: [QA-USER-MANUAL.md](QA-USER-MANUAL.md)

### Key Features

- 🧭 **Assignment-Governed Focal Uploads**: Super admins assign report types to focal users and enforce one submission per cycle
- 🏷️ **Filename Policy Enforcement**: Uploads can be validated with assignment prefix + frequency-aware suffix conventions
- 🔗 **Issuance Mapping Manager**: Super admin and compliance roles can link/unlink documents to issuances
- 🧾 **Issuance Authority Flexibility**: Authorities are editable values and issuance titles open source URLs in a new tab
- ↩️ **Return-to-Focal Workflow**: Super admin/compliance can return pending documents with mandatory remarks (non-destructive)
- 🔁 **Document-to-Document Mapping**: Users can map one document to another (e.g., report ↔ memorandum) using ready/compliant-only linking
- 🧠 **Category-Scoped Issue Types**: Ticket issue types are constrained by selected category in create/detail forms
- 👥 **Collaborative Reviews**: Multi-user review and approval workflows
- 👁️ **Inline Review Viewer**: Digital document viewing inside the review workspace with direct decision tagging
- Automatic `Needs Revision` auto-review tagging when automated checks fail or error
- 📊 **Dashboard & Reports**: Real-time analytics and compliance reporting
- 🔐 **Role-based Access**: Secure access control for different user roles
- Metrics templates are managed from **Administration → Metrics** in the sidebar.
- Number Extraction rules support comma/newline keyword and expected-number lists.
- Date/Deadline checks support monthly, quarterly, annual, and custom frequencies (with regex/group fallback for custom periods).
- 🧩 **Admin Operations UI**: Working Units, Metrics Template, and Reviews pages
- 🛡️ **Security Hardening Baseline**: API rate limiting + config validation + privileged action audit logs
- ⚙️ **User Settings Enhancements**: In-app password change and persistent light/dark theme toggle
- 👤 **Focal User Provisioning**: Super admin can create focal/technician users with first/middle/last/suffix, staff ID, role, position, and designation

## Quick Start
- `super_admin` users can create/update/delete focal report assignments.
- Focal upload options are filtered by active assignments for the selected cycle.
- Assigned report types are shown in the upload module with expected filename guidance.

### Prerequisites

- Node.js 18+ LTS
- MariaDB 11.x or MySQL 8.x
- Redis 7.x
- npm 9+

### Installation

```bash
# Clone the repository
git clone https://github.com/your-org/rictms-compliance-hub.git
cd rictms-compliance-hub

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install

# Configure environment variables
cp backend/.env.example backend/.env
cp frontend/.env.local.example frontend/.env.local
# Edit .env files with your configuration

# Set up database
mysql -u root -p < backend/src/database/init.sql
mysql -u root -p rictms_compliance < backend/src/database/schema.sql
mysql -u root -p rictms_compliance < backend/src/database/seed.sql

# Start the backend (in one terminal)
cd backend
npm run start:dev

# Start the frontend (in another terminal)
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000 (Vite dev server auto-fallbacks to 3001/3002 if occupied)
- Backend API: http://localhost:4000
- API Documentation: http://localhost:4000/api

**Default Login** (after seeding):
- Username: `admin`
- Password: `Admin123!`

### Docker Quick Start

```bash
# Clone and start with Docker
git clone https://github.com/your-org/rictms-compliance-hub.git
cd rictms-compliance-hub
docker-compose up -d

# Initialize database
docker-compose exec backend npm run migration:run
```

## Architecture

### Technology Stack

#### Backend
- **Framework**: NestJS 10.x (Node.js/TypeScript)
- **Database**: MariaDB 11.x with TypeORM
- **Queue**: Bull Queue with Redis
- **Authentication**: JWT with refresh tokens
- **Documentation**: Swagger/OpenAPI
- **Security Middleware**: Helmet + API rate limiting

#### Frontend
- **Framework**: Vite 5.x + React Router 6 (React 18)
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: React Context API
- **HTTP Client**: Axios with interceptors
- **Styling**: Emotion CSS-in-JS

### Quality Baseline

- Backend automated tests for metrics engines are integrated (`npm run test`).
- CI workflow validates backend/frontend builds and runs dependency vulnerability checks.

### System Architecture
```
┌─────────────────────────────────────────────────────────────┐
│                  Frontend (Vite + React Router)              │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐   │
│  │Dashboard │  │Documents │  │ Reviews  │  │ Tickets  │   │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTP/REST API
┌──────────────────────────┴──────────────────────────────────┐
│                      Backend (NestJS)                        │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐           │
│  │Auth Module │  │Docs Module │  │Metrics     │           │
│  └────────────┘  └────────────┘  │Module      │           │
│  ┌────────────┐  ┌────────────┐  └────────────┘           │
│  │Reviews     │  │Tickets     │  ┌────────────┐           │
│  │Module      │  │Module      │  │References  │           │
│  └────────────┘  └────────────┘  │Module      │           │
└──────────┬───────────────────────┴────────────┴────────────┘
           │                        │
     ┌─────┴──────┐           ┌────┴─────┐
     │  MariaDB   │           │  Redis   │
     │  Database  │           │  Queue   │
     └────────────┘           └──────────┘
```

### Module Structure

#### Backend Modules
- **Auth Module**: Authentication and user management
- **Users Module**: User CRUD and role management
- **Units Module**: Organizational unit management
- **Documents Module**: Document upload, versioning, storage
- **Metrics Module**: Compliance scoring and analysis
- **Reviews Module**: Manual review workflows
- **References Module**: Regulatory issuance management
- **Tickets Module**: Issue tracking and collaboration
- **Incidents Module**: Incident lifecycle tracking, 8AM/5PM snapshots, period statistics

### Cybersecurity Incident Analytics

The incident response dashboard now supports:
- Start-of-day and end-of-day tracking (8:00 AM and 5:00 PM, Asia/Manila)
- Severity breakdown (`low`, `medium`, `high`, `critical`)
- Period rollups for `daily`, `weekly`, `monthly`, `quarterly`, and `yearly`
- API endpoint: `GET /api/incidents/period-stats`
- Dashboard/app layout now adjusts correctly to sidebar width in expanded/collapsed modes.
- Login field rendering issues (label overlap) have been fixed.
- Dashboard data fetches are parallelized to reduce perceived load time.
- Vite dev server confirmed healthy (`http://localhost:3001`/`3002` when ports are occupied).

#### Frontend Pages
- **Dashboard**: Overview statistics and quick access
- **Documents**: Document listing, upload, and detail views
- **Issuances**: Regulatory reference management
- **Tickets**: Issue tracking and management
- **Login**: Authentication

## Project Structure

```
rictms-compliance-hub/
├── backend/
│   ├── src/
│   │   ├── auth/               # Authentication module
│   │   ├── users/              # User management
│   │   ├── units/              # Organizational units
│   │   ├── documents/          # Document management
│   │   ├── metrics/            # Compliance metrics
│   │   ├── reviews/            # Review workflows
│   │   ├── references/         # Issuances (regulations)
│   │   ├── tickets/            # Issue tracking
│   │   ├── database/           # Database scripts
│   │   │   ├── init.sql        # Database creation
│   │   │   ├── schema.sql      # Table schemas
│   │   │   └── seed.sql        # Sample data
│   │   ├── common/             # Shared utilities
│   │   │   ├── decorators/
│   │   │   ├── guards/
│   │   │   └── interceptors/
│   │   ├── app.module.ts       # Root module
│   │   └── main.ts             # Application entry
│   ├── storage/                # Document storage
│   ├── .env                    # Environment config
│   ├── package.json
│   └── tsconfig.json
│
├── frontend/
│   ├── src/
│   │   ├── app/                # Page components (migrated from Next app-dir)
│   │   │   ├── dashboard/      # Dashboard pages
│   │   │   ├── login/          # Login page
│   │   │   ├── api/            # API client functions
│   │   │   ├── layout.tsx      # Root layout
│   │   │   └── page.tsx        # Home page
│   │   ├── components/         # Shared React components
│   │   │   ├── DashboardLayout.tsx
│   │   │   ├── DocumentUpload.tsx
│   │   │   └── ...
│   │   ├── contexts/           # React contexts
│   │   │   └── AuthContext.tsx
│   │   ├── lib/                # Utilities
│   │   │   └── api/            # API clients
│   │   └── types/              # TypeScript types
│   ├── .env.local              # Environment config
│   ├── package.json
│   └── vite.config.ts
│
├── docker-compose.yml          # Docker orchestration
├── CAPABILITIES.md             # Feature documentation
├── INSTALLATION.md             # Setup instructions
├── WALKTHROUGH.md              # User guide
├── CHANGELOG.md                # Version history
└── README.md                   # This file
```

## Key Capabilities

### 1. Document Management
- Multi-format upload (PDF, DOCX)
- Automatic version control
- Metadata tagging (type, period, year, unit)
- Document preview and download
- Bulk operations support

### 2. Compliance Analysis
- Text extraction from documents
- Template-based metric evaluation
- Multiple metric categories:
  - Completeness scoring
  - Consistency checking
  - Compliance verification
  - Timeliness monitoring
  - Format validation
- Weighted scoring system
- Historical metric tracking

### 3. Regulatory Reference Management
- Comprehensive issuance database
- Authority and effectivity tracking
- Document-to-issuance linking
- Document-to-document reference linking
- Compliance requirement mapping
- Citation verification
- Role-aware mapping controls for compliance/super-admin users

### 4. Review Workflows
- Multi-user review assignments
- Status tracking (draft, in_review, approved, etc.)
- Rating system (1-5 stars)
- Comment and feedback system
- Version comparison with diff analysis
- Audit trail maintenance
- Review outcome controls workflow status:
  - `compliant` → document is marked `ready`
  - `non_compliant` / `needs_revision` → document returns to `pending`

### 5. Issue & Ticket Management
- Categorized ticket system
- Dynamic issue type and category masters (super-admin managed, soft-delete, activate/deactivate)
- Priority levels (low to urgent)
- Status workflow (open → resolved → closed)
- Document linking
- Threaded comments
- Assignment and notification system

### 6. Dashboard & Analytics
- Real-time compliance statistics
- Document status overview
- Ticket tracking
- Unit performance metrics
- Recent activity feed
- Quick action shortcuts

### 7. Security & Access Control
- Role-based permissions (Admin, Reviewer, Viewer)
- JWT authentication with refresh tokens
- Password hashing (BCrypt)
- Secure session management
- API authentication for all endpoints

### 8. In-App User Manual
- Visual user manual module is available in the dashboard.
- Content is role-based; users only see guides for features their role can access.
- Includes guidance for documents, metrics, reviews, issuances mapping, and issues workflow.
- Route is available at `/dashboard/user-manual` with sidebar navigation.

## API Documentation

Once the backend is running, interactive API documentation is available at:

**http://localhost:4000/api**

The Swagger UI provides:
- Complete endpoint documentation
- Request/response schemas
- Try-it-out functionality
- Authentication testing

### Sample API Endpoints

```
Authentication:
POST   /api/auth/login
POST   /api/auth/refresh
POST   /api/auth/logout

Documents:
GET    /api/documents
POST   /api/documents
GET    /api/documents/:id
PUT    /api/documents/:id
DELETE /api/documents/:id
GET    /api/documents/:id/versions
POST   /api/documents/:id/versions

Metrics:
GET    /api/metrics/templates
POST   /api/metrics/templates
GET    /api/metrics/results/:documentId

Reviews:
GET    /api/reviews
POST   /api/reviews
PUT    /api/reviews/:id
GET    /api/reviews/document/:documentId

Tickets:
GET    /api/tickets
POST   /api/tickets
PUT    /api/tickets/:id
POST   /api/tickets/:id/comments
```

## Configuration

### Backend Environment Variables

```env
# Application
NODE_ENV=development
PORT=4000

# Database
DB_HOST=localhost
DB_PORT=3306
DB_USERNAME=root
DB_PASSWORD=your_password
DB_DATABASE=rictms_compliance

# JWT
JWT_SECRET=your-secret-key
JWT_EXPIRATION=30m
JWT_REFRESH_SECRET=your-refresh-secret
JWT_REFRESH_EXPIRATION=7d

# Redis
REDIS_HOST=localhost
REDIS_PORT=6379

# Storage
STORAGE_TYPE=local
STORAGE_PATH=./storage
```

### Frontend Environment Variables

```env
# API
VITE_API_URL=http://localhost:4000/api

# Application
NEXT_PUBLIC_APP_NAME=RICTMS Compliance Hub
```

## Development

### Running Tests

```bash
# Backend tests
cd backend
npm run test              # Unit tests
npm run test:e2e          # End-to-end tests
npm run test:cov          # Coverage report

# Frontend tests
cd frontend
npm run test              # Jest tests
npm run test:watch        # Watch mode
```

### Building for Production

```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm run start
```

### Code Quality

```bash
# Linting
npm run lint

# Formatting
npm run format
```

## Deployment

### Production Checklist

Before deploying to production:

- [ ] Change all default passwords and secrets
- [ ] Update `JWT_SECRET` and `JWT_REFRESH_SECRET`
- [ ] Configure proper CORS settings
- [ ] Set up SSL/TLS certificates
- [ ] Configure database backups
- [ ] Set up monitoring and logging
- [ ] Review file upload limits
- [ ] Configure proper storage (S3 recommended)
- [ ] Set up Redis persistence
- [ ] Review security headers
- [ ] Configure rate limiting
- [ ] Set up proper error tracking

### Deployment Options

1. **Traditional Server**: Deploy on VPS or dedicated server
2. **Docker**: Use docker-compose for containerized deployment
3. **Cloud Platforms**: AWS, Azure, Google Cloud
4. **Platform-as-a-Service**: Heroku, Railway, Render

See [INSTALLATION.md](INSTALLATION.md) for detailed deployment instructions.

## Documentation

- **[CAPABILITIES.md](CAPABILITIES.md)**: Complete feature list and system capabilities
- **[INSTALLATION.md](INSTALLATION.md)**: Detailed setup and installation guide
- **[WALKTHROUGH.md](WALKTHROUGH.md)**: Step-by-step user guide for all features
- **[CHANGELOG.md](CHANGELOG.md)**: Version history and updates

## Contributing

Contributions are welcome! Please follow these guidelines:

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Coding Standards

- Use TypeScript for all new code
- Follow existing code style and conventions
- Write unit tests for new features
- Update documentation as needed
- Keep commits atomic and well-described

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [NestJS](https://nestjs.com/) and [Vite + React](https://vitejs.dev/)
- UI components from [Material-UI](https://mui.com/)
- Inspired by government compliance needs and best practices

## Support

For issues, questions, or suggestions:

- **Issues**: [GitHub Issues](https://github.com/your-org/rictms-compliance-hub/issues)
- **Email**: support@rictms.gov.ph
- **Documentation**: See docs folder for detailed guides

## Compliance Standards

This system helps organizations comply with:

- ✅ Republic Act 11032 (Ease of Doing Business Act)
- ✅ Republic Act 10173 (Data Privacy Act)
- ✅ Executive Order 2 (Freedom of Information)
- ✅ ARTA Guidelines (Anti-Red Tape Authority)
- ✅ CSC Circulars (Civil Service Commission)
- ✅ COA Guidelines (Commission on Audit)

---

**Built with ❤️ for Philippine Government Agencies**

---

## Roadmap

Future enhancements planned:

- [ ] Multi-language support (Tagalog/Filipino)
- [ ] Mobile application (iOS/Android)
- [ ] Advanced NLP for document analysis
- [ ] Email notifications
- [ ] Calendar integration
- [ ] E-signature integration
- [ ] Blockchain verification
- [ ] Advanced workflow automation
- [ ] Real-time collaboration
- [ ] AI-powered insights

---

For more information, visit the [project website](https://rictms.gov.ph) or contact the development team.
