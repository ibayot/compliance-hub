# Architecture Design Document (ARCH)
## RICMS Compliance Hub

> Revision note (`v1.1.0-dev`, 2026-02-24): architecture now reflects blob-first document/version persistence with conversion pipeline fallback.

**Version:** 1.0  
**Date:** February 23, 2026  
**Status:** Draft

---

## 1. Architecture Overview

### 1.1 Architecture Style
**Three-Tier Web Application** with BMAD methodology:
- **Frontend Tier**: React-based SPA (Single Page Application)
- **Backend Tier**: Node.js REST API with NestJS framework
- **Data Tier**: PostgreSQL relational database + Object Storage

### 1.2 Technology Stack Summary

| Layer | Technology | Justification |
|-------|-----------|---------------|
| **Frontend** | React 18+ with Next.js 14 | Modern, maintainable, excellent document handling |
| **UI Framework** | Material-UI (MUI) | Enterprise-ready components, accessibility built-in |
| **State Management** | React Query + Context API | Server state sync, minimal boilerplate |
| **Backend Framework** | NestJS (Node.js) | Structured, TypeScript-native, modular architecture |
| **API Style** | REST | Simple, well-understood, sufficient for requirements |
| **Database** | PostgreSQL 15+ | ACID compliance, JSONB for flexible fields, mature |
| **Object Storage** | Local filesystem (dev) / S3-compatible (prod) | Scalable document storage |
| **Authentication** | JWT with bcrypt | Stateless, secure, standard |
| **Document Processing** | LibreOffice (DOCX→PDF) + Mammoth.js | DOCX rendering and text extraction |
| **Diff Engine** | diff-match-patch | Text comparison and change tracking |

---

## 2. System Architecture

### 2.1 High-Level Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT TIER                              │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  React SPA (Next.js)                                      │  │
│  │  - Document Upload UI                                     │  │
│  │  - Document Viewer (PDF.js)                               │  │
│  │  - Compliance Dashboard                                   │  │
│  │  - Admin Configuration                                    │  │
│  │  - Reference Tracker                                      │  │
│  │  - Tickets Module                                         │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTPS/REST API
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                      APPLICATION TIER                            │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │  NestJS Backend API                                       │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  API Gateway / Controllers                          │  │  │
│  │  │  - Auth Controller                                  │  │  │
│  │  │  - Documents Controller                             │  │  │
│  │  │  - Compliance Controller                            │  │  │
│  │  │  - Admin Controller                                 │  │  │
│  │  │  - References Controller                            │  │  │
│  │  │  - Tickets Controller                               │  │  │
│  │  │  - Dashboard Controller                             │  │  │
│  │  └─────────────────┬──────────────────────────────────┘  │  │
│  │  ┌─────────────────▼──────────────────────────────────┐  │  │
│  │  │  Business Logic Layer (Services)                   │  │  │
│  │  │  - AuthService + JWT Strategy                      │  │  │
│  │  │  - DocumentService                                 │  │  │
│  │  │  - VersionService                                  │  │  │
│  │  │  - MetricsService (Compliance Engine)              │  │  │
│  │  │  - ReviewService                                   │  │  │
│  │  │  - ComparisonService (Diff Engine)                 │  │  │
│  │  │  - ReferenceService                                │  │  │
│  │  │  - TicketService                                   │  │  │
│  │  │  - DashboardService                                │  │  │
│  │  │  - AuditService                                    │  │  │
│  │  └─────────────────┬──────────────────────────────────┘  │  │
│  │  ┌─────────────────▼──────────────────────────────────┐  │  │
│  │  │  Background Jobs (Bull Queue)                      │  │  │
│  │  │  - Document Preview Generator                      │  │  │
│  │  │  - Metrics Computation                             │  │  │
│  │  │  - Version Comparison                              │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  │  ┌────────────────────────────────────────────────────┐  │  │
│  │  │  External Integrations (Future)                    │  │  │
│  │  │  - Cybersecurity API Client (Phase 2)              │  │  │
│  │  │  - Email Service (Phase 2)                         │  │  │
│  │  └────────────────────────────────────────────────────┘  │  │
│  └──────────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────────────┐
│                         DATA TIER                                │
│  ┌──────────────────────────────────┐  ┌────────────────────┐  │
│  │  PostgreSQL Database              │  │  Object Storage    │  │
│  │  - Users & Roles                  │  │  - DOCX Files      │  │
│  │  - Units & Document Types         │  │  - PDF Previews    │  │
│  │  - Metric Templates               │  │  - Extracted Text  │  │
│  │  - Documents Metadata             │  │                    │  │
│  │  - Document Versions              │  │                    │  │
│  │  - Metric Results                 │  │                    │  │
│  │  - Manual Reviews                 │  │                    │  │
│  │  - Issuances                      │  │                    │  │
│  │  - Tickets                        │  │                    │  │
│  │  - Audit Logs                     │  │                    │  │
│  └──────────────────────────────────┘  └────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3. Component Design

