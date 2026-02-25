# RICTMS Compliance Hub - Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.2] - 2026-02-25 — Document Viewer, Metrics Seed, Dynamic Roles, Settings Cards

### Fixed
- **Document Download "blob" issue**: Added `exposedHeaders: ['Content-Disposition', 'Content-Type', 'Content-Length']` to CORS configuration — browser can now read the `Content-Disposition` header to extract the proper filename and extension when downloading documents.
- **Document Preview "not available" (DOCX on Windows)**: Replaced LibreOffice (`soffice`) dependency in the preview processor with a `mammoth` HTML fallback. DOCX files are now converted to styled HTML when LibreOffice is unavailable, and saved as `preview_blob` with `preview_mime_type: 'text/html'`.
- **Seeded documents showing no preview**: Replaced the 15-byte fake PDF stub in seed data with full styled HTML preview content. Both seeded documents now render immediately in the Document Viewer without requiring re-processing.
- **Reviews "Unable to load digital preview"**: Fixed by propagating `mimeType` through `getPreviewBlobUrl()` return value and passing it to `DocumentViewer` as a prop. The viewer now branches correctly: iframe for HTML, react-pdf for PDF.
- **`getPreview()` priority bug**: Preview blob is now returned first (before falling back to raw PDF), so HTML previews generated for PDF source documents display correctly.
- **`preview_path` TypeScript type**: Changed from `string` to `string | null` in entity to match the nullable DB column.

### Added
- **`preview_mime_type` column** on `document_versions` table: tracks the MIME type of the preview blob (`application/pdf` or `text/html`). Added via `ALTER TABLE` and entity sync.
- **`GET /api/users/roles` endpoint**: Returns all 5 system role definitions with `value`, `label`, `description`, `assignable`, and `is_system` flags. Placed before the `/:id` wildcard route to avoid routing conflict.
- **Role Management card in Settings**: Super admin can now view all system roles in a table with descriptions and assignability status. Opens a detail dialog per role.
- **Dynamic role dropdown in Focal User Management**: Replaced hardcoded `focalRoleOptions` array with live `GET /users/roles` call. Role dropdown shows only assignable roles.
- **Activate/Deactivate user buttons**: Existing users table now includes an activate/deactivate toggle per user.
- **Change Role dialog**: Edit (pencil) icon opens a dialog to change an existing user's role, with purpose description shown per option.
- **4 metric template types in seed**: Added `property_check` (incident count) and `date_check` (monthly submission deadline) templates alongside existing `section_check` and `keyword_check`. 6 metric results seeded.
- **Settings page card-based layout**: Refactored from single `Paper` container to individual `Card` components — Account Information, Theme Preference, Change Password, Role Definitions, Focal User Management.
- **"Document Viewer" label**: Renamed "Document Preview" to "Document Viewer" in the document detail page.
- **DocumentViewer HTML iframe support**: New branch in `DocumentViewer.tsx` renders HTML previews in a sandboxed `<iframe>` with an "Open in Tab" button. PDF branch unchanged (react-pdf).
- **User Manual expanded field explanations**: All 7 modules now have comprehensive per-field input and output descriptions. New "Settings and Role Management" module added. Close button added to detail dialog.

### Changed
- `getPreviewBlobUrl()` in `frontend/src/lib/api/documents.ts` now returns `{ blobUrl: string; mimeType: string }` instead of `string`.
- `DocumentViewer` props: added `mimeType?: string` (defaults to `'application/pdf'`).
- `usersApi` in `frontend/src/lib/api/users.ts`: added `RoleDefinition` interface, `getRoles()`, `updateRole()`, `deactivate()`, `activate()` methods.
- Seed data column aligned to actual MariaDB schema (`active` not `is_active` for users, int unit IDs, correct metric_results columns).

---

## [Unreleased] - Current Development Build

### Changed - 2026-02-25 (`v1.1.1-dev` UX + Governance Alignment)

- Fixed protected document download flow by switching to authenticated blob download requests from the document details page.
- Updated Documents list UX:
  - removed Version column,
  - added title filter,
  - added total-record indicator,
  - updated page label format to `Page X-X of Y`.
