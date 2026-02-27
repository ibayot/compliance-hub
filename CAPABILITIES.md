# RICTMS Compliance Hub - System Capabilities

> **Release `v1.3.0.5` (2026-02-27):** Bug fixes: KPI Detail sparklines now render as diagonal lines (null-prev fallback corrected from `prev ?? current` to `0`); Band Distribution pie chart shows unit count numbers inside colored segments (no outer callout labels).
> **Release `v1.3.0.4` (2026-02-28):** KPI Dashboard UI overhaul: neutral Overall Score Card (no band color/text), numeric-only Band Scale chips, color-block band column in Unit Scores table, composite score trend line chart in Unit Detail (replacing per-KPI bar chart), KPI Detail table with Actual/Target/Score/Trend sparkline/Band columns. New `GET /kpi/dashboard/unit/:id/timeseries` endpoint. KPI section added to in-app User Manual page.
> **Release `v1.3.0.3` (2026-02-27):** Fixed NaN SQL errors on KPI load. Added period frequency selector (Monthly/Quarterly/Semestral/Annual), band color legend, XAxis label rotation, semestral enum, 10 KPI masters + 30 monitoring rows seeded, and KPI User Manual (QA-USER-MANUAL.md §I).
> **Release `v1.3.0.2` (2026-02-27):** KPI Dashboard tab is now tab 0 (default) for all roles; graphs render immediately without manual tab navigation. Empty-state handling for all chart areas. Colored band progress indicator on scorecard. Unit score table and detail panel enhanced with band chip and drill-down.
> **Release `v1.3.0.1` (2026-02-27):** KPI access control hotfix for focal users (unit resolution fallback) and KPI unit-detail stability fix for super-admin dashboards; KPI page updated with graph-based scorecards; dashboard home now includes KPI overview by role scope; remaining inline notification alerts migrated to toast notifications.

> **Release `v1.2.0.4` (2026-02-26):** New KPI module with role-scoped dashboards and monitoring input (`kpi_master`, `kpi_monitoring`, `kpi_thresholds`, `kpi_scoring_rules`); KPI master now uses `unit_id` (from Units table) instead of free category; KPI monitoring stores `entered_by_staff_id` and `entered_by_name`; status model is `draft/locked`. Settings now supports editing existing users (except immutable `staff_id`) and add/edit persisted system role definitions.

> **Release `v1.2.0.1` (2026-02-26):** Reportorial Document Types system (per-unit, filename validation `{base_name}_{period_suffix}`); metrics applicability now uses `reportorial_doc_type_id` FK; nav fixed (Dashboard exact match, Issuances role-gated); document breadcrumbs show title; Version History timeline layout fixed; User Management: deactivate bug fixed, unit assignment in create dialog; 16 seeded metric templates (4 per type); Document upload overhauled.

> Update (`v1.1.0-dev`, 2026-02-24): document management now includes blob-backed source and preview persistence with legacy path fallback.

> Patch (`v1.1.1-dev`, 2026-02-25): adds authenticated document download flow, category-scoped issue types, settings password/theme controls, and super-admin focal account management.

> **Hotfix `v1.1.2.3` (2026-02-25):** on-demand DOCX preview fallback â€” uploaded DOCX files with no cached `preview_blob` (e.g., when queue job failed silently) now generate styled HTML via mammoth on first preview request and cache the result. `passwordHash` security leak patched: `ClassSerializerInterceptor` registered globally so `@Exclude()` on User entity is enforced across all endpoints. EADDRINUSE troubleshooting note added to INSTALLATION.

> **Hotfix `v1.1.2.2` (2026-02-25):** resolved frontend dev server startup failure (`npm run dev` exits 1) caused by a UTF-8 BOM in `frontend/package.json`. Vite's internal PostCSS config loader threw `SyntaxError: Unexpected token 'âˆ©â•—â”'` on BOM-prefixed JSON. BOM also removed from `backend/package.json`. All capabilities smoke-tested and confirmed operational.

> **Release `v1.1.2` (2026-02-25):** document download now returns proper filename via `Content-Disposition` (CORS fix); DOCX preview generates styled HTML via mammoth fallback when LibreOffice is unavailable; Document Viewer supports both HTML (iframe) and PDF (react-pdf); Reviews digital preview propagates MIME type correctly; Administration Metrics seeded with all 4 template types (section_check, keyword_check, property_check, date_check); Settings refactored to card layout with dynamic Role Management; User Manual has comprehensive field-level explanations for all 8 modules.

## Overview