### 3.1 Frontend Architecture (React + Next.js)

#### 3.1.1 Folder Structure
```
frontend/
├── src/
│   ├── app/                    # Next.js 14 App Router
│   │   ├── (auth)/
│   │   │   ├── login/
│   │   │   └── layout.tsx
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/
│   │   │   ├── documents/
│   │   │   ├── compliance/
│   │   │   ├── references/
│   │   │   ├── tickets/
│   │   │   ├── admin/
│   │   │   └── layout.tsx      # Protected layout with nav
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── common/             # Reusable UI components
│   │   │   ├── Button.tsx
│   │   │   ├── DataTable.tsx
│   │   │   ├── Modal.tsx
│   │   │   └── ...
│   │   ├── documents/
│   │   │   ├── DocumentUpload.tsx
│   │   │   ├── DocumentViewer.tsx
│   │   │   ├── VersionTimeline.tsx
│   │   │   └── VersionComparison.tsx
│   │   ├── compliance/
│   │   │   ├── MetricResults.tsx
│   │   │   ├── ReviewForm.tsx
│   │   │   └── ComplianceStatus.tsx
│   │   ├── dashboard/
│   │   │   ├── ComplianceChart.tsx
│   │   │   ├── TicketSummary.tsx
│   │   │   └── KPICard.tsx
│   │   ├── references/
│   │   │   ├── ReferenceSearch.tsx
│   │   │   ├── ReferenceForm.tsx
│   │   │   └── ReferenceCard.tsx
│   │   ├── tickets/
│   │   │   ├── TicketForm.tsx
│   │   │   └── TicketList.tsx
│   │   └── admin/
│   │       ├── UnitManager.tsx
│   │       ├── MetricBuilder.tsx
│   │       └── UserManager.tsx
│   ├── lib/
│   │   ├── api/                # API client functions
│   │   │   ├── auth.ts
│   │   │   ├── documents.ts
│   │   │   ├── compliance.ts
│   │   │   └── ...
│   │   ├── hooks/              # Custom React hooks
│   │   ├── utils/              # Helper functions
│   │   └── types/              # TypeScript types
│   ├── contexts/
│   │   ├── AuthContext.tsx
│   │   └── ThemeContext.tsx
│   └── styles/
│       └── globals.css
├── public/
├── package.json
└── tsconfig.json
```

#### 3.1.2 Key Frontend Components

**Document Viewer**
- Uses `react-pdf` (PDF.js) for rendering previews
- Fallback to text view if PDF unavailable
- Zoom, pan, page navigation controls

**Version Comparison Component**
- Split-pane view (old vs new)
- Inline diff highlighting (green = added, red = removed, yellow = changed)
- Summary statistics (lines added/removed)

**Metric Results Component**
- Tabular display of metric checks
- Pass/Fail badges
- Evidence disclosure (expandable)
- Filter by status

**Review Form**
- Radio buttons: Compliant / Non-compliant / Needs Revision
- Textarea for remarks
- Optional findings list (dynamic add/remove)
- Submit with confirmation

**Dashboard Charts**
- Chart.js or Recharts for visualizations
- Compliance status pie chart
- Submission trend line chart
- Top failing metrics bar chart

#### 3.1.3 State Management
- **React Query**: Server state (API data fetching, caching, synchronization)
- **Context API**: Global client state (auth user, theme, UI preferences)
- **Local State**: Component-specific state (form inputs, modals)

#### 3.1.4 Routing and Access Control
- Next.js App Router with middleware for auth checks
- Protected routes require valid JWT
- Role-based component rendering (e.g., hide Admin menu for non-admins)

---

### 3.2 Backend Architecture (NestJS)