- Extended `documents` table/model with `file_blob` persistence for source binaries and synchronized latest upload bytes on version updates.
- Removed placeholder preview generation behavior for non-PDF uploads; preview now depends on actual conversion outputs.
- Updated issuances UX:
  - authority is now free-text/editable with dynamic chip filtering,
  - title opens source URL in new tab when available.
- Enforced category→issue-type dependency across ticket create/detail workflows and metadata configuration.
- Added Settings features:
  - authenticated change-password endpoint/UI,
  - light/dark theme preference toggle.
- Added super-admin focal account management in Settings with extended fields:
  - first/middle/last/suffix,
  - staff ID,
  - role,
  - position,
  - designation.
- Expanded user profile schema and DTOs to include focal profile fields.
- Updated Metrics defaults to provide four sample examples per metric type.
- Updated User Manual copy:
  - removed explicit “Your role” badge,
  - expanded field-level CRUD guidance, especially for all four metric types.

### Changed - 2026-02-24 (`v1.1.0-dev` Blob Persistence + Conversion Stabilization)

- Added `document_versions.file_blob` and `document_versions.preview_blob` to support database-native binary storage.
- Updated upload/version creation to persist original files to both storage path and `file_blob`.
- Updated document processing and preview generation jobs to read blob-first with filesystem fallback for existing path-only rows.
- Updated preview handling to persist generated PDF preview bytes to `preview_blob`.
- Updated processing state transition to `ready` after extraction queue flow to avoid indefinite upload/process spinner states.
- Cleaned and realigned SQL seed scripts to a minimal executable baseline with blob-backed document version records.

### Summary

Complete implementation of the RICTMS Compliance Hub system with all core features operational. The system includes document management, automated compliance checking, regulatory reference tracking, collaborative reviews, and issue management.

### Fixed - 2026-02-24 (Post-release stabilization)

- Fixed upload queue Redis retry incompatibility by setting Bull Redis client `maxRetriesPerRequest` to `null`.
- Fixed missing extraction persistence by storing extracted text in both `documents.extracted_text` and `document_versions.extracted_text`.
- Fixed automated metric-failure escalation by creating/updating internal review records with `needs_revision` and captured failed-check remarks.

### Added - 2026-02-24 (Assignment-governed submissions)

- Added focal submission assignment model (`document_assignments`) with user/unit/document-type scope.
- Added one-submission-per-cycle enforcement for focal uploads (per user + unit + type + period + year).
- Added filename policy enforcement using assignment prefixes and frequency-aware suffix validation (monthly/quarterly/annual/custom).
- Added upload option endpoints for focal users and assignment CRUD endpoints for super admins.

### Changed - 2026-02-24 (Metrics and UX alignment)

- Number Extraction now supports multiple keywords and expected numbers from comma/newline inputs.
- Date/Deadline custom period handling now supports regex + capture-group + fallback month configuration.
- Metrics template document type input now uses pre-defined options from backend.
- Ticket-facing labels in dashboard UI are aligned to issue terminology.
- Issuance module now includes a document mapping manager dialog for linking/unlinking `document_issuances` entries.
- Issuance CRUD and mapping actions are now explicitly visible to compliance/super-admin roles with read-only fallback messaging for other roles.
- Fixed issuance `is_active` filter parsing to avoid unintended false filtering when query parameter is omitted.

### Added - 2026-02-24 (Workflow + Mapping Expansion)

- Added document-to-document mapping endpoints and UI manager (`/documents/:id/references`) for cross-document references.
- Added role-based in-app User Manual module under dashboard navigation.
- Added explicit `POST /documents/:id/return` endpoint for non-destructive return-to-focal workflow with mandatory remarks.
- Added dynamic ticket issue metadata management endpoints for super admins:
  - `GET/POST/PUT/DELETE /tickets/issue-types`
  - `GET/POST/PUT/DELETE /tickets/categories`

### Changed - 2026-02-24 (Compliance Status Workflow)

- Document processing now returns extracted documents to `pending` state for manual compliance decisioning.
- Manual review decisions now drive readiness state:
  - `compliant` sets document status to `ready`
  - `non_compliant` / `needs_revision` sets document status to `pending`
