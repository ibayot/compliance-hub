# Task Breakdown (TASKS)
## RICMS Compliance Hub

**Version:** 1.0  
**Date:** February 23, 2026  
**Status:** Sprint Planning

---

## Sprint Organization

**Total Estimated Duration:** 6-8 weeks (Phase 1 MVP)

**Sprint Structure:**
- Sprint 0: Project Setup (Week 1)
- Sprint 1: Authentication & Core Entities (Week 1-2)
- Sprint 2: Document Management (Week 2-3)
- Sprint 3: Compliance Engine (Week 3-4)
- Sprint 4: Reviews & Comparison (Week 4-5)
- Sprint 5: References & Tickets (Week 5-6)
- Sprint 6: Dashboard & Polish (Week 6-7)
- Sprint 7: Testing & Deployment (Week 7-8)

---

## Sprint 0: Project Setup & Infrastructure

**Goal:** Establish development environment and project scaffolding

### Backend Tasks

- [ ] **TASK-001**: Initialize NestJS project
  - `nest new ricms-backend`
  - Configure TypeScript strict mode
  - Set up ESLint + Prettier
  - **Estimate:** 2 hours

- [ ] **TASK-002**: Set up PostgreSQL database
  - Docker Compose configuration
  - Database initialization script
  - Connection configuration
  - **Estimate:** 2 hours

- [ ] **TASK-003**: Configure TypeORM
  - Install TypeORM + PostgreSQL driver
  - Database module configuration
  - Migration setup
  - **Estimate:** 3 hours

- [ ] **TASK-004**: Set up project structure
  - Create module folders (auth, users, units, etc.)
  - Common utilities (guards, decorators, filters)
  - Configuration management (env files)
  - **Estimate:** 3 hours

- [ ] **TASK-005**: Configure Bull queue (Redis)
  - Redis Docker service
  - Bull module setup
  - Job processor base structure
  - **Estimate:** 2 hours

### Frontend Tasks

- [ ] **TASK-006**: Initialize Next.js 14 project
  - `npx create-next-app@latest`
  - Configure App Router
  - Install Material-UI (MUI)
  - **Estimate:** 2 hours

- [ ] **TASK-007**: Set up project structure
  - Create folder structure (see architecture doc)
  - Configure path aliases
  - Set up global styles
  - **Estimate:** 2 hours

- [ ] **TASK-008**: Configure React Query
  - Install @tanstack/react-query
  - Set up QueryClient provider
  - Create API client utilities
  - **Estimate:** 2 hours

### DevOps Tasks

- [ ] **TASK-009**: Create Docker Compose for local development
  - Backend, frontend, PostgreSQL, Redis services
  - Volume mounts for hot reload
  - Environment variable configuration
  - **Estimate:** 3 hours

- [ ] **TASK-010**: Set up Git repository and branching strategy
  - Initialize repo
  - Branch protection rules
  - README with setup instructions
  - **Estimate:** 1 hour

**Sprint 0 Total Estimate:** 22 hours (~3 days)

---

## Sprint 1: Authentication & Core Entities

**Goal:** Implement user authentication and basic organizational structure

### Backend Tasks

#### Authentication Module

- [ ] **TASK-101**: Create User entity and repository
  - Define User schema (see architecture)
  - TypeORM entity with relations
  - Create migration
  - **Estimate:** 3 hours

- [ ] **TASK-102**: Implement AuthService
  - User registration (admin only)
  - Password hashing (bcrypt)
  - Login with JWT generation
  - Refresh token logic
  - **Estimate:** 5 hours

- [ ] **TASK-103**: Create JWT strategy and guards
  - JWT strategy (passport-jwt)
  - JwtAuthGuard
  - RolesGuard
  - @Roles decorator
  - @CurrentUser decorator
  - **Estimate:** 4 hours

- [ ] **TASK-104**: Build Auth controller
  - POST /auth/login
  - POST /auth/refresh
  - GET /auth/me
  - POST /auth/logout
  - **Estimate:** 3 hours

#### Users Module

- [ ] **TASK-105**: Create Users CRUD service
  - Create, update, list, get, deactivate users
  - Role validation
  - **Estimate:** 3 hours

- [ ] **TASK-106**: Build Users controller
  - GET /users
  - POST /users
  - GET /users/:id
  - PATCH /users/:id
  - DELETE /users/:id (soft delete)
  - **Estimate:** 2 hours

