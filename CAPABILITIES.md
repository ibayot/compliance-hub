# RICTMS Compliance Hub - System Capabilities

> **Release `v1.4.0` (2026-03-03):** Issuances module now supports broader source coverage for compliance search and applicability mapping: applicable laws, IRRs, standards, Executive Orders, DICT/NPC circular references, and NCSP planning references. Issuance records now include amendment metadata (`is_amendment`, `amended_issuance_number`, `ict_amendment_notes`) and the list view includes an `ICT Related Amendments` column for fast legal-impact scanning.

> **Patch (`v1.4.0`, 2026-03-03):** Issuances now support persistent checkbox multi-select filtering for Authority and Category (selected values remain visible while active). The project also includes an upload-first issuance assessment workflow (`issuance-file-drop/` + `scripts/classify_issuance_drop.py`) that classifies dropped files into Included / Mark-for-Removal / Mark-for-Review without removing existing seeded issuances.

> **Patch 2 (`v1.4.0`, 2026-03-03):** Issuance file assessment now performs deep-dive parsing (all pages, bounded extraction), adds per-file metadata (`policy_group`, `category`, `page_count`, topic hints, and external-context notes), and enforces AO/MC inclusion as `INTERNAL_POLICY` categories.

> **Patch 3 (`v1.4.0`, 2026-03-03):** Reassessment now includes a dedicated **public-service criterion** for inclusion decisions. Anti-red-tape/service-delivery issuances (e.g., `RA-9485`) are included, while sector-limited issuances not generally applicable to agency public-service operations remain deferred.

> **Patch 4 (`v1.4.0`, 2026-03-03):** Internal AO/MC policy artifacts are now first-class seeded issuances (`issuance-041..050`) and DPO-related operational coverage is seeded via `NPC-CIRCULAR-17-01`. Issuance category display labels are normalized to human-readable title formatting in the UI.

> **Patch 5 (`v1.4.0`, 2026-03-03):** Issuances now support database-backed attachment storage per row (upload/replace/delete + inline view/download), title-click fallback to attachment when `source_url` is absent, ellipsis-based row actions, and built-in table pagination for better large-list usability.

> **Release `v1.3.0.22` (2026-03-03):** Issuances module filtering now uses structured dropdown controls by Authority, Category (`issuance_type`), and Status (All/Active/Inactive). Issuance records can now be explicitly activated/deactivated (including quick row action) to support superseded or inactive regulatory references. Seed baseline also expands applicability/relevance narratives for deeper operational and governance interpretation.

> **Release `v1.3.0.21` (2026-03-03):** Issuances module now supports comprehensive ICT coverage in seeded baseline data: laws, circulars, memorandums, IRRs, and international standards (ISO/NIST) relevant to operations, governance, security/cybersecurity, business continuity, disaster response, safety, and applicable use. Issuance records now include `issuance_type`, `applicability_scope`, and `relevance_notes`, and the Issuances table adds a dedicated action to open an applicability/relevance modal while preserving existing actions.

> **Release `v1.3.0.20` (2026-03-03):** Issuances baseline curation for ICT relevance: seed data now contains only operational/governance/safety-relevant ICT issuances with authoritative source links. Standards-only and generic placeholder references were removed from the default seeded baseline. Added `ICT-ISSUANCE-RELEVANCE-MAP.md` documenting per-issuance relevance rationale and source traceability.

> **Release `v1.3.0.19` (2026-03-03):** KPI and Reports trend sparklines now render multi-point zigzag paths for Quarterly/Semestral/Annual periods so trend cells reflect true intra-period movement, while monthly remains naturally short. Arrowheads no longer enforce artificial minimum tilt and now follow true line geometry.

> **Release `v1.3.0.18` (2026-03-03):** Trend sparkline arrowheads in KPI and Reports now use a subtle minimum tilt (~5°) for near-flat changes so direction stays visible without exaggerated angles. Metrics applicability remains 12 total with one global set (`metric-001..004`) and one targeted set per unit (`metric-005..008` for IT `ICT Security Assessment`, `metric-009..012` for Finance `Finance Risk Report`); Jan/Feb/Mar 2025 pending queue samples (`doc-017..022`) are seeded as `Monthly Report` to keep targeted mappings isolated. Repository preview modal now includes a direct Download action in addition to table-row View/Download actions.