- Linking policies now allow only `ready` documents for issuance and document-reference mapping.
- Corrected workflow semantics: reviewer/super-admin document action is now **Return** (audit-preserving), not deletion.
- Returned/non-compliant documents are hidden from super-admin/compliance list views and remain visible to focal users for revision/update.

### Fixed - 2026-02-23

- Fixed frontend compile error in `AppBar.tsx` caused by malformed MUI `sx` object.
- Rebuilt corrupted `Sidebar.tsx` component and restored collapsible behavior.
- Restored successful frontend production build output for all dashboard routes.
- Fixed metrics retrieval endpoint so `/api/documents/:id/metrics` resolves the current document version correctly.
- Fixed reviewer/reporter identity mapping in review and ticket controllers (JWT payload `id` mapping), eliminating ticket create 500 errors.
- Fixed protected PDF preview loading by switching viewers to authenticated blob-fetch flow.

### Added - 2026-02-23

- New cybersecurity incident posture endpoint: `GET /api/incidents/period-stats`.
- Added period aggregation for `daily`, `weekly`, `monthly`, `quarterly`, and `yearly` windows.
- Added frontend incident posture cards in `/dashboard/incidents` using new API.
- Linked dashboard incident card to the incident infographic page with period overviews.

### Changed - 2026-02-23 (UI + Feature Completion Pass)

- Replaced placeholder pages with working features:
  - `Units` page now supports create, update, list, and soft-delete.
  - `Metrics` page now supports template list/create/update/delete with applicability.
  - `Reviews` page now supports review queue visibility and review submission.
- Updated dashboard layout behavior to prevent sidebar/content overlap.
- Updated login page field behavior to avoid label/value overlap artifacts.
- Improved dashboard loading responsiveness by parallelizing API requests.
- Reworked Metrics Template Builder to typed rule forms (Section, Keyword, Number Extraction, Date/Deadline) instead of raw JSON-only inputs.
- Added deadline configuration fields (`deadline_day`, `deadline_month_offset`, `max_days_late`) scoped by unit + document type via metric applicability.
- Added submission frequency support for date checks (`monthly`, `quarterly`, `annual`, `custom`) with annual submission-month control.
- Added inline digital document viewer to manual reviews with in-viewer compliance tagging controls.
- Extended tickets workflow with issue documentation fields: `issue_type`, `resolution_steps`, and `resolution_date`.
- Added end-user QA tutorial: `QA-USER-MANUAL.md` and walkthrough enhancements for Metrics/QA flows.

### Changed - 2026-02-23 (Frontend Framework Migration)

- Migrated frontend framework from **Next.js** to **Vite + React Router**.
- Added routing bootstrap in `src/App.tsx` and `src/main.tsx`.
- Added compatibility shim for existing `next/navigation` imports to accelerate migration.
- Updated frontend env handling to `VITE_API_URL` (with temporary compatibility fallback).
- Replaced frontend scripts with Vite equivalents (`dev`, `build`, `preview`).

### Verified - 2026-02-23

- Backend build: `npm run build` ✅
- Frontend build: `npm run build` ✅
- API smoke tests passed:
  - Incidents period stats
  - Units CRUD
  - Metrics CRUD
  - Reviews submit + latest review read

### Added - 2026-02-24 (Hardening + CI Baseline)

- Added API rate limiting for backend `/api` routes using `express-rate-limit`.
- Added environment validation hardening via Joi schema (startup-time config checks).
- Added structured audit logs for privileged mutations in metrics, tickets, and reviews flows.
- Added GitHub Actions CI workflow:
  - backend build
  - frontend build
  - backend test hook
  - dependency security audit (`npm audit --audit-level=high`)
- Added initial backend automated tests for metrics engines:
  - section check
  - keyword check
  - number extraction/property check
  - date check

### Added - Backend

#### Authentication & User Management
- JWT-based authentication with access and refresh tokens
- Password hashing using BCrypt
- Role-based access control (Admin, Reviewer, Viewer)
- User CRUD operations with role management
- Session management with automatic token refresh
- Secure logout with token invalidation

