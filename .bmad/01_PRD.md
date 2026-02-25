# Product Requirements Document (PRD)
## RICMS Compliance Hub

> Revision note (`v1.1.0-dev`, 2026-02-24): storage requirement updated to support blob-backed document content and preview persistence.

**Version:** 1.0  
**Date:** February 23, 2026  
**Status:** Draft

---

## 1. Project Overview

### 1.1 Project Name
**RICMS Compliance Hub** (subject to change)

### 1.2 Purpose
A centralized web application designed to streamline compliance management for RICMS functional areas by providing:
- Automated compliance checking of unit documents with configurable metrics
- Document versioning with month-to-month comparison capabilities
- Reference tracker for laws, regulations, standards, and issuances
- Operational reporting for technician tickets and cybersecurity metrics

### 1.3 Business Goals
- Reduce manual effort in compliance verification
- Ensure audit trail completeness and evidence traceability
- Centralize regulatory references with metric linkage
- Provide real-time visibility into compliance status and operational KPIs
- Enable period-based compliance management with version control

---

## 2. Scope

### 2.1 In Scope (Phase 1 MVP)
1. **Document Management**
   - Upload, store, preview, and manage DOCX documents
   - Binary storage with metadata tracking
   - Browser-based document preview (DOCX → PDF conversion)
   - Version control with month/period tagging

2. **Compliance Engine**
   - Automated metrics checking (configurable per unit/document type)
   - Manual compliance review workflow (Compliant/Non-compliant/Needs Revision)
   - Reviewer remarks and findings tracking
   - Evidence capture and reporting

3. **Version Comparison**
   - Compare current version with previous month
   - Compare with any historical version
   - Text-level difference highlighting
   - Change log generation

4. **Role-Based Access Control**
   - Super Admin: Full system configuration
   - Compliance Manager/ICTMS Reviewer: Review and finalize compliance
   - Focal User: Upload documents for assigned unit
   - Technician: Ticket management
   - Auditor/Viewer: Read-only access to documents and reports

5. **Reference Tracker**
   - Store laws, IRRs, standards, MCs, AOs, memoranda
   - Structured metadata (issuing body, type, reference code, dates, URL)
   - Search and filter capabilities
   - Tag-based categorization

6. **Tickets Module**
   - Category-based ticket tracking (Computer/Laptop, Printer, Network, etc.)
   - Basic fields: category, status, date, unit served, technician
   - Simple reporting and analytics

7. **Dashboard**
   - Compliance status overview (by unit, by period)
   - Operational KPIs (ticket summaries)
   - Placeholder for cybersecurity metrics (API integration in Phase 2)

### 2.2 Out of Scope (Phase 1)
- Full ITSM replacement with advanced workflow engine
- OCR-heavy PDF compliance parsing
- AI-based semantic compliance judgments
- SSO integration (LDAP/MS Entra)
- Multi-region deployment
- Automated notifications (email/in-app)
- Advanced cybersecurity API integration

---

## 3. User Personas and Roles

### 3.1 Super Admin
**Goals:**
- Configure organizational structure (units, document types)
- Manage user accounts and role assignments
- Define compliance metric templates
- Configure system integrations and retention policies

**Key Activities:**
- Create/edit units and document types
- Build metric templates with pass/fail rules
- Assign users to roles and units
- Monitor system health and audit logs

### 3.2 Compliance Manager / ICTMS Reviewer
**Goals:**
- Review documents for compliance
- Validate automated metric results
- Provide structured feedback to focal users
- Finalize compliance status for periods

**Key Activities:**
- Access submitted documents across assigned units
- Compare document versions
- Review automated metric results
- Set final compliance decision (Compliant/Non-compliant/Needs Revision)
- Add structured remarks and findings
- Lock periods after review completion

### 3.3 Focal User
**Goals:**
- Submit required documents for their unit on time
- Respond to compliance findings
- Track submission and review status

**Key Activities:**
- Upload DOCX files for assigned unit
- Select reporting period (month/year)
- View automated metric results
- Read reviewer remarks
- Resubmit revised versions
- Monitor compliance status

### 3.4 Technician
**Goals:**
- Log resolved tickets efficiently
- Track workload and categories

**Key Activities:**
- Create ticket entries by category
- Update ticket status (Resolved/Pending)
- Add resolution notes
- View personal ticket dashboard

### 3.5 Auditor / Read-Only Viewer
**Goals:**
- Verify compliance evidence
- Review audit trails
- Generate reports for external audits