#### Units Module

- [ ] **TASK-107**: Create Unit entity and CRUD
  - Entity + repository
  - Service with CRUD operations
  - Controller endpoints
  - **Estimate:** 4 hours

#### Document Types Module

- [ ] **TASK-108**: Create DocumentType entity and CRUD
  - Entity + repository
  - Service with CRUD operations
  - Controller endpoints
  - **Estimate:** 4 hours

#### UserUnitAccess (Junction)

- [ ] **TASK-109**: Create UserUnitAccess entity
  - Many-to-many relation with permissions
  - CRUD operations
  - UnitAccessGuard implementation
  - **Estimate:** 4 hours

### Frontend Tasks

#### Authentication Pages

- [ ] **TASK-110**: Create login page
  - Login form with validation
  - API integration (POST /auth/login)
  - Store JWT in cookie/localStorage
  - Redirect on success
  - **Estimate:** 4 hours

- [ ] **TASK-111**: Implement AuthContext
  - Store current user state
  - Token refresh logic
  - Logout function
  - **Estimate:** 3 hours

- [ ] **TASK-112**: Create protected route middleware
  - Next.js middleware for auth check
  - Redirect to login if unauthenticated
  - Role-based route restrictions
  - **Estimate:** 3 hours

#### Layout & Navigation

- [ ] **TASK-113**: Build main dashboard layout
  - Top navigation bar
  - Sidebar with role-based menu items
  - Breadcrumbs
  - User profile dropdown
  - **Estimate:** 5 hours

#### Admin Pages - Users

- [ ] **TASK-114**: Create user management page
  - User list table with search/filter
  - Add user modal
  - Edit user modal
  - Deactivate user action
  - **Estimate:** 6 hours

#### Admin Pages - Units & Document Types

- [ ] **TASK-115**: Create unit management page
  - Unit list + CRUD UI
  - **Estimate:** 4 hours

- [ ] **TASK-116**: Create document type management page
  - Document type list + CRUD UI
  - **Estimate:** 4 hours

**Sprint 1 Total Estimate:** 61 hours (~8 days)

---

## Sprint 2: Document Management

**Goal:** Enable document upload, storage, versioning, and preview

### Backend Tasks

#### Document & DocumentVersion Entities

- [ ] **TASK-201**: Create Document entity
  - Schema definition
  - Relations to Unit, DocumentType, User
  - TypeORM entity + migration
  - **Estimate:** 3 hours

- [ ] **TASK-202**: Create DocumentVersion entity
  - Schema with file metadata
  - Relations to Document
  - Checksum field
  - **Estimate:** 3 hours

#### File Storage Service

- [ ] **TASK-203**: Implement StorageService
  - Abstract interface for file operations
  - Local filesystem implementation
  - File upload/download methods
  - Checksum validation (SHA-256)
  - **Estimate:** 4 hours

- [ ] **TASK-204**: Configure S3-compatible storage (optional)
  - AWS S3 SDK integration
  - Environment-based storage selection
  - **Estimate:** 3 hours (if needed)

#### Document Service

- [ ] **TASK-205**: Implement DocumentService
  - uploadDocument(file, metadata)
  - getDocumentById(id)
  - listDocuments(filters, pagination)
  - getVersionHistory(documentId)
  - **Estimate:** 5 hours

- [ ] **TASK-206**: Implement VersionService
  - createVersion(documentId, file)
  - getVersionDetails(versionId)
  - downloadVersion(versionId)
  - **Estimate:** 3 hours

#### Document Processing Jobs

- [ ] **TASK-207**: Create DocumentProcessorJob
  - Bull job for async processing
  - Text extraction (Mammoth.js)
  - Store extracted text in DB
  - **Estimate:** 4 hours

- [ ] **TASK-208**: Create PreviewGeneratorJob
  - Install LibreOffice headless
  - Convert DOCX → PDF
  - Store PDF in storage
  - **Estimate:** 5 hours

- [ ] **TASK-209**: Create job queue management
  - Job retry logic
  - Error handling and logging
  - Status tracking
  - **Estimate:** 3 hours

#### Document Controller