#### Document Management Module
- Document upload with metadata capture
- Support for PDF and DOCX file formats
- Automatic file storage (local filesystem)
- Document versioning system
- Version history tracking
- Checksum verification for file integrity
- Document search and filtering by unit, type, period, year, status
- Document metadata update functionality
- Document deletion (soft delete)

#### Organizational Units Module
- Unit CRUD operations (Create, Read, Update, Delete)
- Hierarchical unit structure support
- Unit-based document organization
- Active/inactive unit management

#### Metrics & Compliance Module
- Metric template management
- Multiple metric categories:
  - Completeness scoring
  - Consistency checking
  - Compliance verification
  - Timeliness monitoring
  - Format validation
- Weighted scoring system
- Metric applicability rules (link metrics to issuances)
- Automatic metric calculation on document upload
- Historical metric tracking
- Metric result storage with detailed JSON results

#### Manual Review Module
- Review assignment system
- Multi-status workflow (draft, in_review, approved, changes_requested, rejected)
- 5-star rating system
- Comment and feedback capture
- Review history and audit trail
- Version comparison functionality
- Automated diff analysis between versions
- Similarity scoring

#### References (Issuances) Module
- Regulatory issuance database
- Support for multiple issuance types (laws, executive orders, memoranda)
- Issuing authority tracking
- Issue and effectivity date management
- Source URL linking
- Active/inactive status management
- Document-to-issuance many-to-many linking
- Search and filter by authority, status

#### Tickets & Issue Management Module
- Multi-category ticket system (compliance, content, format, technical, other)
- Priority levels (low, medium, high, urgent)
- Status workflow (open, in_progress, resolved, closed)
- Unit and document linking
- User assignment
- Threaded comment system
- Ticket statistics and reporting
- Resolution date tracking

#### Infrastructure
- Background job processing with Bull Queue and Redis
- Asynchronous document text extraction
- TypeORM database integration with MariaDB
- Swagger/OpenAPI documentation
- CORS configuration
- Environment-based configuration
- Error handling and logging
- Request validation using class-validator
- Database migration system
- Comprehensive database schema with proper relationships and indexes

### Added - Frontend

#### Authentication & Layout
- Login page with credential validation
- Persistent authentication using localStorage
- AuthContext for global auth state management
- Token refresh on API calls (axios interceptor)
- Automatic logout on token expiration
- Protected routes with authentication guards
- Dashboard layout with sidebar navigation
- Responsive Material-UI design

#### Dashboard Page
- Real-time statistics cards:
  - Total documents count
  - Compliant documents count
  - Pending documents count
  - Open tickets count
- Compliance rate calculation and display
- Recent documents table (latest 5)
- Quick action buttons
- Unit-specific data filtering (future enhancement)

#### Documents Management Pages
- Document listing page with data table
- Filter controls (unit, type, status, search)
- Pagination support
- Document upload page with form validation
- Document detail page showing:
  - Metadata display
  - Version history
  - Compliance metrics
  - Manual review status
  - Preview support (planned)
- Version comparison view
- Download functionality

#### Issuances Management Page
- Issuances listing with sortable table
- Filter by authority and active status
- Search by issuance number or title
- Create issuance dialog form
- Edit issuance functionality
- Delete/deactivate issuances
- Document linking interface

#### Tickets Management Pages
- Tickets listing page with filters
- Filter by status, priority, category, unit
- Create ticket dialog with validation
- Ticket detail page with:
  - Full ticket information
  - Comment thread display
  - Status update controls
  - Document link display
- Add comment functionality
- Ticket statistics dashboard

#### API Integration
- Centralized axios client with interceptor
- Automatic token injection in headers
- API client functions for:
  - Authentication (login, refresh, logout)
  - Documents (CRUD, versions, upload)
  - Issuances (CRUD, document linking)
  - Tickets (CRUD, comments, statistics)
- Error handling and user notifications
- Loading states for async operations

### Added - Database