#### 3.2.1 Folder Structure
```
backend/
├── src/
│   ├── main.ts                 # Application entry point
│   ├── app.module.ts           # Root module
│   ├── config/                 # Configuration
│   │   ├── database.config.ts
│   │   ├── jwt.config.ts
│   │   └── storage.config.ts
│   ├── common/                 # Shared utilities
│   │   ├── decorators/
│   │   │   ├── roles.decorator.ts
│   │   │   └── current-user.decorator.ts
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts
│   │   │   ├── roles.guard.ts
│   │   │   └── unit-access.guard.ts
│   │   ├── interceptors/
│   │   │   ├── logging.interceptor.ts
│   │   │   └── transform.interceptor.ts
│   │   ├── filters/
│   │   │   └── http-exception.filter.ts
│   │   └── pipes/
│   │       └── validation.pipe.ts
│   ├── modules/
│   │   ├── auth/
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts
│   │   │   ├── auth.service.ts
│   │   │   ├── jwt.strategy.ts
│   │   │   └── dto/
│   │   ├── users/
│   │   │   ├── users.module.ts
│   │   │   ├── users.controller.ts
│   │   │   ├── users.service.ts
│   │   │   ├── user.entity.ts
│   │   │   └── dto/
│   │   ├── units/
│   │   │   ├── units.module.ts
│   │   │   ├── units.controller.ts
│   │   │   ├── units.service.ts
│   │   │   ├── unit.entity.ts
│   │   │   └── dto/
│   │   ├── document-types/
│   │   │   └── ... (similar structure)
│   │   ├── documents/
│   │   │   ├── documents.module.ts
│   │   │   ├── documents.controller.ts
│   │   │   ├── documents.service.ts
│   │   │   ├── document.entity.ts
│   │   │   ├── document-version.entity.ts
│   │   │   └── dto/
│   │   ├── metrics/
│   │   │   ├── metrics.module.ts
│   │   │   ├── metrics.controller.ts
│   │   │   ├── metrics.service.ts
│   │   │   ├── metric-template.entity.ts
│   │   │   ├── metric-result.entity.ts
│   │   │   ├── engines/          # Metric computation logic
│   │   │   │   ├── section-check.engine.ts
│   │   │   │   ├── keyword-check.engine.ts
│   │   │   │   ├── property-check.engine.ts
│   │   │   │   └── date-check.engine.ts
│   │   │   └── dto/
│   │   ├── reviews/
│   │   │   ├── reviews.module.ts
│   │   │   ├── reviews.controller.ts
│   │   │   ├── reviews.service.ts
│   │   │   ├── review.entity.ts
│   │   │   └── dto/
│   │   ├── comparison/
│   │   │   ├── comparison.module.ts
│   │   │   ├── comparison.controller.ts
│   │   │   ├── comparison.service.ts
│   │   │   └── comparison.entity.ts
│   │   ├── references/
│   │   │   ├── references.module.ts
│   │   │   ├── references.controller.ts
│   │   │   ├── references.service.ts
│   │   │   ├── issuance.entity.ts
│   │   │   └── dto/
│   │   ├── tickets/
│   │   │   ├── tickets.module.ts
│   │   │   ├── tickets.controller.ts
│   │   │   ├── tickets.service.ts
│   │   │   ├── ticket.entity.ts
│   │   │   ├── ticket-category.entity.ts
│   │   │   └── dto/
│   │   ├── dashboard/
│   │   │   ├── dashboard.module.ts
│   │   │   ├── dashboard.controller.ts
│   │   │   └── dashboard.service.ts
│   │   ├── audit/
│   │   │   ├── audit.module.ts
│   │   │   ├── audit.controller.ts
│   │   │   ├── audit.service.ts
│   │   │   └── audit-log.entity.ts
│   │   └── jobs/                # Background jobs
│   │       ├── jobs.module.ts
│   │       ├── document-processor.job.ts
│   │       ├── metrics-processor.job.ts
│   │       └── comparison-processor.job.ts
│   └── database/
│       ├── migrations/
│       └── seeds/
├── test/
├── package.json
├── tsconfig.json
└── nest-cli.json
```

#### 3.2.2 Key Backend Services

**DocumentService**
- `uploadDocument(file, metadata)`: Store DOCX, create document record
- `getDocumentById(id)`: Fetch document with versions
- `downloadDocument(id, versionId)`: Stream original file
- `getDocumentPreview(id, versionId)`: Serve PDF preview
- `listDocuments(filters)`: Paginated list with search/filter

**VersionService** (part of DocumentService or separate)
- `createVersion(documentId, file)`: Add new version
- `getVersionHistory(documentId)`: List all versions
- `getVersionDetails(versionId)`: Metadata + checksums

**MetricsService** (Compliance Engine Core)
- `computeMetrics(versionId)`: Run all applicable metrics
- `getMetricResults(versionId)`: Fetch computation results
- `getApplicableMetrics(unitId, docTypeId)`: List relevant metrics
- Orchestrates metric engines:
  - `SectionCheckEngine`: Parses headings, checks for required sections
  - `KeywordCheckEngine`: Regex/keyword matching in text
  - `PropertyCheckEngine`: Validates document metadata fields
  - `DateCheckEngine`: Validates timeliness (submission deadlines)