- [ ] **TASK-210**: Build Document upload endpoint
  - POST /documents (multipart/form-data)
  - Validation (file type, size)
  - Trigger processing jobs
  - **Estimate:** 4 hours

- [ ] **TASK-211**: Build Document query endpoints
  - GET /documents (with filters)
  - GET /documents/:id
  - GET /documents/:id/versions/:vid
  - **Estimate:** 3 hours

- [ ] **TASK-212**: Build Document download/preview endpoints
  - GET /documents/:id/versions/:vid/download
  - GET /documents/:id/versions/:vid/preview
  - Stream files with proper headers
  - **Estimate:** 3 hours

### Frontend Tasks

#### Document Upload

- [ ] **TASK-213**: Create DocumentUpload component
  - File picker (DOCX only)
  - Unit + Document Type + Period selectors
  - Upload progress indicator
  - API integration (POST /documents)
  - **Estimate:** 5 hours

- [ ] **TASK-214**: Create document upload page
  - Form layout
  - Validation
  - Success/error feedback
  - **Estimate:** 3 hours

#### Document List & Details

- [ ] **TASK-215**: Create DocumentList component
  - Data table with sorting/filtering
  - Columns: Unit, Type, Period, Status, Uploader, Date
  - Pagination
  - **Estimate:** 5 hours

- [ ] **TASK-216**: Create document list page
  - Integrate DocumentList component
  - Filter panel (Unit, Type, Period, Status)
  - Role-based data filtering
  - **Estimate:** 4 hours

- [ ] **TASK-217**: Create DocumentDetails page
  - Document metadata display
  - Version timeline component
  - Download/preview buttons
  - **Estimate:** 4 hours

#### Document Viewer

- [ ] **TASK-218**: Create DocumentViewer component
  - Integrate react-pdf (PDF.js)
  - PDF navigation controls (page up/down, zoom)
  - Loading state
  - Error state (fallback to text view)
  - **Estimate:** 6 hours

- [ ] **TASK-219**: Create VersionTimeline component
  - List versions chronologically
  - Show version number, date, uploader
  - Select version to view/download
  - **Estimate:** 4 hours

**Sprint 2 Total Estimate:** 73 hours (~9 days)

---

## Sprint 3: Compliance Engine

**Goal:** Implement automated metrics checking

### Backend Tasks

#### Metric Template Entity

- [ ] **TASK-301**: Create MetricTemplate entity
  - Schema with rule_config + pass_criteria (JSONB)
  - TypeORM entity + migration
  - **Estimate:** 3 hours

- [ ] **TASK-302**: Create MetricApplicability entity
  - Junction table for Unit/DocumentType mapping
  - **Estimate:** 2 hours

- [ ] **TASK-303**: Create MetricResult entity
  - Schema with evidence (JSONB)
  - **Estimate:** 2 hours

#### Metric Engines

- [ ] **TASK-304**: Create SectionCheckEngine
  - Parse extracted text for headings
  - Check required sections presence
  - Generate evidence output
  - **Estimate:** 5 hours

- [ ] **TASK-305**: Create KeywordCheckEngine
  - Regex/keyword matching
  - Count matches
  - Generate evidence with snippets
  - **Estimate:** 4 hours

- [ ] **TASK-306**: Create PropertyCheckEngine
  - Validate document metadata fields
  - Check filename conventions
  - **Estimate:** 3 hours

- [ ] **TASK-307**: Create DateCheckEngine
  - Validate submission timeliness
  - Check reporting period alignment
  - **Estimate:** 3 hours

#### Metrics Service

- [ ] **TASK-308**: Implement MetricsService
  - getApplicableMetrics(unitId, docTypeId)
  - computeMetrics(versionId): orchestrate engines
  - saveMetricResults(versionId, results)
  - getMetricResults(versionId)
  - calculateAggregateScore(results)
  - **Estimate:** 6 hours

#### Metrics Processor Job

- [ ] **TASK-309**: Create MetricsProcessorJob
  - Bull job triggered after text extraction
  - Call MetricsService.computeMetrics
  - Handle errors and retries
  - **Estimate:** 3 hours

#### Metrics Controller

- [ ] **TASK-310**: Build Metric Templates CRUD endpoints
  - GET /metrics
  - POST /metrics
  - GET /metrics/:id
  - PATCH /metrics/:id
  - DELETE /metrics/:id
  - **Estimate:** 4 hours