#### Database Schema
- Complete schema for 11 tables:
  - `users`: User accounts and authentication
  - `units`: Organizational hierarchy
  - `documents`: Document metadata
  - `document_versions`: Version tracking
  - `metric_templates`: Reusable metrics
  - `metric_applicability`: Metric-issuance rules
  - `metric_results`: Calculated scores
  - `manual_reviews`: Human reviews
  - `version_comparisons`: Diff analysis
  - `issuances`: Regulatory references
  - `document_issuances`: Document-regulation links
  - `tickets`: Issue tracking
  - `ticket_comments`: Discussion threads

#### Database Scripts
- `init.sql`: Database creation with proper charset
- `schema.sql`: Complete table creation with:
  - Foreign key constraints
  - Indexes for performance
  - Proper data types
  - Default values
  - Timestamp tracking
- `seed.sql`: Sample data for testing:
  - 3 test users (admin, reviewer, viewer)
  - 5 organizational units
  - 5 regulatory issuances
  - 5 sample documents with versions
  - 5 metric templates
  - Sample metric results
  - Sample reviews and tickets
  - Linking data

### Added - Documentation

#### User Documentation
- **CAPABILITIES.md**: Complete feature list
  - System overview
  - Module-by-module capabilities
  - Technical specifications
  - Performance characteristics
  - Security features
  - Limitations and future roadmap

- **INSTALLATION.md**: Setup instructions
  - Prerequisites and system requirements
  - Manual installation guide
  - Docker installation guide
  - Configuration details
  - Database setup instructions
  - Troubleshooting section
  - Update and uninstallation procedures

- **README.md**: Project overview
  - Quick start guide
  - Architecture overview
  - Technology stack description
  - Project structure
  - API documentation reference
  - Development and deployment guides
  - Contribution guidelines

- **WALKTHROUGH.md**: User guide
  - Getting started tutorial
  - Step-by-step workflows
  - Feature walkthroughs
  - Role-specific guides
  - Tips and best practices
  - Troubleshooting common issues
  - Glossary of terms

- **CHANGELOG.md**: This file
  - Comprehensive change history
  - Feature additions
  - Bug fixes
  - Breaking changes

### Added - DevOps & Configuration

#### Docker Support
- Docker Compose configuration with:
  - MariaDB 11 service
  - Redis 7 service
  - Backend (NestJS) service
  - Frontend (Vite + React) service
- Volume management for data persistence
- Network configuration
- Health checks for services
- Development and production Dockerfiles

#### Environment Configuration
- Backend `.env` with:
  - Application settings
  - Database credentials
  - JWT secrets
  - Redis configuration
  - Storage settings
  - CORS configuration
  - File upload limits
- Frontend `.env.local` with:
  - API URL configuration
  - Application settings

### Fixed

- TypeScript compilation errors in API client pattern
- Token access pattern (changed from explicit token parameter to automatic injection via interceptor)
- Import path issues in frontend components
- Dashboard data fetching using correct API methods
- Removed undefined state variables causing build failures

### Changed

- Updated API clients to use consistent pattern with automatic token injection
- Refactored `references.ts` API to use `apiClient` instead of direct axios calls
- Updated all frontend components to remove explicit token passing
- Improved error handling in API calls
- Enhanced dashboard with real data fetching instead of mock data

### Technical Details

#### Backend Technology Stack
- **Framework**: NestJS 10.x
- **Runtime**: Node.js 18+
- **Language**: TypeScript 5.x
- **Database**: MariaDB 11.x with TypeORM
- **Queue**: Bull Queue with Redis 7.x
- **Authentication**: JWT (jsonwebtoken)
- **Password**: BCrypt
- **Validation**: class-validator, class-transformer
- **Documentation**: @nestjs/swagger
- **Testing**: Jest

#### Frontend Technology Stack
- **Framework**: Vite 5.x + React Router 6 (React 18)
- **UI Library**: Material-UI (MUI) 5.x
- **State Management**: React Context API
- **HTTP Client**: Axios
- **Language**: TypeScript 5.x
- **Styling**: Emotion (CSS-in-JS)
- **Icons**: Material Icons
- **Testing**: Jest, React Testing Library

#### Database
- **Engine**: MariaDB 11.x / MySQL 8.x compatible
- **Charset**: UTF8MB4 with unicode collation
- **Indexes**: Composite indexes on frequently queried columns
- **Relationships**: Properly defined foreign keys with cascade rules
- **Data Types**: Optimized for storage and performance