**Key Activities:**
- View all documents and versions
- Access compliance evidence reports
- Review audit logs
- Export compliance summaries

---

## 4. Core Functional Requirements

### 4.1 Document Repository and Versioning

#### FR-DOC-001: Document Upload
**Description:** Focal users must be able to upload DOCX files for their assigned unit.

**Acceptance Criteria:**
- File upload supports DOCX format (primary)
- Metadata captured: unit, document type, period (month/year), uploader, timestamp
- File stored securely with integrity verification (checksum)
- Status defaults to "Submitted" upon upload

#### FR-DOC-002: Document Preview
**Description:** All users with access must be able to preview documents in browser.

**Acceptance Criteria:**
- DOCX files converted to PDF for consistent preview
- Preview rendered in browser without download requirement
- Fallback to text extraction if conversion fails
- Preview generation can be async/queued for large files

#### FR-DOC-003: Version Management
**Description:** System must maintain complete version history for each document.

**Acceptance Criteria:**
- Each upload creates a new version (no overwrites)
- Versions linked by: Unit + Document Type + Period
- Version timeline displayed chronologically
- Original DOCX downloadable for any version
- Current/active version clearly indicated

#### FR-DOC-004: Version Comparison
**Description:** Users must be able to compare document versions.

**Acceptance Criteria:**
- Default comparison: current vs previous month
- Manual selection: compare any two versions
- Difference output shows:
  - Added text (highlighted in green)
  - Removed text (highlighted in red)
  - Changed sections summary
- Export comparison report as PDF

### 4.2 Compliance Engine

#### FR-COMP-001: Automated Metrics
**Description:** System must automatically check documents against configurable metrics.

**Acceptance Criteria:**
- Metrics execute automatically upon document upload
- Metric types supported:
  - Required section presence
  - Keyword/clause matching
  - Document property validation (title format, dates)
  - Timeliness rules (deadline compliance)
- Metric results stored with evidence (what was checked, what was found)
- Pass/Fail status calculated per metric
- Aggregate metric score calculated per document

#### FR-COMP-002: Metric Configuration
**Description:** Admins must be able to configure compliance metrics.

**Acceptance Criteria:**
- Create/edit/delete metric templates
- Configure per metric:
  - Name and description
  - Type (boolean, count, threshold, pattern match, date rule)
  - Pass/Fail criteria
  - Weight (optional)
  - Applicable units (one or many)
  - Applicable document types (one or many)
- Activate/deactivate metrics without deletion
- Metric changes apply to new documents only (historical data preserved)

#### FR-COMP-003: Manual Compliance Review
**Description:** Reviewers must finalize compliance status with remarks.

**Acceptance Criteria:**
- Set final decision: Compliant / Non-compliant / Needs Revision
- Add structured remarks (findings by section/metric)
- Add free-text comments
- Reviewer identity and timestamp captured
- Evidence report generated with:
  - Automated metric results
  - Manual review decision
  - All remarks and findings
  - Audit trail

#### FR-COMP-004: Review Workflow
**Description:** System must support compliance review workflow with controls.

**Acceptance Criteria:**
- Documents submitted → "Pending Review" status
- Reviewer completes review → "Reviewed" status
- Resubmission creates new version → status reverts to "Pending Review"
- Optional: Period lock prevents further changes
- Optional: Reopen workflow (admin/reviewer only)

### 4.3 Organizational Configuration

#### FR-ORG-001: Unit Management
**Description:** Admins must manage organizational units.

**Acceptance Criteria:**
- Create/edit/deactivate units
- Fields: unit name, description, active status
- Unit deactivation doesn't delete historical data
- Unit assignment to users controlled by admin

#### FR-ORG-002: Document Type Management
**Description:** Admins must manage document types.

**Acceptance Criteria:**
- Create/edit/deactivate document types
- Fields: type name, description, active status
- Associate document types with required metrics
- Map document types to units (required documents per unit)

### 4.4 Reference Tracker

#### FR-REF-001: Issuance Management
**Description:** System must store and manage regulatory references.

**Acceptance Criteria:**
- Create/edit/delete issuance records
- Fields captured:
  - Title
  - Issuing body (DSWD, DICT, NPC, etc.)
  - Type (Law, IRR, MC, AO, Memo, Standard, Circular)
  - Reference code/number
  - Date issued
  - Effective date
  - URL (validated as working link)
  - Summary/applicability notes
  - Tags (multi-select: Cybersecurity, Data Privacy, etc.)
- Markdown support in summary field