The Regional ICT Management System (RICTMS) Compliance Hub is a comprehensive document management and compliance tracking system designed to help government units maintain regulatory compliance through automated document processing, metrics analysis, and collaborative review workflows.

## Core Capabilities

### 1. Document Management

#### Upload & Versioning
- **Multi-format Document Upload**: Support for PDF, DOCX, and other common document formats
- **Automatic Version Control**: Track all document versions with complete history
- **Metadata Management**: Capture title, type, period, year, and unit assignment
- **Assignment-Governed Upload Control**: Focal uploads can be restricted to super-admin-assigned report types
- **One Submission Per Cycle Enforcement**: Prevent duplicate focal submissions for the same assigned report cycle
- **Filename Convention Validation**: Optional prefix + period/year suffix checks per assignment frequency
- **Compliance-driven Readiness**: Documents remain pending until compliance review marks them compliant/ready
- **File Storage**: Flexible storage system supporting local filesystem and AWS S3
- **Checksum Verification**: Automatic integrity checking for all uploaded documents

#### Document Organization
- **Unit-based Organization**: Documents organized by organizational units
- **Document Type Classification**: Policy, Report, Manual, SOP, Checklist, and custom types
- **Period & Year Tracking**: Quarterly, monthly, and annual document periods
- **Status Tracking**: Monitor documents through pending, processing, ready, and failed states

#### Document Access
- **Document Listing**: Filterable lists with pagination support
- **Title Filtering + Total Counter**: Document list supports title-based filtering and separate total-record indicators
- **Version History**: Access complete version history for any document
- **Document Preview**: In-system document preview capabilities
- **Download Management**: Secure document and version downloads
- **Search Functionality**: Find documents by title, type, unit, or metadata

### 2. Automated Compliance Analysis

#### Text Extraction & Processing
- **OCR Support**: Extract text from scanned documents
- **PDF Text Extraction**: Direct text extraction from digital documents
- **Asynchronous Processing**: Background processing using Bull Queue system
- **Processing Status Tracking**: Real-time status updates during processing
- **Dual Extraction Persistence**: Extracted text retained at both document and document-version levels

#### Compliance Metrics Engine
- **Template-based Metrics**: Define reusable metric templates
- **Multiple Metric Categories**:
  - **Completeness**: Section presence and structure verification
  - **Consistency**: Version and metadata consistency checks
  - **Compliance**: Regulatory citation and reference verification
  - **Timeliness**: Document age and review cycle monitoring
  - **Format**: Formatting standards compliance

#### Intelligent Scoring
- **Weighted Scoring**: Configurable weights for different metrics
- **Threshold Management**: Define pass/fail criteria per metric
- **Detailed Results**: JSON-formatted metric results with explanations
- **Historical Tracking**: Maintain metric scores across all versions
- **Automated Calculation**: Metrics computed automatically on document upload
- **Submission Frequency-Aware Date Checks**: Deadline checks now support monthly, quarterly, annual, and custom frequencies
- **Custom Period Parsing Controls**: Custom period checks support regex and capture-group fallback configuration
- **Multi-keyword Number Extraction**: Number extraction rules support multiple keywords and expected numbers
- **Automatic Needs-Revision Escalation**: Failed/error automated checks create or update internal needs-revision review records

### 3. Reference & Issuance Management

#### Regulatory Reference Library
- **Issuance Database**: Comprehensive database of laws, executive orders, and regulations
- **Authority Tracking**: Manage editable authority values and filter issuances by authority text
- **Effectivity Dates**: Manage issue and effectivity dates
- **Source Documentation**: Link to official gazette and source URLs
- **Active/Inactive Status**: Manage current and superseded issuances
- **Source-first Title Access**: Issuance titles open source links in a new tab when URLs are provided

#### Document-Issuance Linking
- **Many-to-Many Relationships**: Documents can reference multiple issuances
- **Applicability Rules**: Define which metrics apply to which issuances
- **Compliance Mapping**: Automatic identification of compliance requirements
- **Citation Verification**: Check if required issuances are cited in documents
- **Mapping Manager UI**: Issuance page supports explicit link/unlink operations for `document_issuances` records
- **Role-aware Actions**: Compliance and super-admin roles can manage links, while other roles retain read-only access

#### Document-to-Document Linking
- **Cross-Document References**: Documents can reference other ready/compliant documents (e.g., report references memorandum).
- **Bidirectional Context View**: View outgoing references and incoming references from document details.
- **Ready-only Link Policy**: Only ready/compliant documents are eligible for linking.

### 4. Manual Review & Collaboration