> **Release `v1.3.0.17` (2026-03-03):** Direction indicators in KPI/Reports single-unit tables are now glyph-only (`↑` / `↓`) for cleaner scanning. Trend sparkline arrowheads in KPI and Reports enforce a stronger minimum tilt so small up/down changes are still visibly directional. Backend `db:seed` is repaired via a new `backend/src/database/seed.ts` runner; reseed now reliably loads all 12 metric templates (3 per type), 12 applicability mappings, and pending sample documents including Jan/Feb/Mar 2025 unit reports (`doc-017..022`) with focal ownership for Documents queue visibility.

> **Release `v1.3.0.16` (2026-03-04):** KPI dashboard now shows per-KPI Direction indicators (`↑ Higher`, `↓ Lower`) in Unit Detail, and trend sparklines in both KPI and Reports include arrowheads for clearer up/down movement. `KPIs by Performance Band` now honors active filters (including selected unit) and uses transparent dashed `PARTIAL` slices for incomplete-period carryover logic. Backend `lower_is_better` scoring uses `target/actual*100` (with cap/floor clamp) so lower actual values are rewarded correctly. Repository document list removes status/compliance columns because repository records are already compliant-ready outputs, while preserving View + Download actions for report reuse. Seed adds Jan/Feb/Mar 2025 unit reports for IT and Finance (`doc-017..022` + `ver-017..022`).

> **Release `v1.3.0.15` (2026-03-04):** KPI/Reports trend logic correction and workflow split. Monthly chart range now uses previous-month→selected-month for Feb–Dec (January keeps zero-start behavior). Quarterly/Semestral/Annual trend direction now uses average-based comparison (historical average vs current period) for both KPI and Reports tables. Reports KPI chart legends removed. Documents and Reviews now operate as pending-only processing queues, while Repository lists ready/compliant outputs and uses inline modal preview (no redirect). Seed expanded with additional issuance references (COA/NPC/DBM/DICT + international standards) and extra pending 2026 per-unit sample documents. In-app User Manual and release documentation synchronized to these rules.

> **Release `v1.3.0.14` (2026-03-04):** Repository layout fix — document table now renders full-width below folder grid (no horizontal scroll); spurious "Type" column removed. KPI/Reports monthly chart now spans Jan → selected month (not prev-month → current); quarterly/semestral unit-detail chart shows only period months (Q3 = Jul–Sep, H2 = Jul–Dec). Blank 0-anchor replaced with per-unit/per-KPI first-null-to-0 injection so IT Unit shows Jan→Feb comparison while Finance shows 0→Feb. 8 new unit-targeted metric templates (3 of each type): metrics 005–008 apply to IT `ICT Security Assessment` docs, metrics 009–012 apply to Finance `Finance Risk Report` docs. 4 new metric-test documents (doc-011–014) with precomputed metric_results: doc-011 triggers 8 templates, doc-012 triggers 8, doc-013/014 trigger only the 4 global templates.

> **Release `v1.3.0.13` (2026-03-04):** KPI/Reports chart anchoring — all trend lines now unconditionally start at 0 (0-anchor prepended to `allUnitsLineData` and `kpiDetailLineData`). Unit Detail blank for partial-period units fixed: `openUnitDashboard` fetches from January 1 of the selected year so historical data is always visible. KPI detail X-axis labels now show correct month abbreviations (Jan–Dec) for full-year range. KPI detail table now shows KPI name (bold) + code (caption) instead of code-only. Reports page KPI Scores section matches KPI module exactly: Color swatch, Trend sparkline columns added; single-unit table gains name+code+trend; all-units table has Color/Score/Trend/# KPIs columns. New "KPIs Requiring Attention" highlighted section in Reports (Red/Amber KPIs table with actionable data). 8 sample compliance documents added to seed (doc-003–doc-010, all 4 metric rules satisfied). In-app User Manual gains "Consolidated Reports" and "Report Repository" sections.

> **Release `v1.3.0.12` (2026-03-03):** KPI Score fix — `lower_is_better` formula corrected: `actual ≤ target` now yields `(actual/target)*100` instead of `(target/actual)*100`; example: incident resolution time 3.1 h vs 4 h target → 77.5 (was 100). Unit Detail header: "• Band: X" text removed; composite score now shown as a colored `<Chip>` (green/amber/red background). Unit Detail incomplete-data guard: when a unit has no KPI rows for the period, a "No KPI data (partial period)" message replaces the table. Monthly chart single-dot fix: Feb–Dec shows previous month; January prepends a synthetic score-0 anchor so a line always renders. Trend sparklines fixed to use first→last `hasData` point for prev/curr (was always `prev=null`). "KPIs by Performance Band" second pie chart added to Band Distribution alongside the existing "Units by band" pie (layout changed to 2×md=6). Reports page: Card 2 all-units label changed to "All Units / Reporting Scope" (no raw count); KPI Scores section title is dynamic ("KPI Scores" when unit selected, "KPI Scores by Unit" when all units). `dashboardUnit` unitName DB-fallback for partial-period units that have no monitoring rows.