#### FR-REF-002: Reference Search
**Description:** Users must be able to search and filter references.

**Acceptance Criteria:**
- Search by: title, issuing body, reference code, tags
- Filter by: type, issuing body, date range
- Sort by: date issued, title, relevance
- Export search results as CSV/PDF

#### FR-REF-003: Metric Mapping (Phase 2 Foundation)
**Description:** System must support linking references to metrics.

**Acceptance Criteria:**
- Associate issuance with one or many metrics
- View metrics linked to an issuance
- View issuances linked to a metric
- Traceability report: reference → metric → documents checked

### 4.5 Tickets Module

#### FR-TIX-001: Ticket Entry
**Description:** Technicians must log tickets by category.

**Acceptance Criteria:**
- Create ticket with fields:
  - Category (dropdown, admin-configured)
  - Subcategory (optional, future)
  - Date opened
  - Date resolved
  - Status (Resolved/Pending)
  - Unit/office served
  - Technician (auto-filled from logged-in user)
  - Short description (optional)
  - Resolution notes (optional)
- Validation: Date resolved >= Date opened

#### FR-TIX-002: Category Configuration
**Description:** Admins must manage ticket categories.

**Acceptance Criteria:**
- Create/edit/deactivate categories
- Default categories:
  - Computer/Laptop
  - Printer
  - Account Reset
  - Email Reset
  - Network Issues
  - Software Installation
  - Hardware Repair
  - Other
- Custom category names allowed

#### FR-TIX-003: Ticket Analytics
**Description:** Dashboard must display ticket summaries.

**Acceptance Criteria:**
- Total tickets by category
- Resolved vs Pending count
- Tickets by unit served
- Tickets by technician
- Monthly trend graph
- Filter by date range
- Export as CSV

### 4.6 Dashboard and Reporting

#### FR-DASH-001: Compliance Dashboard
**Description:** Dashboard must visualize compliance status.

**Acceptance Criteria:**
- Metrics displayed:
  - Submission rate (% of required documents submitted per unit per period)
  - Compliance status distribution (Compliant/Non-compliant/Needs Revision)
  - Top 5 failing metrics (Pareto chart)
  - Aging items (pending review >7 days, pending revision >14 days)
  - Trend: compliance rate vs previous 6 months
- Filters: unit, period, document type
- Role-based view (Focals see their unit only)

#### FR-DASH-002: Operational Dashboard
**Description:** Dashboard must show operational KPIs.

**Acceptance Criteria:**
- Ticket summary widget (from Tickets module)
- Cybersecurity metrics widget (placeholder in Phase 1)
- Quick links to pending reviews, overdue submissions
- Download dashboard as PDF

#### FR-DASH-003: Audit Trail
**Description:** System must log all significant actions.

**Acceptance Criteria:**
- Events logged:
  - Document upload/download/preview
  - Compliance review completion
  - Metric template changes
  - User access to sensitive data
  - Admin configuration changes
- Log fields: actor, action, object type, object ID, timestamp, metadata (JSON)
- Audit logs immutable (no edits/deletes)
- Admin can search and export logs

---

## 5. Non-Functional Requirements

### 5.1 Security

#### NFR-SEC-001: Authentication
**Description:** All users must authenticate before access.

**Acceptance Criteria:**
- Secure login with username/email and password
- Password strength requirements (min 8 chars, complexity)
- Password hashing (bcrypt or Argon2)
- Session management with JWT tokens
- Token expiration and refresh mechanism
- Session timeout after 30 minutes of inactivity

#### NFR-SEC-002: Authorization
**Description:** Role-based access control must enforce least privilege.

**Acceptance Criteria:**
- Permissions enforced at API level (not just UI hiding)
- Unit-based data segregation (Focals access only their unit)
- Reviewer access scoped by assignment (unit or region)
- Admin access to all data with audit logging
- Failed authorization attempts logged

#### NFR-SEC-003: Data Protection
**Description:** Data must be protected in transit and at rest.

**Acceptance Criteria:**
- TLS 1.2+ for all HTTP traffic
- Database encryption at rest (if supported by DB platform)
- File storage encryption (if supported by storage platform)
- No sensitive data in logs (passwords, tokens redacted)
- Secure credential storage for external APIs (encrypted config)

### 5.2 Data Governance

#### NFR-GOV-001: Version Immutability
**Description:** Document versions must be immutable.

**Acceptance Criteria:**
- No delete or overwrite operations on document versions
- New upload always creates new version
- Soft delete for user-requested removals (flagged, not deleted)
- Retention policies enforced automatically (archive old versions per policy)