- [ ] **TASK-311**: Build Metrics results endpoint
  - GET /documents/:id/metrics
  - **Estimate:** 2 hours

### Frontend Tasks

#### Admin - Metric Builder

- [ ] **TASK-312**: Create MetricTemplateForm component
  - Form to create/edit metric templates
  - Dynamic rule configuration based on metric type
  - JSON schema builder for rule_config
  - **Estimate:** 8 hours

- [ ] **TASK-313**: Create metric template management page
  - List metric templates
  - Add/edit/delete actions
  - Applicability settings (Units + Doc Types)
  - **Estimate:** 6 hours

#### Compliance View

- [ ] **TASK-314**: Create MetricResults component
  - Table showing metric name, status (pass/fail), evidence
  - Expandable evidence details
  - Color-coded status indicators
  - **Estimate:** 5 hours

- [ ] **TASK-315**: Integrate MetricResults into DocumentDetails page
  - Fetch metric results for current version
  - Display alongside document info
  - **Estimate:** 2 hours

**Sprint 3 Total Estimate:** 58 hours (~7 days)

---

## Sprint 4: Manual Review & Version Comparison

**Goal:** Enable reviewers to finalize compliance and compare document versions

### Backend Tasks

#### Manual Review Entity

- [ ] **TASK-401**: Create ManualReview entity
  - Schema with decision, remarks, findings (JSONB)
  - Relations to Document, DocumentVersion, User (reviewer)
  - TypeORM entity + migration
  - **Estimate:** 3 hours

#### Review Service

- [ ] **TASK-402**: Implement ReviewService
  - submitReview(documentId, reviewData)
  - getReview(documentId)
  - getReviewHistory(documentId)
  - updateDocumentStatus(documentId, status)
  - **Estimate:** 5 hours

- [ ] **TASK-403**: Create EvidenceReportGenerator
  - Combine metric results + manual review
  - Generate PDF report (use pdfkit or puppeteer)
  - **Estimate:** 6 hours

#### Review Controller

- [ ] **TASK-404**: Build Review endpoints
  - POST /documents/:id/review
  - GET /documents/:id/review
  - GET /documents/:id/evidence-report (PDF download)
  - **Estimate:** 4 hours

#### Comparison Entity

- [ ] **TASK-405**: Create Comparison entity
  - Schema with diff_output (JSONB)
  - **Estimate:** 2 hours

#### Comparison Service

- [ ] **TASK-406**: Implement ComparisonService
  - compareVersions(versionAId, versionBId)
  - Use diff-match-patch library
  - Store result in DB (cache)
  - getComparison(comparisonId)
  - **Estimate:** 6 hours

- [ ] **TASK-407**: Add helper: compareToPreviousMonth
  - Auto-detect previous month's version
  - Call compareVersions
  - **Estimate:** 3 hours

#### Comparison Processor Job

- [ ] **TASK-408**: Create ComparisonProcessorJob
  - Async comparison for large documents
  - **Estimate:** 3 hours

#### Comparison Controller

- [ ] **TASK-409**: Build Comparison endpoints
  - POST /comparisons (body: { versionAId, versionBId })
  - GET /comparisons/:id
  - GET /documents/:id/compare-previous
  - **Estimate:** 3 hours

### Frontend Tasks

#### Review Form

- [ ] **TASK-410**: Create ReviewForm component
  - Radio buttons: Compliant / Non-compliant / Needs Revision
  - Remarks textarea (rich text or plain)
  - Findings list (add/remove dynamically)
  - Submit button
  - **Estimate:** 5 hours

- [ ] **TASK-411**: Create review submission flow
  - Modal or dedicated page
  - API integration (POST /documents/:id/review)
  - Success feedback + status update
  - **Estimate:** 3 hours

#### Version Comparison

- [ ] **TASK-412**: Create VersionComparison component
  - Split-pane view (old vs new)
  - Diff highlighting (inline or side-by-side)
  - Change statistics (lines added/removed)
  - **Estimate:** 8 hours

- [ ] **TASK-413**: Create comparison page/modal
  - Version selector (A vs B)
  - "Compare to previous month" button
  - Display VersionComparison component
  - **Estimate:** 4 hours

#### Evidence Report