### Security

- Password hashing using BCrypt with cost factor 10
- JWT tokens with 30-minute expiration
- Refresh tokens with 7-day expiration
- Role-based access control at API level
- CORS configuration for frontend-backend communication
- SQL injection prevention through TypeORM parameterized queries
- XSS protection through React's automatic escaping
- CSRF protection consideration (to be enhanced in production)

### Performance Optimizations

- Database indexes on:
  - Foreign keys
  - Search columns (unit_id, document_type, status)
  - Date columns for sorting
- Lazy loading of document versions
- Pagination in list endpoints
- Background processing for document analysis
- Redis caching for queue management
- Optimized SQL queries with proper joins

### Known Issues

- Database services (MariaDB, Redis) need to be running before starting backend
- Docker/MySQL CLI not found in PATH (workaround: use Docker Desktop or add to PATH)
- Swagger API documentation route needs to be configured in main.ts
- Email notifications not yet implemented
- Document preview requires additional PDF.js integration
- Export/report generation features planned for future releases

### Development Notes

- All backend modules successfully compile
- Frontend successfully builds for production
- Database schema tested with seed data
- All Sprint 1-5 features implemented
- Sprint 6 features partially implemented (dashboard analytics)
- Testing pending (requires database setup)

### Migration Notes

For users migrating from previous versions:
- None (initial release)

### Breaking Changes

- None (initial release)

---

## Project Development History

### Sprint 1 - Foundation (Completed)
- ✅ Authentication & User Management
- ✅ Database schema design
- ✅ Project structure setup

### Sprint 2 - Core Modules (Completed)
- ✅ Units Module
- ✅ Documents Module with Versioning
- ✅ File upload and storage

### Sprint 3 - Compliance Engine (Completed)
- ✅ Metrics Module
- ✅ Automated scoring
- ✅ Background processing

### Sprint 4 - Reviews & Comparison (Completed)
- ✅ Manual Review Module
- ✅ Version comparison
- ✅ Review workflows

### Sprint 5 - References & Tickets (Completed)
- ✅ Issuances Module
- ✅ Tickets Module
- ✅ Frontend pages for both modules

### Sprint 6 - Dashboard & Reporting (In Progress)
- ✅ Enhanced dashboard with real statistics
- ⏳ Advanced reporting features (planned)
- ⏳ Export functionality (planned)
- ⏳ Charts and visualizations (planned)

### Sprint 7 - Testing & Documentation (In Progress)
- ✅ Comprehensive documentation (5 files)
- ✅ Database setup scripts
- ✅ Seed data script
- ⏳ End-to-end testing (pending)
- ⏳ Bug fixes (pending)
- ⏳ Performance testing (pending)

---

## Future Roadmap

### Short Term (Next Release)
- [ ] Complete Sprint 6 reporting features
- [ ] End-to-end testing
- [ ] Bug fixes and stability improvements
- [ ] Performance optimization
- [ ] Enhanced error messages
- [ ] API rate limiting

### Medium Term
- [ ] Email notification system
- [ ] Document preview in browser
- [ ] Bulk document operations
- [ ] Advanced search functionality
- [ ] User activity logs
- [ ] Two-factor authentication

### Long Term
- [ ] Multi-language support (Tagalog/Filipino)
- [ ] Mobile application (iOS/Android)
- [ ] Advanced NLP for document analysis
- [ ] Machine learning-based compliance predictions
- [ ] Integration with e-signature platforms
- [ ] Blockchain verification
- [ ] Real-time collaboration features
- [ ] Workflow automation engine

---

## Contributors

- Development Team: RICTMS Compliance Hub Development
- Architecture Design: Following BMAD methodology
- Documentation: Comprehensive user and technical docs

---

## Support & Contact

For issues, questions, or feature requests:
- Create an issue in the repository
- Email: support@rictms.gov.ph
- Documentation: See README.md and other docs

---

**Note**: Version numbering will be added once the initial release is finalized and deployed.

---

*This changelog will be updated with each release. Check back regularly for updates.*