> **Release `v1.3.0.11` (2026-03-02):** KPI Dashboard data-gate: `hasDataForPeriod` computed boolean hides the unit table rows and Unit Detail panel entirely when no monitoring data exists for the selected period; Unit Detail auto-closes on period change if no data. Consolidated Reports multi-frequency: Report Parameters now has Year + Frequency (Monthly/Quarterly/Semestral/Annual) + sub-period picker matching the KPI module, with dynamic period labels. Single-unit report shows a KPI detail line chart + KPI breakdown table; all-units report shows the multi-line Unit KPI Scores trend chart. Score cards updated: "units reporting" card replaced by unit name card when a unit is selected, "KPI Entries" renamed "KPIs Monitored". Document Submissions table gains a "Metrics Applied" column (count from `metricsApi.listTemplates()` applicability). Print fix: all `<Alert severity="info">` replaced with plain `<Box>` elements + `svg { display:none }` in print CSS.

> **Release `v1.3.0.10` (2026-02-28):** Report Repository (`/dashboard/repository`) — Google Drive-style Year→Month/Quarter/Annual folder view of all documents with inline document tables (view/download per row). Document Upload period picker — year + month/quarter selectors allow late submissions with correct expected filename based on selected period (not upload date). Backend `uploadDocument` now validates filename against client-supplied year/period when provided. Consolidated Reports (`/dashboard/reports`) — single-page report combining KPI scores (overall scorecard, per-unit table) and document submissions for a selected period, with Print/PDF export. New backend `GET /documents/repository` endpoint. New `computePeriodSuffixExplicit`/`computeExpectedFilenameExplicit` frontend helpers and `computePeriodSuffixFromParts`/`computeExpectedFilenameFromParts` backend helpers.
> **Release `v1.3.0.9` (2026-02-27):** KPI Dashboard: Unit KPI Scores table now iterates `availableUnits` (not `summary.units`) — all units always have a row, partial-period units show `—` for Score and KPI count. Trend sparklines anchor to the last `hasData` point and start from 0 (no cross-year Dec anchor). `getTimeseriesRange` returns the period's own range only (no prev-Dec injection). Unit Detail is now a collapsible stacked panel with a close button; it renders only after a unit row is clicked. Band Distribution includes a transparent dashed slice for partial-period units outside the scored summary.
> **Release `v1.3.0.8` (2026-02-27):** KPI Dashboard: score card progress bar now band-colored (green/amber/red); chart legends removed from all three charts; pie hover tooltip removed; unit filter collapses the Scores panel and expands Unit Detail to full width; partial-period units (e.g. Finance in Q3) now render lines up to their last available month via `availableUnits`-based timeseries fetch; `unitColorMap` useMemo ensures stable color assignment. AppBar: Dark/Light mode toggle in user account dropdown. Units: Reportorial Document Types auto-load on accordion expand (no longer shows "None Yet" incorrectly on first expansion).
> **Release `v1.3.0.7` (2026-02-27):** Backend DB connection fix (`DB_SYNCHRONIZE=false` stops TypeORM from attempting schema mutations blocked by FK index constraints). KPI multi-line chart now renders a `<Line>` for every unit/KPI unconditionally — the `hasAnyData` exclusion is removed; units with no data in the visible period show only null-gap segments. Stale legacy seed files removed; single authoritative seed at `backend/src/database/seed-data.sql`.
> **Release `v1.3.0.6` (2026-02-28):** KPI Dashboard multi-line charts: Unit KPI Scores and Unit Detail both now render one `<Line>` per unit/KPI using a distinct `UNIT_COLORS` palette. Tables show a unique Color swatch per row (no Band column). Trend sparklines use band-computed colors (green/amber/red baseline). `allUnitsTimeseries` state fetches all visible units in one `Promise.all` on every dashboard load. Unit Detail auto-refreshes on filter change via `selectedUnitIdRef`. Partial data (missing months) renders as line gaps (`connectNulls={false}`); lines excluded only when zero entries for the entire selected period. Seed: IT Unit Jan–Dec 2025, Finance Unit Feb–Aug 2025.
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