- [ ] **TASK-414**: Add "Download Evidence Report" button
  - Trigger GET /documents/:id/evidence-report
  - Download PDF
  - **Estimate:** 2 hours

**Sprint 4 Total Estimate:** 57 hours (~7 days)

---

## Sprint 5: Reference Tracker & Tickets Module

**Goal:** Implement reference management and technician ticket logging

### Backend Tasks

#### Issuance Entity (Reference Tracker)

- [ ] **TASK-501**: Create Issuance entity
  - Schema with all fields (title, issuing_body, type, etc.)
  - Tags as array (PostgreSQL text[])
  - TypeORM entity + migration
  - **Estimate:** 3 hours

- [ ] **TASK-502**: Create IssuanceMetricMap entity (Phase 2 foundation)
  - Junction table
  - **Estimate:** 2 hours

#### Reference Service

- [ ] **TASK-503**: Implement ReferenceService
  - createIssuance(data)
  - updateIssuance(id, data)
  - deleteIssuance(id)
  - getIssuance(id)
  - searchIssuances(query, filters): full-text search
  - **Estimate:** 5 hours

#### Reference Controller

- [ ] **TASK-504**: Build Reference endpoints
  - GET /references (with search/filter)
  - POST /references
  - GET /references/:id
  - PATCH /references/:id
  - DELETE /references/:id
  - **Estimate:** 4 hours

#### Ticket Entities

- [ ] **TASK-505**: Create TicketCategory entity
  - Schema + seed default categories
  - **Estimate:** 2 hours

- [ ] **TASK-506**: Create Ticket entity
  - Schema with all fields
  - Relations to Category, Unit, User (technician)
  - **Estimate:** 3 hours

#### Ticket Service

- [ ] **TASK-507**: Implement TicketService
  - createTicket(data)
  - updateTicket(id, data)
  - getTickets(filters)
  - getTicketStats(dateRange): aggregations
  - **Estimate:** 5 hours

#### Ticket Controller

- [ ] **TASK-508**: Build Ticket endpoints
  - GET /tickets
  - POST /tickets
  - GET /tickets/:id
  - PATCH /tickets/:id
  - DELETE /tickets/:id
  - **Estimate:** 4 hours

- [ ] **TASK-509**: Build Ticket category endpoints
  - GET /tickets/categories
  - POST /tickets/categories (admin)
  - **Estimate:** 2 hours

### Frontend Tasks

#### Reference Tracker Pages

- [ ] **TASK-510**: Create ReferenceSearch component
  - Search bar + filters (type, issuing body, tags, date range)
  - Result list with cards
  - **Estimate:** 5 hours

- [ ] **TASK-511**: Create ReferenceForm component
  - Form to add/edit issuance
  - Tag selector (multi-select autocomplete)
  - URL validation
  - **Estimate:** 5 hours

- [ ] **TASK-512**: Create reference tracker page
  - Integrate ReferenceSearch + add/edit modals
  - **Estimate:** 4 hours

#### Tickets Pages

- [ ] **TASK-513**: Create TicketForm component
  - Category dropdown
  - Date pickers (opened, resolved)
  - Unit served selector
  - Status radio buttons
  - Description + resolution notes
  - **Estimate:** 5 hours

- [ ] **TASK-514**: Create TicketList component
  - Data table with filters
  - Columns: Category, Unit, Technician, Status, Dates
  - **Estimate:** 4 hours

- [ ] **TASK-515**: Create tickets page
  - Integrate TicketList + add/edit modals
  - Filter panel
  - **Estimate:** 4 hours

#### Admin - Ticket Categories

- [ ] **TASK-516**: Create ticket category management page
  - List categories + CRUD UI
  - **Estimate:** 3 hours

**Sprint 5 Total Estimate:** 60 hours (~8 days)

---

## Sprint 6: Dashboard & Reporting

**Goal:** Build compliance and operational dashboards with analytics

### Backend Tasks

#### Dashboard Service

- [ ] **TASK-601**: Implement getComplianceDashboard
  - Aggregate submission rate by unit/period
  - Compliance status distribution
  - Top failing metrics (Pareto)
  - Aging items (pending > N days)
  - Trend analysis (6 months)
  - Role-based filtering
  - **Estimate:** 8 hours