**ReviewService**
- `submitReview(documentId, reviewData)`: Create/update manual review
- `getReview(documentId)`: Fetch latest review
- `getReviewHistory(documentId)`: All reviews for document
- `generateEvidenceReport(documentId)`: Combine metrics + review into PDF

**ComparisonService**
- `compareVersions(versionAId, versionBId)`: Generate text diff
- `getComparison(comparisonId)`: Fetch cached comparison
- Uses `diff-match-patch` library for text diffing

**ReferenceService**
- `createIssuance(data)`: Add reference
- `updateIssuance(id, data)`: Edit reference
- `searchIssuances(query, filters)`: Full-text + tag search
- `getIssuanceById(id)`: Fetch single reference

**TicketService**
- `createTicket(data)`: Log new ticket
- `updateTicket(id, data)`: Edit ticket
- `getTickets(filters)`: List with filters
- `getTicketStats(dateRange)`: Analytics aggregation

**DashboardService**
- `getComplianceDashboard(unitId?, period?)`: Aggregate compliance stats
- `getTicketDashboard(dateRange)`: Aggregate ticket stats
- `getAuditSummary()`: Summary for admin

**AuditService**
- `log(action, actor, objectType, objectId, metadata)`: Append-only log
- `queryLogs(filters)`: Search audit trail
- Automatically invoked by interceptors for sensitive operations

#### 3.2.3 Authentication & Authorization

**JWT Strategy**
- Login returns JWT access token (expires 30 min) + refresh token (expires 7 days)
- Token payload: `{ userId, email, roles, units }`
- Refresh endpoint for token renewal

**Guards**
- `JwtAuthGuard`: Validates token on protected routes
- `RolesGuard`: Checks user has required role
- `UnitAccessGuard`: Ensures user can access specified unit data

**Decorators**
- `@Roles('admin', 'reviewer')`: Restrict endpoint to roles
- `@CurrentUser()`: Inject authenticated user into controller

---

### 3.3 Data Layer

#### 3.3.1 Database Schema (PostgreSQL)

**Entity-Relationship Overview:**

```
users ──< user_unit_access >── units
users ──< documents (uploaded_by)
users ──< manual_reviews (reviewer)
users ──< tickets (technician)

units ──< documents
document_types ──< documents

documents ──< document_versions
document_versions ──< metric_results
document_versions ──< comparisons (as version_a or version_b)
documents ──< manual_reviews

metric_templates ──< metrics
metrics ──< metric_results
metrics ──< issuance_metric_map >── issuances

ticket_categories ──< tickets
```

#### 3.3.2 Table Definitions

**users**
```sql
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  first_name VARCHAR(100),
  last_name VARCHAR(100),
  role VARCHAR(50) NOT NULL,  -- 'super_admin', 'reviewer', 'focal', 'technician', 'auditor'
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
```