#### Review Workflow
- **Multi-user Review**: Assign reviewers to documents
- **Review Status Tracking**: Draft, in_review, approved, changes_requested, rejected
- **Rating System**: 1-5 star rating for reviewed documents
- **Detailed Comments**: Comprehensive feedback on documents
- **Review History**: Complete audit trail of all reviews
- **Inline Digital Review Viewer**: Reviewers can open document previews in-app and submit decisions without downloading
- **Decision-driven Status Routing**:
  - `compliant` â†’ document becomes `ready`
  - `non_compliant` / `needs_revision` â†’ document returns to `pending` for focal action
- **Return-to-Focal Control**: Super-admin/compliance can return pending documents with mandatory remarks (no hard delete in workflow).

#### Version Comparison
- **Automated Diff Analysis**: Compare document versions automatically
- **Change Detection**: Identify added, removed, and modified content
- **Similarity Scoring**: Calculate similarity percentage between versions
- **Visual Comparison**: Side-by-side version comparison support

### 5. Issue & Ticket Management

#### Ticket System
- **Multi-category Tickets**: Compliance, content, format, technical, and general tickets
- **Dynamic Issue Types/Categories**: Super admins can create, update, activate/deactivate, and soft-delete issue metadata.
- **Category-Scoped Issue Types**: Ticket create/detail forms constrain issue type options by selected category
- **Priority Management**: Low, medium, high, and urgent priority levels
- **Status Workflow**: Open â†’ In Progress â†’ Resolved â†’ Closed
- **Document Linking**: Link tickets to specific documents
- **Unit Assignment**: Assign tickets to organizational units

#### Collaboration Features
- **Threaded Comments**: Discussion threads on each ticket
- **User Assignment**: Assign tickets to specific users
- **Status Updates**: Track resolution progress
- **Automatic Notifications**: Alert relevant users on ticket updates
- **Resolution Tracking**: Record resolution dates and outcomes
- **Issue Documentation Fields**: Track `issue_type`, `resolution_steps`, and `resolution_date`

### 5.1 Focal Assignment Administration

- **Assignment CRUD**: Super admins can create, update, and delete focal report assignments.
- **Cycle-specific Upload Options**: Focal users receive assignment-filtered upload options per period/year.
- **Expected Filename Guidance**: Upload UI can display expected filenames derived from assignment rules.

### 6. Dashboard & Reporting

#### Real-time Dashboard
- **Document Statistics**: Total, compliant, and pending document counts
- **Compliance Rate**: Percentage of documents meeting compliance standards
- **Ticket Overview**: Open and in-progress ticket counts
- **Recent Activity**: Latest document uploads and updates
- **Quick Actions**: Shortcut buttons for common tasks

#### Analytics & Insights
- **Unit Performance**: Compliance metrics by organizational unit
- **Trend Analysis**: Track compliance trends over time
- **Metric Performance**: Identify frequently failed metrics
- **Ticket Statistics**: Analyze ticket patterns and resolution times
- **Custom Reports**: Generate custom compliance reports

### 7. User Management & Authentication

#### User Roles
- **Admin**: Full system access with user and configuration management
- **Reviewer**: Review documents, approve/reject submissions, manage tickets
- **Viewer**: Read-only access to documents and reports
- **Unit-based Permissions**: Restrict access based on unit assignment

#### Security Features
- **JWT Authentication**: Secure token-based authentication
- **Refresh Tokens**: Long-lived sessions with automatic token refresh
- **Password Change API**: Authenticated users can update their own password from Settings
- **Password Hashing**: BCrypt password encryption
- **Session Management**: Secure session handling and logout
- **Role-based Access Control (RBAC)**: Granular permission management

### 8. Integration & API

#### RESTful API
- **Complete REST API**: All features accessible via API
- **Swagger Documentation**: Auto-generated API documentation
- **Versioned Endpoints**: API versioning for backward compatibility
- **Standard HTTP Methods**: GET, POST, PUT, DELETE operations
- **JSON Response Format**: Consistent JSON response structure

#### Third-party Integration
- **AWS S3 Storage**: Cloud storage integration
- **Redis Queue Management**: Background job processing
- **Database Support**: MariaDB/MySQL support
- **CORS Configuration**: Cross-origin resource sharing for frontend integration

### 9. System Administration

#### Configuration Management
- **Environment Variables**: Flexible configuration via .env files
- **Storage Options**: Switch between local and cloud storage
- **Database Management**: Migration and seeding scripts
- **Performance Tuning**: Configurable queue workers and processing limits
- **Safe Workflow Preservation**: Document workflow uses return-for-revision actions with audit trail instead of destructive deletion.