#### NFR-GOV-002: Audit Trail Completeness
**Description:** All compliance-relevant actions must be auditable.

**Acceptance Criteria:**
- Complete chain of custody from upload → metrics → review → decision
- Reviewer identity captured
- Timestamps in UTC, displayed in user's timezone
- Evidence traceability: metric result → computation logic → source document

### 5.3 Performance

#### NFR-PERF-001: Response Time
**Description:** Interactive operations must be responsive.

**Acceptance Criteria:**
- Page load: <2 seconds (excluding document preview)
- API response (simple queries): <500ms
- Search results: <1 second
- Document preview generation: Async, queued if needed

#### NFR-PERF-002: Scalability
**Description:** System must handle expected load.

**Acceptance Criteria:**
- Support 100+ concurrent users
- Support 1000+ documents per month
- Database queries optimized with indexes
- Large file handling (up to 50MB DOCX)

### 5.4 Usability

#### NFR-USE-001: Browser Compatibility
**Description:** Application must work on modern browsers.

**Acceptance Criteria:**
- Supported: Chrome 90+, Edge 90+, Firefox 88+
- Responsive design (desktop and tablet)
- Mobile view (read-only features)

#### NFR-USE-002: Accessibility
**Description:** Application should follow basic accessibility guidelines.

**Acceptance Criteria:**
- Semantic HTML
- Keyboard navigation support
- ARIA labels for interactive elements
- Color contrast (WCAG AA)

---

## 6. User Stories (Phase 1 MVP)

### Epic 1: Document Management

**US-001:** As a Focal User, I want to upload a DOCX document for my unit and period, so that it can be reviewed for compliance.

**US-002:** As a Focal User, I want to preview my uploaded documents in the browser, so that I can verify the upload was successful.

**US-003:** As a Focal User, I want to view the version history of a document, so that I can track changes over time.

**US-004:** As a Reviewer, I want to compare the current document version with the previous month's version, so that I can identify changes easily.

### Epic 2: Compliance Management

**US-005:** As a System, I want to automatically check uploaded documents against configured metrics, so that compliance can be assessed objectively.

**US-006:** As a Reviewer, I want to view automated metric results with evidence, so that I can validate the findings.

**US-007:** As a Reviewer, I want to set a final compliance decision and add remarks, so that focal users know what needs improvement.

**US-008:** As a Focal User, I want to view compliance feedback on my documents, so that I can make necessary corrections.

**US-009:** As a Focal User, I want to resubmit a revised document version, so that compliance can be reassessed.

### Epic 3: Administration

**US-010:** As an Admin, I want to create and manage units, so that the organizational structure is reflected in the system.

**US-011:** As an Admin, I want to define document types required per unit, so that focal users know what to submit.

**US-012:** As an Admin, I want to create compliance metric templates, so that documents are checked consistently.

**US-013:** As an Admin, I want to assign users to roles and units, so that access is properly controlled.

### Epic 4: Reference Tracker

**US-014:** As an Admin, I want to add regulatory references (laws, standards, issuances), so that they are centrally tracked.

**US-015:** As any User, I want to search references by keyword or tag, so that I can quickly find relevant regulations.

### Epic 5: Tickets

**US-016:** As a Technician, I want to log a resolved ticket with category and details, so that my work is tracked.

**US-017:** As an Admin, I want to configure ticket categories, so that reporting is structured.

**US-018:** As a Manager, I want to view ticket analytics by category and technician, so that I can assess workload.

### Epic 6: Dashboard

**US-019:** As a Manager, I want to view compliance status across all units, so that I can identify areas needing attention.

**US-020:** As an Admin, I want to view audit logs, so that I can track system usage and changes.

---

## 7. Data Requirements

### 7.1 Data Entities (High-Level)

1. **Users**: Identity, roles, unit assignments
2. **Units**: Organizational structure
3. **Document Types**: Templates for required documents
4. **Metric Templates**: Compliance rules
5. **Documents**: Version-controlled files with metadata
6. **Document Versions**: Individual file versions with checksums
7. **Metric Results**: Automated compliance check outcomes
8. **Manual Reviews**: Reviewer decisions and remarks
9. **Issuances**: Regulatory references
10. **Tickets**: Operational issue tracking
11. **Audit Logs**: Immutable activity records