- [ ] **TASK-602**: Implement getTicketDashboard
  - Tickets by category
  - Resolved vs Pending
  - Tickets by unit served
  - Monthly trend
  - **Estimate:** 4 hours

- [ ] **TASK-603**: Implement getAuditSummary (admin only)
  - Recent audit log stats
  - User activity summary
  - **Estimate:** 3 hours

#### Dashboard Controller

- [ ] **TASK-604**: Build Dashboard endpoints
  - GET /dashboard/compliance
  - GET /dashboard/tickets
  - GET /dashboard/audit
  - **Estimate:** 3 hours

#### Export Service

- [ ] **TASK-605**: Implement CSV export for data tables
  - Helper function to convert JSON to CSV
  - Export endpoints for documents, tickets, references
  - **Estimate:** 4 hours

### Frontend Tasks

#### Dashboard Components

- [ ] **TASK-606**: Create KPICard component
  - Display metric with icon, value, trend indicator
  - **Estimate:** 2 hours

- [ ] **TASK-607**: Create ComplianceChart component
  - Pie chart: Compliance status distribution
  - Bar chart: Top failing metrics
  - Line chart: Trend over time
  - Use Chart.js or Recharts
  - **Estimate:** 6 hours

- [ ] **TASK-608**: Create TicketSummary component
  - Charts for ticket analytics
  - **Estimate:** 4 hours

#### Dashboard Pages

- [ ] **TASK-609**: Create main dashboard page
  - Overview KPIs
  - Integrate ComplianceChart
  - Integrate TicketSummary
  - Quick links (pending reviews, overdue submissions)
  - Role-based view
  - **Estimate:** 6 hours

- [ ] **TASK-610**: Create compliance dashboard page (detailed)
  - Filters: unit, period, document type
  - Detailed tables + charts
  - Export button
  - **Estimate:** 6 hours

- [ ] **TASK-611**: Create tickets dashboard page (detailed)
  - Filters: date range, category, technician
  - Detailed analytics
  - Export button
  - **Estimate:** 5 hours

#### Audit Log Viewer

- [ ] **TASK-612**: Create audit log viewer page (admin only)
  - Table with search/filter
  - Columns: timestamp, actor, action, object, metadata
  - Export functionality
  - **Estimate:** 5 hours

**Sprint 6 Total Estimate:** 56 hours (~7 days)

---

## Sprint 7: Testing, Polish & Deployment

**Goal:** Comprehensive testing, bug fixes, and production deployment

### Testing Tasks

- [ ] **TASK-701**: Write unit tests for backend services
  - AuthService, DocumentService, MetricsService, etc.
  - Target 70%+ coverage
  - **Estimate:** 12 hours

- [ ] **TASK-702**: Write integration tests for API endpoints
  - Test auth flow
  - Test document upload → metrics → review flow
  - Test RBAC enforcement
  - **Estimate:** 10 hours

- [ ] **TASK-703**: Write frontend component tests
  - Test critical components (forms, tables, viewers)
  - **Estimate:** 8 hours

- [ ] **TASK-704**: Manual QA testing
  - Test all user journeys per role
  - Cross-browser testing
  - Accessibility check
  - **Estimate:** 12 hours

- [ ] **TASK-705**: Bug fixing sprint
  - Address issues found in testing
  - **Estimate:** 16 hours

### Polish Tasks

- [ ] **TASK-706**: UI/UX refinements
  - Consistent styling across pages
  - Loading states and skeletons
  - Error messages and validation feedback
  - **Estimate:** 8 hours

- [ ] **TASK-707**: Performance optimization
  - Database query optimization
  - Frontend bundle size reduction
  - Lazy loading for large components
  - **Estimate:** 6 hours

- [ ] **TASK-708**: Security hardening
  - Input sanitization
  - CSRF protection
  - Rate limiting on auth endpoints
  - Security headers (helmet.js)
  - **Estimate:** 6 hours

- [ ] **TASK-709**: Documentation
  - API documentation (Swagger/OpenAPI)
  - User manual (basic)
  - Admin guide
  - Deployment guide
  - **Estimate:** 8 hours

### Deployment Tasks

- [ ] **TASK-710**: Set up production server
  - Provision VM/VPS
  - Install dependencies (Node.js, PostgreSQL, Nginx, LibreOffice)
  - Configure firewall
  - **Estimate:** 4 hours

