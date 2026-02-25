# RICTMS Compliance Hub - Database Setup Complete

> Update (`v1.1.0-dev`, 2026-02-24): `document_versions` now supports `file_blob` and `preview_blob` for source and preview binaries.

## ✅ Backend Status: RUNNING
- URL: http://localhost:4000/api
- Swagger API Docs: http://localhost:4000/api (Swagger UI available)
- Database: rictms_compliance (XAMPP MariaDB)
- TypeORM Synchronize: Enabled in development mode

## ✅ Database Schema Generated
TypeORM successfully created all 14 tables:
1. **units** - Organizational units (5 records)
2. **users** - System users (6 records)
3. **user_unit_access** - User-unit access mappings  
4. **documents** - Uploaded documents (3 records)
5. **document_versions** - Document version history (4 records)
6. **issuances** - Government issuances/regulations (3 records)
7. **document_issuances** - Document-issuance relationships
8. **metric_templates** - Compliance metric definitions (3 records)
9. **metric_applicability** - Metric rules (4 records)
10. **metric_results** - Metric evaluation results (3 records)
11. **manual_reviews** - Manual review records (2 records)
12. **version_comparisons** - Document version comparisons (1 record)
13. **tickets** - Support/issue tickets (3 records)
14. **ticket_comments** - Ticket discussion threads (4 records)

## ✅ Seed Data Loaded Successfully

### Sample Users (All passwords: `password123`)
| Email | Role | Units | Purpose |
|-------|------|-------|---------|
| admin@rictms.edu.ph | super_admin | All | Full system access |
| reviewer@rictms.edu.ph | reviewer | All | Review documents |
| focal1@rictms.edu.ph | focal | Finance, HR | Focal point for departments |
| focal2@rictms.edu.ph | focal | IT, Procurement | Focal point for departments |
| tech@rictms.edu.ph | technician | IT Services | Technical support |
| auditor@rictms.edu.ph | auditor | All | Audit and compliance review |

### Sample Units
1. Office of the President
2. Finance Department  
3. Human Resources
4. IT Services
5. Procurement Office

### Sample Documents
1. Quality Assurance Self-Assessment Report (1 version, ready status)
2. Financial Performance Report Q4 2023 (2 versions, ready status)  
3. Employee Training Plan 2024 (1 version, ready status)

### Sample Issuances
1. CMO-2023-001 - Quality Assurance Guidelines (CHED)
2. NBC-2024-580 - Fiscal Accountability (DBM)
3. CSC-MC-2023-015 - Performance Management (CSC)

### Sample Metrics
1. Required Sections Check (section_check)
2. Compliance Keywords Presence (keyword_check)
3. Submission Deadline Check (date_check)

### Sample Tickets
1. TICK-2024-001 - File upload issue (in_progress, high priority)
2. TICK-2024-002 - Compliance query (open, medium priority)
3. TICK-2024-003 - Training request (resolved, low priority)

## 🚀 Next Steps

### 1. Test Backend API Endpoints
Access Swagger UI at http://localhost:4000/api to test all endpoints:
- Auth: POST /api/auth/login
- Users: GET /api/users
- Units: GET /api/units
- Documents: GET /api/documents
- Issuances: GET /api/issuances
- Tickets: GET /api/tickets
- Metrics: GET /api/metrics

### 2. Test Authentication
```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@rictms.edu.ph",
    "password": "password123"
  }'
```

Expected response:
```json
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "...",
  "user": {
    "id": 1,
    "email": "admin@rictms.edu.ph",
    "firstName": "Maria",
    "lastName": "Santos",
    "role": "super_admin"
  }
}
```

### 3. Test Protected Endpoints
Use the access token from login to test protected endpoints:
```bash
curl -X GET http://localhost:4000/api/documents \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN_HERE"
```

### 4. Start Frontend Development Server
```bash
cd frontend
npm install  # If not already done
npm run dev
```