### 7.2 Data Retention
- **Documents**: Retain all versions per configured retention policy (default: 7 years)
- **Audit Logs**: Retain indefinitely (or per organizational policy)
- **Tickets**: Retain for 2 years
- **Metric Results**: Retain with document versions
- **Issuances**: Retain indefinitely (mark as obsolete, don't delete)

---

## 8. Integration Requirements

### 8.1 Phase 1
- **None** (API integration for cybersecurity metrics deferred to Phase 2)

### 8.2 Phase 2 (Future)
- **Cybersecurity Metrics API**: REST API for incident/vulnerability data
- **Email Notifications**: SMTP integration for alerts
- **SSO**: LDAP or MS Entra ID for enterprise authentication

---

## 9. Assumptions and Constraints

### 9.1 Assumptions
- Users have modern web browsers (Chrome/Edge/Firefox)
- Documents are primarily in DOCX format (Office Open XML)
- Internet connectivity is available
- Compliance metrics can be defined as objective, rule-based checks
- Final compliance judgment is always manual (human reviewer)

### 9.2 Constraints
- Phase 1 budget and timeline limit scope to MVP features
- No AI/ML-based compliance judgments (governance risk)
- DOCX parsing limitations (complex formatting may not convert perfectly)
- Initial deployment is single-region

---

## 10. Success Metrics

### 10.1 Adoption Metrics
- 80%+ focal users actively submit documents within 3 months
- 90%+ documents submitted by deadline each period

### 10.2 Efficiency Metrics
- 50% reduction in manual compliance check time
- Reviewer turnaround time <5 days on average

### 10.3 Quality Metrics
- 100% audit trail completeness (no gaps in evidence)
- Zero data loss incidents
- <5% false positive rate on automated metrics (after tuning)

### 10.4 User Satisfaction
- System usability score >70% (post-launch survey)
- <10 support tickets per month after stabilization

---

## 11. Risk Register

| Risk | Impact | Likelihood | Mitigation |
|------|--------|-----------|------------|
| DOCX preview fidelity issues | Medium | High | Convert to PDF for consistency; fallback to text view |
| Metric ambiguity (subjective compliance) | High | Medium | Keep metrics objective; manual review is final authority |
| Policy references become outdated | Medium | Medium | Tracker includes "review needed" flag; versioning for issuances |
| Access control complexity | High | Low | Strict RBAC enforcement; comprehensive audit logging |
| Performance degradation with large files | Medium | Medium | Async processing queue; file size limits |
| User adoption resistance | Medium | Medium | Training sessions; phased rollout; collect feedback |

---

## 12. Phase 1 Deliverables

**Must Have (MVP):**
1. User authentication and role-based access control
2. Unit and document type configuration
3. Document upload, storage, and versioning
4. Browser-based document preview (DOCX → PDF)
5. Automated metrics engine with configurable rules
6. Manual compliance review workflow with remarks
7. Version comparison (text diff)
8. Reference tracker (CRUD + search)
9. Tickets module (category-based logging + basic dashboard)
10. Compliance dashboard (submission rate, status distribution, trends)
11. Audit logging

**Should Have (if time permits):**
12. Advanced diff view with section-aware highlighting
13. Export features (PDF reports, CSV exports)
14. Dashboard filters and drill-down

**Won't Have (Phase 2):**
- Metric-to-reference traceability mapping
- Period lock/closeout workflow
- Email notifications
- Cybersecurity API integration
- SSO integration

---

## 13. Acceptance Criteria

**Phase 1 is complete when:**

1. ✅ A focal user can upload a DOCX, and the system stores it, previews it, extracts text, runs metrics, and creates a version record.

2. ✅ A reviewer can compare the document to the previous month's version, set manual compliance status, and add remarks.

3. ✅ An admin can add/edit units, define metric templates per unit/document type, and manage users/roles.

4. ✅ The reference tracker can store issuances/standards with links and tags, and be searched/filtered.

5. ✅ A technician can log tickets under configurable categories with resolved/pending states.

6. ✅ The dashboard shows compliance status, trends, and ticket summaries (cybersecurity widget placeholder).

7. ✅ Audit trail exists for uploads, reviews, decisions, and changes.

8. ✅ All user roles can log in and access appropriate features based on role and unit assignment.

9. ✅ System passes basic security review (auth, authz, data protection).

10. ✅ System is deployed to staging environment and passes user acceptance testing with key stakeholders.

---

**Document Prepared By:** BMAD Analyst  
**Review Required:** Stakeholders, Compliance Manager, IT Security

**Next Steps:** Architecture design (02_ARCH.md) and task breakdown (03_TASKS.md)