- [ ] **TASK-711**: Configure production database
  - Set up managed PostgreSQL (RDS/Azure)
  - Run migrations
  - Seed initial data (admin user, default categories)
  - **Estimate:** 3 hours

- [ ] **TASK-712**: Configure object storage
  - Set up S3/equivalent
  - Configure credentials
  - **Estimate:** 2 hours

- [ ] **TASK-713**: Deploy backend
  - Build production bundle
  - Configure PM2/systemd
  - Environment variables
  - Health check endpoint
  - **Estimate:** 4 hours

- [ ] **TASK-714**: Deploy frontend
  - Build Next.js production bundle
  - Configure Nginx reverse proxy
  - Serve static assets
  - **Estimate:** 3 hours

- [ ] **TASK-715**: Configure SSL/TLS
  - Let's Encrypt certificate
  - Nginx HTTPS configuration
  - HSTS header
  - **Estimate:** 2 hours

- [ ] **TASK-716**: Set up monitoring
  - Application logs aggregation
  - Uptime monitoring
  - Error tracking (optional: Sentry)
  - **Estimate:** 4 hours

- [ ] **TASK-717**: Smoke testing in production
  - Test critical flows
  - Verify integrations
  - **Estimate:** 3 hours

- [ ] **TASK-718**: User training and onboarding
  - Prepare training materials
  - Conduct training sessions (alpha users)
  - **Estimate:** 8 hours

**Sprint 7 Total Estimate:** 119 hours (~15 days)

---

## Summary of Estimates

| Sprint | Focus Area | Estimated Hours | Estimated Days |
|--------|-----------|-----------------|----------------|
| Sprint 0 | Project Setup | 22 | 3 |
| Sprint 1 | Auth & Core Entities | 61 | 8 |
| Sprint 2 | Document Management | 73 | 9 |
| Sprint 3 | Compliance Engine | 58 | 7 |
| Sprint 4 | Reviews & Comparison | 57 | 7 |
| Sprint 5 | References & Tickets | 60 | 8 |
| Sprint 6 | Dashboard & Reporting | 56 | 7 |
| Sprint 7 | Testing & Deployment | 119 | 15 |
| **TOTAL** | | **506 hours** | **~64 days** |

**Assumptions:**
- 8 working hours per day
- 1 full-time developer (or adjust timeline for team size)
- ~64 days = ~13 weeks with buffer for unknowns

**With 2 developers:** ~7 weeks (realistic for Phase 1 MVP)

---

## Task Dependencies

**Critical Path:**
1. Sprint 0 → Sprint 1 (Auth required for all features)
2. Sprint 1 → Sprint 2 (Core entities needed for documents)
3. Sprint 2 → Sprint 3 (Documents must exist before metrics)
4. Sprint 3 → Sprint 4 (Metrics must exist before reviews)
5. Sprints 5 & 6 can be partially parallel if resources allow
6. Sprint 7 sequential at the end

**Parallel Opportunities:**
- Frontend and backend can work in parallel within each sprint (if team >1)
- Reference Tracker (Sprint 5) is relatively independent, can start earlier
- Tickets module (Sprint 5) is independent
- Dashboard (Sprint 6) depends on data but UI can be prototyped earlier

---

## Risk Buffer

**Contingency:** Add 20% buffer for:
- Integration challenges (DOCX processing, PDF generation)
- Metric engine tuning (false positives)
- UI/UX iterations based on user feedback
- Unexpected bugs

**Total with Buffer:** ~77 days (15.4 weeks)

---

## Definition of Done (DoD)

Each task is considered complete when:
- [ ] Code is written and follows project standards (linting passes)
- [ ] Unit tests written (if applicable)
- [ ] Code reviewed by peer (if team >1)
- [ ] Integrated into main branch
- [ ] Tested in local environment
- [ ] No console errors or warnings
- [ ] Documentation updated (API docs, code comments)

---

## Phase 2 Planning (Future)

**Not in Scope for Phase 1, but prepared for:**
- Cybersecurity API integration
- Email notifications
- Period lock/closeout workflow
- Metric-to-reference traceability UI
- Advanced diff (section-aware)
- SSO integration

---

**Document Prepared By:** BMAD Scrum Master  
**Review Required:** Development Team, Project Manager

**Next Steps:** Begin Sprint 0 - Project Setup