Expected output:
- Frontend URL: http://localhost:3000
- Should connect to backend at http://localhost:4000

### 5. Test Frontend Features
1. **Login Page** (http://localhost:3000/login)
   - Test with: admin@rictms.edu.ph / password123
   - Verify token storage and redirect to dashboard

2. **Dashboard** (http://localhost:3000/)
   - View document statistics
   - View recent activities
   - Check compliance metrics

3. **Documents Page** (http://localhost:3000/documents)
   - List all documents
   - Filter by unit/status
   - Upload new document (if permissions allow)

4. **Issuances Page** (http://localhost:3000/issuances)
   - View government issuances
   - Search and filter
   - Link to documents

5. **Tickets Page** (http://localhost:3000/tickets)
   - View open tickets
   - Create new ticket
   - Add comments

## 📋 Key Fixes Applied

### Entity Corrections
1. Fixed all foreign key types (User.id and Unit.id are `number` not `string`)
2. Made `uploaded_by` nullable to match `onDelete: 'SET NULL'` constraints
3. Corrected `compared_by_id` type in version-comparison entity
4. Updated all service DTOs to use correct types

### Files Modified
- [backend/src/modules/documents/entities/document.entity.ts](backend/src/modules/documents/entities/document.entity.ts) - Fixed unit_id and uploaded_by types
- [backend/src/modules/documents/entities/document-version.entity.ts](backend/src/modules/documents/entities/document-version.entity.ts) - Fixed uploaded_by type  
- [backend/src/modules/reviews/entities/manual-review.entity.ts](backend/src/modules/reviews/entities/manual-review.entity.ts) - Fixed reviewer_id type
- [backend/src/modules/reviews/entities/version-comparison.entity.ts](backend/src/modules/reviews/entities/version-comparison.entity.ts) - Fixed compared_by_id type
- [backend/src/modules/tickets/entities/ticket.entity.ts](backend/src/modules/tickets/entities/ticket.entity.ts) - Fixed user/unit foreign keys
- [backend/src/modules/tickets/entities/ticket-comment.entity.ts](backend/src/modules/tickets/entities/ticket-comment.entity.ts) - Fixed user_id type
- [backend/src/modules/metrics/entities/metric-applicability.entity.ts](backend/src/modules/metrics/entities/metric-applicability.entity.ts) - Fixed unit_id type
- All service DTOs updated to match entity types
- [backend/src/modules/metrics/controllers/metrics.controller.ts](backend/src/modules/metrics/controllers/metrics.controller.ts) - Fixed metric_id field name

### Database
- TypeORM auto-generated schema from corrected entities
- Seed data loaded successfully with proper relationships
- All foreign key constraints working

## ⚠️ Known Limitations

### Redis Not Available
- XAMPP doesn't include Redis
- Bull Queue (background jobs) will not function
- Document processing jobs (text extraction, metric computation) won't run automatically
- **Workaround**: Metrics can still be computed via manual API call to `/api/documents/:id/metrics`

### File Upload Storage
- Files will be saved to `/uploads` directory
- Ensure directory exists and has write permissions
- Preview generation may require additional setup

## 🔧 Environment Variables
Current [backend/.env](backend/.env) configuration:
```
DATABASE_HOST=localhost
DATABASE_PORT=3306
DATABASE_USER=root
DATABASE_PASSWORD=
DATABASE_NAME=rictms_compliance

JWT_SECRET=your-secret-key-here
JWT_EXPIRATION=1h
JWT_REFRESH_EXPIRATION=7d

REDIS_HOST=localhost
REDIS_PORT=6379

PORT=4000
```

## 📝 Logs
- Backend logs: Console output from `npm run start:dev`
- Database queries: Visible in console when `synchronize: true`
- Error logs: Check TypeORM connection errors for schema issues

---

**Setup completed successfully!** Backend is running with full database schema and sample data. Ready for frontend integration and testing.