**units**
```sql
CREATE TABLE units (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**user_unit_access**
```sql
CREATE TABLE user_unit_access (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE CASCADE,
  unit_id INT REFERENCES units(id) ON DELETE CASCADE,
  permissions JSONB,  -- e.g., { "canUpload": true, "canReview": false }
  UNIQUE(user_id, unit_id)
);
```

**document_types**
```sql
CREATE TABLE document_types (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**metric_templates**
```sql
CREATE TABLE metric_templates (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  metric_type VARCHAR(50) NOT NULL,  -- 'section_presence', 'keyword_match', 'property_check', 'date_rule'
  rule_config JSONB NOT NULL,  -- e.g., { "requiredSections": ["Scope", "Responsibilities"] }
  pass_criteria JSONB NOT NULL,  -- e.g., { "minimumMatches": 2 }
  weight DECIMAL(5,2) DEFAULT 1.0,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**metric_applicability** (junction table)
```sql
CREATE TABLE metric_applicability (
  id SERIAL PRIMARY KEY,
  metric_template_id INT REFERENCES metric_templates(id) ON DELETE CASCADE,
  unit_id INT REFERENCES units(id),
  document_type_id INT REFERENCES document_types(id),
  CONSTRAINT check_applicability CHECK (unit_id IS NOT NULL OR document_type_id IS NOT NULL)
);
```

**documents**
```sql
CREATE TABLE documents (
  id SERIAL PRIMARY KEY,
  unit_id INT REFERENCES units(id) NOT NULL,
  document_type_id INT REFERENCES document_types(id) NOT NULL,
  period_month INT CHECK (period_month BETWEEN 1 AND 12),
  period_year INT,
  current_version_id INT,  -- FK to document_versions (set after first version created)
  status VARCHAR(50) DEFAULT 'submitted',  -- 'submitted', 'pending_review', 'reviewed', 'revision_needed'
  uploaded_by INT REFERENCES users(id),
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(unit_id, document_type_id, period_month, period_year)
);
CREATE INDEX idx_documents_unit ON documents(unit_id);
CREATE INDEX idx_documents_period ON documents(period_year, period_month);
```

**document_versions**
```sql
CREATE TABLE document_versions (
  id SERIAL PRIMARY KEY,
  document_id INT REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  storage_key VARCHAR(500) NOT NULL,  -- Path in object storage
  file_name VARCHAR(255) NOT NULL,
  file_size_bytes BIGINT,
  mime_type VARCHAR(100),
  checksum VARCHAR(64),  -- SHA-256
  extracted_text TEXT,  -- Full text for metrics and search
  preview_storage_key VARCHAR(500),  -- PDF preview path
  uploaded_by INT REFERENCES users(id),
  uploaded_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(document_id, version_number)
);
CREATE INDEX idx_versions_document ON document_versions(document_id);
```

**metric_results**
```sql
CREATE TABLE metric_results (
  id SERIAL PRIMARY KEY,
  document_version_id INT REFERENCES document_versions(id) ON DELETE CASCADE,
  metric_template_id INT REFERENCES metric_templates(id),
  passed BOOLEAN NOT NULL,
  evidence JSONB,  -- Details of what was checked and found
  computed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_metric_results_version ON metric_results(document_version_id);
```

**manual_reviews**
```sql
CREATE TABLE manual_reviews (
  id SERIAL PRIMARY KEY,
  document_id INT REFERENCES documents(id) ON DELETE CASCADE,
  document_version_id INT REFERENCES document_versions(id),
  reviewer_id INT REFERENCES users(id) NOT NULL,
  decision VARCHAR(50) NOT NULL,  -- 'compliant', 'non_compliant', 'needs_revision'
  remarks TEXT,
  findings JSONB,  -- Array of structured findings
  reviewed_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_reviews_document ON manual_reviews(document_id);
```

**comparisons**
```sql
CREATE TABLE comparisons (
  id SERIAL PRIMARY KEY,
  version_a_id INT REFERENCES document_versions(id) ON DELETE CASCADE,
  version_b_id INT REFERENCES document_versions(id) ON DELETE CASCADE,
  diff_output JSONB NOT NULL,  -- Diff result from diff-match-patch
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(version_a_id, version_b_id)
);
```

**issuances** (Reference Tracker)
```sql
CREATE TABLE issuances (
  id SERIAL PRIMARY KEY,
  title VARCHAR(500) NOT NULL,
  issuing_body VARCHAR(255),  -- 'DSWD', 'DICT', 'NPC', etc.
  type VARCHAR(100),  -- 'Law', 'IRR', 'MC', 'AO', 'Memo', 'Standard', 'Circular'
  reference_code VARCHAR(100),
  date_issued DATE,
  effective_date DATE,
  url TEXT,
  summary TEXT,
  tags TEXT[],  -- Array of tags
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_issuances_type ON issuances(type);
CREATE INDEX idx_issuances_tags ON issuances USING GIN(tags);
```

**issuance_metric_map** (Phase 2 foundation)
```sql
CREATE TABLE issuance_metric_map (
  id SERIAL PRIMARY KEY,
  issuance_id INT REFERENCES issuances(id) ON DELETE CASCADE,
  metric_template_id INT REFERENCES metric_templates(id) ON DELETE CASCADE,
  UNIQUE(issuance_id, metric_template_id)
);
```

**ticket_categories**
```sql
CREATE TABLE ticket_categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) UNIQUE NOT NULL,
  description TEXT,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT NOW()
);
```

**tickets**
```sql
CREATE TABLE tickets (
  id SERIAL PRIMARY KEY,
  category_id INT REFERENCES ticket_categories(id) NOT NULL,
  unit_served_id INT REFERENCES units(id),
  technician_id INT REFERENCES users(id) NOT NULL,
  status VARCHAR(50) DEFAULT 'resolved',  -- 'resolved', 'pending'
  date_opened DATE NOT NULL,
  date_resolved DATE,
  description TEXT,
  resolution_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_tickets_category ON tickets(category_id);
CREATE INDEX idx_tickets_technician ON tickets(technician_id);
CREATE INDEX idx_tickets_dates ON tickets(date_opened, date_resolved);
```

**audit_logs**
```sql
CREATE TABLE audit_logs (
  id SERIAL PRIMARY KEY,
  actor_id INT REFERENCES users(id),
  action VARCHAR(100) NOT NULL,  -- 'document_upload', 'review_submit', 'config_change', etc.
  object_type VARCHAR(100),  -- 'document', 'metric_template', 'user', etc.
  object_id INT,
  metadata JSONB,  -- Additional context
  ip_address INET,
  timestamp TIMESTAMP DEFAULT NOW()
);
CREATE INDEX idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
```

#### 3.3.3 Object Storage

**File Organization:**
```
storage/
├── documents/
│   └── {unitId}/
│       └── {documentTypeId}/
│           └── {year}/
│               └── {month}/
│                   └── {documentId}_v{version}.docx
├── previews/
│   └── {documentVersionId}.pdf
└── temp/
    └── (processing queue)
```

**Storage Interface:**
- Development: Local filesystem (`./storage/`)
- Production: AWS S3, MinIO, or Azure Blob (via `@nestjs/common` + adapter pattern)

---

## 4. API Design

### 4.1 RESTful Endpoints Summary

**Authentication**
```
POST   /api/auth/login          # Login with email/password
POST   /api/auth/refresh        # Refresh JWT token
POST   /api/auth/logout         # Invalidate refresh token (optional)
GET    /api/auth/me             # Get current user profile
```

**Users**
```
GET    /api/users               # List users (admin/reviewer)
POST   /api/users               # Create user (admin)
GET    /api/users/:id           # Get user details
PATCH  /api/users/:id           # Update user
DELETE /api/users/:id           # Deactivate user
```

**Units**
```
GET    /api/units               # List units
POST   /api/units               # Create unit (admin)
GET    /api/units/:id           # Get unit
PATCH  /api/units/:id           # Update unit
DELETE /api/units/:id           # Deactivate unit
```

**Document Types**
```
GET    /api/document-types      # List document types
POST   /api/document-types      # Create type (admin)
GET    /api/document-types/:id
PATCH  /api/document-types/:id
DELETE /api/document-types/:id
```

**Metric Templates**
```
GET    /api/metrics             # List metric templates
POST   /api/metrics             # Create metric (admin)
GET    /api/metrics/:id
PATCH  /api/metrics/:id
DELETE /api/metrics/:id
```

**Documents**
```
GET    /api/documents                     # List documents (filtered by user's units)
POST   /api/documents                     # Upload new document (multipart/form-data)
GET    /api/documents/:id                 # Get document metadata + versions
GET    /api/documents/:id/versions/:vid   # Get specific version details
GET    /api/documents/:id/versions/:vid/download  # Download original DOCX
GET    /api/documents/:id/versions/:vid/preview   # Get PDF preview
POST   /api/documents/:id/versions        # Upload new version (resubmit)
```

**Compliance**
```
GET    /api/documents/:id/metrics         # Get metric results for document
POST   /api/documents/:id/review          # Submit manual review
GET    /api/documents/:id/review          # Get latest review
GET    /api/documents/:id/evidence-report # Generate evidence report (PDF)
```

**Version Comparison**
```
POST   /api/comparisons                   # Request comparison (body: { versionAId, versionBId })
GET    /api/comparisons/:id               # Get comparison result
GET    /api/documents/:id/compare-previous  # Compare latest vs previous month
```

**References (Issuances)**
```
GET    /api/references          # List/search issuances
POST   /api/references          # Create issuance (admin)
GET    /api/references/:id
PATCH  /api/references/:id
DELETE /api/references/:id
```

**Tickets**
```
GET    /api/tickets             # List tickets (filtered by role)
POST   /api/tickets             # Create ticket (technician)
GET    /api/tickets/:id
PATCH  /api/tickets/:id
DELETE /api/tickets/:id
GET    /api/tickets/categories  # List categories (for dropdown)
POST   /api/tickets/categories  # Create category (admin)
```

**Dashboard**
```
GET    /api/dashboard/compliance  # Compliance KPIs (filtered by user access)
GET    /api/dashboard/tickets     # Ticket analytics
GET    /api/dashboard/audit       # Audit summary (admin only)
```

**Audit Logs**
```
GET    /api/audit-logs          # Query logs (admin only)
```

### 4.2 Error Handling

**Standard Error Response:**
```json
{
  "statusCode": 400,
  "message": "Validation failed",
  "errors": [
    { "field": "email", "message": "Invalid email format" }
  ],
  "timestamp": "2026-02-23T10:30:00Z",
  "path": "/api/users"
}
```

**HTTP Status Codes:**
- `200 OK`: Success
- `201 Created`: Resource created
- `400 Bad Request`: Validation error
- `401 Unauthorized`: Missing or invalid token
- `403 Forbidden`: Insufficient permissions
- `404 Not Found`: Resource not found
- `409 Conflict`: Duplicate resource
- `500 Internal Server Error`: Unexpected error

---

## 5. Document Processing Pipeline

### 5.1 Upload Flow

```
1. User uploads DOCX via frontend
   ↓
2. Backend receives multipart/form-data
   ↓
3. Validate file (size, type, virus scan optional)
   ↓
4. Store file in object storage
   ↓
5. Create document + document_version records
   ↓
6. Queue background jobs:
   - Extract text (Mammoth.js)
   - Generate PDF preview (LibreOffice CLI)
   - Compute metrics (MetricsService)
   ↓
7. Respond to frontend with document ID (upload complete)
   ↓
8. Background jobs complete asynchronously:
   - Update document_version.extracted_text
   - Update document_version.preview_storage_key
   - Insert metric_results
   ↓
9. Frontend polls or receives webhook notification
```

### 5.2 Text Extraction

**Tool:** Mammoth.js (Node.js library)
- Converts DOCX to HTML and plain text
- Preserves basic structure (headings, paragraphs)
- Store plain text in `document_versions.extracted_text` for metrics

### 5.3 PDF Preview Generation

**Tool:** LibreOffice in headless mode
- Command: `soffice --headless --convert-to pdf --outdir <dir> <file.docx>`
- Alternative: `docx2pdf` Python library (if Node.js wrapper too complex)
- Cache PDFs in object storage, serve via API

### 5.4 Metrics Computation

**Engines execute in sequence:**

1. **SectionCheckEngine**
   - Parse extracted text for headings (heuristic: lines in title case, short length)
   - Check if required sections exist
   - Evidence: list of found sections + missing sections

2. **KeywordCheckEngine**
   - Regex search for required keywords/phrases
   - Case-insensitive by default
   - Evidence: count of matches + sample snippets

3. **PropertyCheckEngine**
   - Validate document metadata (title format, dates)
   - Check if filename matches conventions
   - Evidence: actual values vs expected

4. **DateCheckEngine**
   - Verify submission date vs deadline
   - Check if reporting period matches expected month
   - Evidence: dates compared

**Aggregate Score:**
- Optional weighted average of pass/fail results
- Store in `metric_results` table

---

## 6. Security Architecture

### 6.1 Authentication Flow

```
1. User submits login (email + password)
   ↓
2. Backend validates credentials (bcrypt compare)
   ↓
3. Generate JWT access token (30 min expiry) + refresh token (7 days)
   ↓
4. Return tokens to frontend
   ↓
5. Frontend stores tokens (httpOnly cookies or localStorage)
   ↓
6. Subsequent requests include JWT in Authorization header
   ↓
7. JwtAuthGuard validates token on each request
   ↓
8. Extract user from token payload, attach to request context
```

**Refresh Flow:**
```
1. Access token expires
   ↓
2. Frontend sends refresh token to /auth/refresh
   ↓
3. Backend validates refresh token (check DB for revocation)
   ↓
4. Issue new access token
   ↓
5. Frontend updates stored token
```

### 6.2 Authorization (RBAC + Unit Scoping)

**Guards Execution Order:**
1. `JwtAuthGuard`: Validate token, attach user to request
2. `RolesGuard`: Check if user has required role(s)
3. `UnitAccessGuard`: Verify user has access to specified unit (for data-scoped endpoints)

**Example:**
```typescript
@Get('/documents')
@UseGuards(JwtAuthGuard, RolesGuard, UnitAccessGuard)
@Roles('focal', 'reviewer', 'admin')
findAll(@Query('unitId') unitId: number, @CurrentUser() user: User) {
  // If user is 'focal', only return documents for their assigned units
  // If user is 'reviewer', return documents for units they review
  // If user is 'admin', return all
}
```

### 6.3 Data Protection

**Encryption in Transit:**
- HTTPS mandatory (TLS 1.2+)
- HSTS header enabled

**Encryption at Rest:**
- PostgreSQL: Transparent Data Encryption (TDE) if supported by host
- Object Storage: Server-side encryption (SSE-S3 for AWS)

**Password Security:**
- Bcrypt with cost factor 10+
- No plain text passwords in logs or responses

**Audit Logging:**
- All sensitive operations logged (document access, reviews, config changes)
- Logs immutable (append-only)

---

## 7. Performance Considerations

### 7.1 Database Optimization

- **Indexes:** All foreign keys, frequently queried fields (see DDL above)
- **Query Optimization:** Use JOINs judiciously, avoid N+1 queries (use eager loading)
- **Connection Pooling:** Configure PostgreSQL connection pool (max 20 connections)

### 7.2 Caching Strategy

- **API Response Caching:** Cache dashboard aggregates for 5 minutes (Redis optional)
- **Document Preview Caching:** PDFs cached in object storage, served with CDN (future)
- **Comparison Caching:** Store diff results in `comparisons` table, reuse if already computed

### 7.3 Background Jobs

- **Queue:** Bull (Redis-backed) for job management
- **Async Processing:** Document preview, metrics computation, comparisons
- **Retry Logic:** 3 retries with exponential backoff
- **Failure Handling:** Log errors, notify admin if critical

### 7.4 File Upload Limits

- **Max File Size:** 50 MB per document
- **Allowed Types:** DOCX only (MIME type validation)
- **Timeout:** Upload API endpoint timeout 2 minutes

---

## 8. Deployment Architecture

### 8.1 Development Environment

**Stack:**
- Frontend: `npm run dev` (Next.js dev server, port 3000)
- Backend: `npm run start:dev` (NestJS with hot reload, port 4000)
- Database: Local PostgreSQL (Docker container)
- Storage: Local filesystem

**Services:**
```yaml
# docker-compose.yml (dev)
services:
  postgres:
    image: postgres:15
    environment:
      POSTGRES_DB: ricms_compliance
      POSTGRES_USER: dev
      POSTGRES_PASSWORD: dev
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
  
  redis:
    image: redis:7
    ports:
      - "6379:6379"

volumes:
  postgres_data:
```

### 8.2 Production Environment (Initial)

**Deployment Model:** Monolith (Frontend + Backend on same server initially, can separate later)

**Infrastructure:**
- **Compute:** VPS or cloud VM (e.g., AWS EC2 t3.medium, 2 vCPU, 4 GB RAM)
- **Database:** Managed PostgreSQL (AWS RDS, Azure Database for PostgreSQL)
- **Storage:** S3-compatible object storage (AWS S3, MinIO)
- **Web Server:** Nginx (reverse proxy + static file serving)
- **SSL:** Let's Encrypt certificate

**Process Management:** PM2 or systemd

**Monitoring:**
- Application logs → CloudWatch / ELK
- Database metrics → RDS monitoring
- Uptime checks → UptimeRobot / StatusCake

### 8.3 CI/CD Pipeline (Phase 2)

**Build:**
1. Run tests (Jest for backend, React Testing Library for frontend)
2. Lint code (ESLint, Prettier)
3. Build frontend (Next.js production build)
4. Build backend (TypeScript compile)

**Deploy:**
1. SSH to server
2. Pull latest code
3. Install dependencies
4. Run database migrations
5. Restart services (PM2 reload)
6. Smoke test (health check endpoint)

---

## 9. Testing Strategy

### 9.1 Unit Tests
- **Backend:** Jest + supertest for controllers and services
- **Frontend:** Jest + React Testing Library for components

### 9.2 Integration Tests
- **API Tests:** Test full request/response cycles with test database
- **Database Tests:** Test repositories/entities with real PostgreSQL

### 9.3 E2E Tests (Phase 2)
- **Tool:** Playwright or Cypress
- **Coverage:** Critical user journeys (upload → metrics → review)

---

## 10. Migration and Rollout Plan

### 10.1 Data Migration (if replacing existing system)
- Export existing documents and metadata
- Script to import into new schema
- Validate data integrity post-migration

### 10.2 Phased Rollout
1. **Alpha (Week 1-2):** Admin + 1-2 focal users for testing
2. **Beta (Week 3-4):** Expand to 5-10 units
3. **Production (Week 5):** Full rollout with training

---

## 11. Risks and Mitigations

| Risk | Mitigation |
|------|------------|
| LibreOffice conversion failures | Fallback to text-only view; queue retry mechanism |
| Large file upload timeouts | Chunked upload (multipart), or increase timeout |
| Metrics false positives | Tuning phase; admin can mark metrics as "soft fail" |
| Database performance degradation | Query optimization; add indexes; consider read replicas |
| User adoption resistance | Training sessions; user feedback loop; iterative UX improvements |

---

## 12. Future Enhancements (Post-MVP)

**Phase 2:**
- Cybersecurity API integration
- Email notifications
- Period lock/closeout workflow
- Metric-to-reference traceability UI
- Advanced comparison (section-aware diff)

**Phase 3:**
- SSO integration
- Multi-region support
- Offline audit export packs
- AI-assisted change summarization (optional)
- Mobile app (read-only)

---

**Document Prepared By:** BMAD Architect  
**Review Required:** Lead Developer, Security Team

**Next Steps:** Task breakdown (03_TASKS.md)