### 10. User Manual Module

- **Visual In-App Manual**: Dashboard user manual page with role-filtered feature guides.
- **Role-aware Content**: Users only see workflows they are authorized to access.
- **Deep Metrics CRUD Guidance**: Manual includes detailed create/update/delete field coverage for all four metric types.

### 11. Settings & Focal Administration

- **Theme Preference Toggle**: User-selectable light/dark mode persisted locally.
- **Account Security Controls**: Change password form with current-password verification.
- **Focal User Provisioning**: Super admins can create focal/technician accounts with first/middle/last/suffix, staff ID, role, position, and designation fields.

#### Monitoring & Logging
- **Application Logging**: Comprehensive logging system
- **Error Tracking**: Detailed error logs with stack traces
- **Queue Monitoring**: Track background job processing
- **Health Checks**: System health and readiness endpoints

## Technical Capabilities

### Performance
- **Asynchronous Processing**: Non-blocking document analysis
- **Queue Management**: Bull Queue for background jobs with Redis
- **Database Optimization**: Indexed queries and efficient data structures
- **Lazy Loading**: On-demand resource loading
- **Pagination**: Efficient handling of large datasets

### Scalability
- **Microservice Architecture**: Modular NestJS backend
- **Horizontal Scaling**: Stateless API design for load balancing
- **Background Workers**: Separate processing workers for scaling
- **Database Sharding**: Support for database partitioning (future)
- **CDN Integration**: Static asset delivery optimization

### Reliability
- **Error Handling**: Comprehensive error handling and recovery
- **Transaction Management**: Database transaction support
- **Data Validation**: Input validation at all levels
- **Backup Support**: Database backup strategies
- **Audit Trail**: Complete action logging for accountability
- **Privileged Action Logs**: Structured logs for sensitive metrics/tickets/reviews mutations

### Security Hardening
- **Rate Limiting**: API throttling implemented for `/api` endpoints
- **Config Validation**: Environment validation on startup with schema checks
- **Secure Defaults**: Explicit controls for DB synchronize behavior and request limits

### DevOps Baseline
- **CI Pipeline**: GitHub Actions workflow for backend/frontend build verification
- **Dependency Audit Gate**: Automated `npm audit --audit-level=high` in CI
- **Backend Test Baseline**: Automated metric-engine test suite integrated in CI hook

### Maintainability
- **Clean Architecture**: Separation of concerns and modular design
- **TypeScript**: Type-safe codebase
- **Automated Testing**: Unit and integration test support
- **Code Documentation**: Comprehensive inline documentation
- **Migration System**: Database schema versioning

## Limitations

### Current Limitations
- **Single Language**: Currently supports English only
- **Document Formats**: Limited to PDF and DOCX (no native support for spreadsheets)
- **Offline Mode**: Requires internet connectivity
- **File Size Limits**: Configurable upload size limits (default 50MB)
- **Concurrent Users**: Optimized for 50-100 concurrent users

### Planned Features (Future Releases)
- Multi-language support (Filipino/Tagalog)
- Mobile application
- Advanced OCR with machine learning
- Natural Language Processing for content analysis
- Email notifications
- Calendar integration for review deadlines
- Advanced workflow automation
- Integration with e-signature platforms
- Blockchain verification for document authenticity
- Real-time collaboration features

## System Requirements

### Server Requirements
- **Operating System**: Windows Server 2016+, Linux (Ubuntu 20.04+)
- **Node.js**: v18+ LTS
- **MariaDB**: 11.x or MySQL 8.x
- **Redis**: 7.x
- **Storage**: 100GB+ recommended for document storage
- **Memory**: 4GB+ RAM
- **CPU**: 2+ cores recommended

### Client Requirements
- **Browser**: Chrome 90+, Firefox 88+, Edge 90+, Safari 14+
- **Screen Resolution**: 1366x768 minimum
- **Internet**: Broadband connection (5 Mbps+ recommended)

## Compliance Standards

The system is designed to help organizations comply with:
- **Republic Act 11032**: Ease of Doing Business Act
- **Republic Act 10173**: Data Privacy Act
- **Executive Order 2 (2016)**: Freedom of Information
- **ARTA Guidelines**: Anti-Red Tape Authority compliance
- **CSC Circulars**: Civil Service Commission document standards
- **COA Guidelines**: Commission on Audit documentation requirements

---

**Note**: This system is designed to assist with compliance tracking and should be used in conjunction with proper legal and compliance advisory. Organizations should consult with their legal teams to ensure all regulatory requirements are met.
