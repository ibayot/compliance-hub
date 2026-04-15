# In-House QA User Stories

**Version:** 2.0.0  
**Last Updated:** 2025  
**Scope:** Every implemented capability across all backend modules and frontend pages, derived directly from source code.

## How to Use This Document

Each story carries an ID in `[MODULE-NNN]` format. For every story, at minimum:
- Execute the **positive path** (valid inputs, correct role, expected outcome).
- Execute the **negative path** (wrong role, invalid inputs, missing data, boundary limits).

Record results in the [Acceptance Checklist](#acceptance-checklist) table at the end.

---

## Role Reference

The following roles exist in the system. QA must test each story with the exact role stated.

| Code | Description |
|---|---|
| `super_admin` | Full system access; manages users, roles, settings |
| `reviewer` | Reviews and approves documents, manages KPI/MOV data |
| `compliance_officer` | Full compliance access equivalent to reviewer |
| `section_head` | Manages staff and tickets within a division |
| `focal` | Uploads and manages documents for their unit |
| `technician` | General tech support, can view most lists |
| `technician_desktop` / `technician_it_support` | Typed tech roles for ticket assignment |
| `technician_it_staff` / `technician_desktop_staff` | Junior tech staff versions |
| `desktop_sr` / `it_support_sr` / `desktop_jr` / `it_support_jr` | Named senior/junior technician roles |
| `pantawid_ict` | Pantawid ICT support pool |
| `auditor` | Read-only compliance auditor |
| `cybersec` / `infosec` | Cybersecurity and information security roles |
| `lead_infra` / `server_admin` / `db_admin` / `network_admin` | Infrastructure-specific focal roles |
| `project_mgr` / `dev_lead` / `sqa_lead` | Project and development focal roles |
| `records_officer` / `hr_id_officer` | Administrative focal roles |
| `user` | Standard staff; submits tickets, reads own data |

---

## 1. Authentication (AUTH)

### AUTH-001 — Local Login
As any staff member, I can sign in with email and password so that I can access role-appropriate modules.
- **AC+:** Valid credentials return `accessToken` and `refreshToken`; user is redirected to the dashboard.
- **AC−:** Wrong password returns `401 Unauthorized` with a clear error message; no token is issued.

### AUTH-002 — Google OAuth Login
As a Google Workspace user, I can sign in using my institutional Google account so that I do not manage a separate password.
- **AC+:** Valid Google `idToken` returns access and refresh tokens; user lands on dashboard.
- **AC−:** Tampered or expired `idToken` returns `401`; login page stays active.

### AUTH-003 — Token Refresh
As any authenticated user, I can call `POST /auth/refresh` with a valid refresh token so that my session extends without signing in again.
- **AC+:** Valid refresh token returns a new `accessToken`.
- **AC−:** Expired or invalid refresh token returns `401`; existing session cannot be extended.

### AUTH-004 — Get Own Profile
As any authenticated user, I can call `GET /auth/me` so that I can see my full user record.
- **AC+:** Returns user object with `id`, `email`, `role`, `firstName`, `lastName`, and assigned units.
- **AC−:** Unauthenticated request returns `401`.

### AUTH-005 — Logout
As any authenticated user, I can call `POST /auth/logout` so that my local session is terminated.
- **AC+:** Returns `{ message: "Logged out successfully" }`; client clears tokens.
- **AC−:** Unauthenticated call returns `401`; server does not crash.

### AUTH-006 — Change Password
As any authenticated user, I can call `POST /auth/change-password` with current and new passwords so that I can update my credentials.
- **AC+:** Correct `currentPassword` updates the hash; subsequent login works with the new password.
- **AC−:** Wrong `currentPassword` returns `401`; password is not changed.
- **AC−:** New password same as current is rejected with a clear message.

### AUTH-007 — Re-authentication
As any authenticated user, I can call `POST /auth/reauthenticate` with my password so that sensitive UI actions can require a fresh credential check.
- **AC+:** Correct password returns a short-lived re-auth confirmation.
- **AC−:** Incorrect password returns `401`.

### AUTH-008 — Inactivity Lock (Frontend)
As a local-auth user, I see an inactivity lock screen after 15 minutes of no activity so that unattended sessions are protected.
- **AC+:** Lock screen appears; submitting correct password dismisses it and restores the page.
- **AC−:** Wrong password in lock dialog shows an inline error; user is not logged out.
- **AC−:** Lock triggers the Google sign-in flow for Google-auth users (not a password field).

---

## 2. Users and Role Management (USR)

### USR-001 — List All Users
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `GET /users` so that I can see all registered accounts.
- **AC+:** Returns full user list including name, email, role, units.
- **AC−:** `user` role calling this endpoint receives `403 Forbidden`.

### USR-002 — Create User
As a `super_admin`, I can call `POST /users` so that new staff accounts are provisioned.
- **AC+:** Valid body creates the user; response includes the new user record without the password hash.
- **AC−:** Duplicate email returns `409 Conflict`.
- **AC−:** `reviewer` calling this endpoint receives `403`.

### USR-003 — View Single User
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `GET /users/:id` so that I can inspect one account.
- **AC+:** Returns user detail for a valid `id`.
- **AC−:** Non-existent `id` returns `404`.

### USR-004 — Update User
As a `super_admin`, I can call `PATCH /users/:id` so that I can change name, role, unit assignments, or status.
- **AC+:** Changed fields persist and are returned in the response.
- **AC−:** `reviewer` calling `PATCH /users/:id` receives `403`.

### USR-005 — Delete User
As a `super_admin`, I can call `DELETE /users/:id` so that departed staff are removed.
- **AC+:** User is removed; subsequent `GET /users/:id` returns `404`.
- **AC−:** `reviewer` calling this endpoint receives `403`.

### USR-006 — Search Email
As a `super_admin`, I can call `GET /users/search-email?q=` so that I can find users when provisioning.
- **AC+:** Returns matching users for a partial email string.
- **AC−:** Empty query returns an empty array, not an error.

### USR-007 — Get Federated Users
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `GET /users/federated` so that Google-authenticated accounts can be identified.
- **AC+:** Returns users where `authProvider` = `google`.

### USR-008 — List Roles
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `GET /users/roles` so that I see all defined roles with their descriptions.
- **AC+:** Returns all role definition entries including `value`, `label`, `description`, `assignable`, `roleCode`, `technicianType`.

### USR-009 — Create Role Definition
As a `super_admin`, I can call `POST /users/roles` so that a new organizational role can be added and made assignable.
- **AC+:** New role appears in `GET /users/roles`; can be assigned to a user.
- **AC−:** Duplicate `value` returns `409`.
- **AC−:** `reviewer` receives `403`.

### USR-010 — Update Role Definition
As a `super_admin`, I can call `PATCH /users/roles/:value` so that descriptions, `roleCode`, or `technicianType` mappings can be corrected.
- **AC+:** Updated fields are reflected in subsequent `GET /users/roles`.
- **AC−:** Non-existent `value` returns `404`.

### USR-011 — Delete Role Definition
As a `super_admin`, I can call `DELETE /users/roles/:value` so that unused roles are removed from the system.
- **AC+:** Role no longer appears in the roles list.
- **AC−:** Deleting a role in active use (users assigned to it) behaves as expected (no cascade hard-delete of users).

---

## 3. Units Management (UNIT)

### UNIT-001 — List Units
As any authenticated user, I can call `GET /units` so that units are available for dropdown selection across modules.
- **AC+:** Returns all units with `id` and identifying fields.
- **AC−:** Unauthenticated request returns `401`.

### UNIT-002 — Get Single Unit
As any authenticated user, I can call `GET /units/:id` so that I can see one unit's details.
- **AC+:** Returns the unit record for a valid `id`.
- **AC−:** Invalid `id` returns `404`.

### UNIT-003 — Create Unit
As a `super_admin`, I can call `POST /units` so that new organizational units are registered.
- **AC+:** Unit is created; appears in `GET /units`.
- **AC−:** `focal` calling this endpoint receives `403`.

### UNIT-004 — Update Unit
As a `super_admin`, I can call `PATCH /units/:id` so that a unit's name or attributes are corrected.
- **AC+:** Updated unit is returned; old value is no longer present.
- **AC−:** `reviewer` calling this endpoint receives `403`.

### UNIT-005 — Delete Unit
As a `super_admin`, I can call `DELETE /units/:id` so that decommissioned units are removed.
- **AC+:** Unit no longer appears in `GET /units`.
- **AC−:** Deleting a unit that has documents or KPI entries linked to it is handled gracefully (error or cascade as designed).

---

## 4. Document Management (DOC)

### DOC-001 — Upload Document (File)
As a `super_admin`, `reviewer`, `compliance_officer`, `focal`, or `technician`, I can upload a file via `POST /documents` so that evidence is stored.
- **AC+:** File under 50 MB is accepted; response includes document record with `status: pending` → `ready` after processing.
- **AC−:** File exceeding 50 MB is rejected with a validation error.
- **AC−:** `user` role receives `403`.

### DOC-002 — Import Google Doc
As an authorized role (same as DOC-001), I can call `POST /documents/google-doc` with a Google Doc export URL so that Docs are ingested without re-uploading.
- **AC+:** Valid URL is imported and stored; document record is created.
- **AC−:** Invalid or inaccessible URL returns a descriptive error.

### DOC-003 — List Documents with Filters
As any authenticated user, I can call `GET /documents` with optional filters (`title`, `unit_id`, `document_type`, `period`, `year`, `status`, `archived`) so that relevant documents are surfaced.
- **AC+:** Filters reduce the list correctly; pagination (`page`, `limit`) works.
- **AC−:** Invalid `status` enum value is handled gracefully.

### DOC-004 — Get Document Types
As any authenticated user, I can call `GET /documents/types` so that valid document type options are available for upload forms.
- **AC+:** Returns the list of available document types.

### DOC-005 — Get Upload Options
As an authorized user, I can call `GET /documents/upload-options?period=&year=` so that only allowed document types for the current period are offered.
- **AC+:** Returns options filtered for the calling user's role/units and the given period.
- **AC−:** Missing period or year returns a validation or empty result, not a crash.

### DOC-006 — View Single Document
As any authenticated user, I can call `GET /documents/:id` so that I can inspect metadata and status.
- **AC+:** Returns the full document record including `reportorialDocType`, `unit`, `current_version`.
- **AC−:** Non-existent `id` returns `404`.

### DOC-007 — Version History
As any authenticated user, I can call `GET /documents/:id/versions` so that the full upload history is visible.
- **AC+:** Returns ordered list of versions with uploader, date, and change notes.
- **AC−:** Document with no versions returns an empty array.

### DOC-008 — Upload New Version
As an authorized role (DOC-001), I can call `POST /documents/:id/versions` to submit a revised file so that the document is updated without losing prior history.
- **AC+:** New version is created; `current_version` increments; previous version is still accessible.
- **AC−:** File exceeding 50 MB is rejected.

### DOC-009 — Download Version
As any authenticated user, I can call `GET /documents/:id/versions/:vid/download` so that I can retrieve a file locally.
- **AC+:** Correct file is streamed with `Content-Disposition: attachment`.
- **AC−:** Non-existent `vid` returns `404`.

### DOC-010 — Preview Document
As any authenticated user, I can call `GET /documents/:id/versions/:vid/preview` so that files can be viewed inline in the browser.
- **AC+:** PDF preview is returned with `Content-Disposition: inline`.
- **AC−:** Version without a generated preview returns an appropriate error.

### DOC-011 — Archive Document
As a `focal`, I can call `POST /documents/:id/archive` so that a document returned for revision can be closed and stored without deletion.
- **AC+:** Document status changes to `archived`; it remains accessible as archived.
- **AC−:** Non-`focal` role receives `403`.

### DOC-012 — Return Document for Revision
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `POST /documents/:id/return` with remarks so that the focal is notified to revise.
- **AC+:** Document status reflects the return; a review record is created with the remarks.
- **AC−:** Empty or missing `remarks` field is rejected with a validation error.

### DOC-013 — Delete Document
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `DELETE /documents/:id` so that incorrectly uploaded documents are removed.
- **AC+:** Document is soft-deleted; no longer appears in default list queries.
- **AC−:** `focal` calling this endpoint receives `403`.

### DOC-014 — Reprocess Document
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `POST /documents/:id/reprocess` so that stuck or failed processing jobs are re-queued.
- **AC+:** Document processing status resets to `processing`; eventual result is `ready` or `failed`.
- **AC−:** Calling reprocess on a `ready` document has no harmful side effect.

### DOC-015 — Document Repository View
As any authenticated user, I can call `GET /documents/repository` so that documents are browsable grouped by year and period.
- **AC+:** Returns grouped structure with year → period buckets.

### DOC-016 — Link Document to Document
As an authorized role (DOC-001), I can call `POST /documents/:id/references` to create a cross-reference to another document so that related evidence is grouped.
- **AC+:** Reference appears in `GET /documents/:id/references` for both source and target.
- **AC−:** Linking a document to itself is prevented.

### DOC-017 — Unlink Document Reference
As an authorized role, I can call `DELETE /documents/:id/references/:targetId` to remove a document-to-document link.
- **AC+:** Reference no longer appears in subsequent `GET /documents/:id/references`.

### DOC-018 — Document Assignments List
As an authorized role, I can call `GET /documents/assignments` so that submission responsibilities are visible for planning.
- **AC+:** `super_admin`/`reviewer`/`compliance_officer` can view all assignments; lesser roles see only their own.

### DOC-019 — Create Document Assignment
As a `super_admin`, I can call `POST /documents/assignments` to assign a document type/period to a user and unit.
- **AC+:** New assignment appears in `GET /documents/assignments`.
- **AC−:** `focal` receives `403`.

### DOC-020 — Update Document Assignment
As a `super_admin`, I can call `PATCH /documents/assignments/:id` to change submission frequency or filename prefix.
- **AC+:** Updated fields are persisted and returned.

### DOC-021 — Delete Document Assignment
As a `super_admin`, I can call `DELETE /documents/assignments/:id` so that outdated assignments are removed.
- **AC+:** Assignment no longer appears in the list.

### DOC-022 — Reportorial Document Types — List
As any authenticated user, I can call `GET /document-types` (optionally filtered by `unitId`) so that reportorial type options are available.
- **AC+:** All or unit-filtered types are returned.

### DOC-023 — Reportorial Document Types — CRUD
As a `super_admin`, I can create, update, and delete reportorial document types via `/document-types` endpoints so that new compliance forms can be added.
- **AC+:** CRUD operations persist correctly and are reflected in `GET /document-types`.
- **AC−:** Non-`super_admin` calling create/update/delete receives `403`.

---

## 5. Document Reviews (REV)

### REV-001 — Submit Manual Review
As a `reviewer`, `auditor`, `super_admin`, `compliance_officer`, `cybersec`, or `infosec`, I can call `POST /documents/:documentId/reviews` with decision and remarks so that document compliance is formally assessed.
- **AC+:** Creates a `manual_reviews` record; `decision` must be `compliant`, `non_compliant`, or `needs_revision`; response includes `review_id` and `reviewed_at`.
- **AC−:** Missing `decision` field returns `400`.
- **AC−:** `focal` calling this endpoint receives `403`.

### REV-002 — Get Latest Review
As an authorized user (`focal`, `technician`, `reviewer`, `auditor`, `super_admin`, `compliance_officer`, `cybersec`, `infosec`, senior technician roles), I can call `GET /documents/:documentId/reviews/latest` so that the current review status is visible.
- **AC+:** Returns the most recent `manual_review` record.
- **AC−:** Document with no reviews returns `null` or `404`, not an error.

### REV-003 — Get Review History
As the same authorized roles as REV-002, I can call `GET /documents/:documentId/reviews` so that all prior review decisions are auditable.
- **AC+:** Returns ordered list of all reviews with `decision`, `remarks`, `reviewer`, and `reviewed_at`.

### REV-004 — Version Comparison
As an authorized user, I can initiate a version comparison via `GET /documents/:documentId/comparisons` (or equivalent) so that changes between versions are highlighted.
- **AC+:** Response includes diff output or comparison metadata.
- **AC−:** Comparing a version to itself returns a valid but empty diff, not an error.

---

## 6. Document Metrics / Compliance Templates (MET)

### MET-001 — List Metric Templates
As any authenticated user, I can call `GET /metrics` so that available compliance check rules are visible.
- **AC+:** Returns all `metric_templates` with applicability and unit relations.

### MET-002 — Create Metric Template
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `POST /metrics` so that new automated document checks are defined.
- **AC+:** Template is created with `metric_type` (one of `section_check`, `keyword_check`, `property_check`, `date_check`), `rule_config`, `pass_criteria`, and `applicability`.
- **AC−:** Invalid `metric_type` enum value returns `400`.
- **AC−:** `focal` receives `403`.

### MET-003 — Update Metric Template
As the same roles as MET-002, I can call `PATCH /metrics/:id` so that template rules are corrected.
- **AC+:** Updated `rule_config` and `pass_criteria` are persisted.
- **AC−:** Non-existent `id` returns `404`.

### MET-004 — Delete Metric Template
As `super_admin`, I can call `DELETE /metrics/:id` to remove an obsolete template.
- **AC+:** Template is removed; no longer appears in `GET /metrics`.

### MET-005 — Run Metrics Against Document
As an authorized role, I can trigger metric evaluation against a document so that a numerical compliance score is calculated.
- **AC+:** Score is computed and stored as a `metric_result` linked to the document version.
- **AC−:** Document with no applicable templates returns a result of 0 or `no_templates_matched`.

---

## 7. KPI Monitoring (KPI)

### KPI-001 — List KPI Master Definitions
As a `super_admin`, `reviewer`, `compliance_officer`, `focal`, `auditor`, `technician`, or `section_head`, I can call `GET /kpi/master` so that all KPI definitions are visible (filtered to the calling user's unit if applicable).
- **AC+:** Returns list with `code`, `name`, `type`, `frequency`, `direction`, `targetValue`, `weight`, `active`.

### KPI-002 — Create KPI Definition
As a `super_admin`, `reviewer`, `compliance_officer`, or `section_head`, I can call `POST /kpi/master` so that new performance indicators are added.
- **AC+:** KPI master is created; appears in `GET /kpi/master`.
- **AC−:** Duplicate `code` returns a conflict error.
- **AC−:** `focal` or `auditor` receives `403`.

### KPI-003 — Update KPI Definition
As the same roles as KPI-002, I can call `PATCH /kpi/master/:code` so that target values, weight, or active status can be adjusted.
- **AC+:** Changes are persisted; `GET /kpi/master` reflects the update.
- **AC−:** Non-existent `code` returns `404`.

### KPI-004 — Delete KPI Definition
As a `super_admin`, I can call `DELETE /kpi/master/:code` to remove an inactive KPI.
- **AC+:** KPI no longer appears in the master list.
- **AC−:** Other roles receive `403`.

### KPI-005 — List KPI Monitoring Entries
As an authorized role (same as KPI-001), I can call `GET /kpi/monitoring` with optional filters (`periodYear`, `periodMonth`, `unitId`, `kpiMasterCode`) so that actuals vs targets are visible.
- **AC+:** Filtered entries are returned; unfiltered returns all entries visible to the calling user.

### KPI-006 — Upsert KPI Monitoring (Enter Actual)
As a `super_admin`, `reviewer`, `compliance_officer`, or `section_head`, I can call `POST /kpi/monitoring` so that actual values for a period are recorded or updated.
- **AC+:** Creates or updates a `kpi_monitoring` record for the specified period and unit.
- **AC−:** Missing required fields return `400`.

### KPI-007 — Update Monitoring Entry
As the same roles as KPI-006, I can call `PATCH /kpi/monitoring/:id` to correct a specific monitoring record.
- **AC+:** Updated `actual_value` or notes are persisted.

### KPI-008 — Lock Monitoring Entry
As the same roles as KPI-006, I can call `PATCH /kpi/monitoring/:id/lock` to finalize an entry so that it cannot be changed.
- **AC+:** Entry `locked` flag is set; subsequent update attempts are rejected.
- **AC−:** Attempting to update a locked entry returns a `409` or validation error.

### KPI-009 — KPI Dashboard Summary
As an authorized role, I can call `GET /kpi/dashboard/summary?periodYear=&periodMonth=` so that aggregated performance data is visible.
- **AC+:** Returns summary data with overall scores and by-unit breakdown.
- **AC−:** Unrecognized period values return an empty result, not a crash.

### KPI-010 — KPI Dashboard — Unit Drill-Down
As an authorized role, I can call `GET /kpi/dashboard/unit/:unitId?periodYear=&periodMonth=` so that one unit's KPI detail is visible.
- **AC+:** Returns the unit's KPI entries with actual vs target comparison.
- **AC−:** Non-existent `unitId` returns `404`.

### KPI-011 — KPI Scoring Rules
As an authorized role, I can `GET` and upsert scoring rules via `/kpi/scoring-rules` so that score band definitions are maintained.
- **AC+:** Scoring rules are returned and can be updated.

### KPI-012 — KPI Thresholds
As an authorized role, I can `GET` and upsert threshold bands via `/kpi/thresholds` so that RAG (Red/Amber/Green) indicators are configured.
- **AC+:** Threshold entries are persisted and used in dashboard scoring.

---

## 8. MOV Artifacts (MOV)

### MOV-001 — List MOV Artifacts
As a `super_admin`, `reviewer`, `compliance_officer`, `focal`, `auditor`, or `technician`, I can call `GET /mov/artifacts` with optional filters (`artifact_type`, `period_year`, `quarter`, `scope`, `unit_id`) so that MOV entries are browsable.
- **AC+:** Filtered list is returned with correct artifact records.

### MOV-002 — Get Single MOV Artifact
As the same roles as MOV-001, I can call `GET /mov/artifacts/:id` so that artifact details and Markdown content are accessible.
- **AC+:** Returns the artifact with `content_markdown` and `metadata_json`.
- **AC−:** Non-existent `id` returns `404`.

### MOV-003 — Create MOV Artifact
As a `super_admin`, `reviewer`, or `compliance_officer`, I can call `POST /mov/artifacts` so that a new MOV record is authored.
- **AC+:** Artifact is stored with `artifact_type`, `scope`, `title`, `period_year`, `quarter`, `content_markdown`, `status`.
- **AC−:** Missing required fields return `400`.
- **AC−:** `focal` or `technician` receives `403`.

### MOV-004 — Update MOV Artifact
As `super_admin`, `reviewer`, or `compliance_officer`, I can call `PUT /mov/artifacts/:id` to edit an existing artifact.
- **AC+:** Updated content and status are persisted.

### MOV-005 — Delete MOV Artifact
As the same roles as MOV-003, I can call `DELETE /mov/artifacts/:id` to remove an artifact.
- **AC+:** Artifact no longer appears in `GET /mov/artifacts`.

### MOV-006 — Get MOV Template
As any authorized role (MOV-001), I can call `GET /mov/templates` with a `TemplateQueryDto` so that a pre-filled Markdown template is returned for a given artifact type.
- **AC+:** Template with headings and placeholder fields is returned.

### MOV-007 — Get Register Columns
As any authorized role, I can call `GET /mov/register-columns` so that table column definitions for the MOV register view are available.
- **AC+:** Returns column schema used by the frontend register grid.

### MOV-008 — Generate Register Report
As any authorized role, I can call `GET /mov/reports/register?year=&quarter=` so that a consolidated period-specific register report is produced.
- **AC+:** Returns report rows for the given year/quarter; optional `scope`, `unit`, `register_type` filters narrow results.
- **AC−:** Missing `year` or `quarter` returns `400`.

---

## 9. Issuances / Regulatory References (ISS)

### ISS-001 — Create Issuance
As a `reviewer`, `auditor`, or `super_admin`, I can call `POST /issuances` so that a regulatory reference is formally entered.
- **AC+:** Returns the created issuance with `issuance_number`, `title`, `issuance_type`, compliance fields.
- **AC−:** Duplicate `issuance_number` returns `409`.
- **AC−:** `focal` receives `403`.

### ISS-002 — List Issuances
As a `focal`, `technician`, `reviewer`, `auditor`, or `super_admin`, I can call `GET /issuances` with optional filters (`authority`, `category`, `search`, `is_active`) so that relevant issuances are found.
- **AC+:** Filtered results are correct; `is_active=true` excludes superseded entries.

### ISS-003 — Get Single Issuance
As the same roles as ISS-002, I can call `GET /issuances/:id` so that full compliance detail is accessible.
- **AC+:** Returns all fields including `compliance_obligations`, `required_evidence`, `gap_summary`, `action_required`.
- **AC−:** Non-existent `id` returns `404`.

### ISS-004 — Update Issuance
As a `reviewer`, `auditor`, or `super_admin`, I can call `PUT /issuances/:id` so that issuance fields are corrected or enriched.
- **AC+:** All updated fields persist correctly.

### ISS-005 — Delete Issuance
As a `super_admin`, I can call `DELETE /issuances/:id` so that invalid entries are removed.
- **AC+:** Issuance is deleted; linked documents are unlinked (or handled per cascade setting).
- **AC−:** `reviewer` receives `403`.

### ISS-006 — Link Document to Issuance
As a `reviewer`, `auditor`, or `super_admin`, I can call `POST /issuances/:id/documents/:documentId` so that compliance evidence is associated with the regulatory requirement.
- **AC+:** Document appears in subsequent `GET /issuances/:id` response's linked documents.
- **AC−:** Linking a non-existent document returns `404`.

### ISS-007 — Unlink Document from Issuance
As the same roles as ISS-006, I can call `DELETE /issuances/:id/documents/:documentId` so that incorrectly linked evidence is removed.
- **AC+:** Document is removed from the issuance's links.

### ISS-008 — Upload Issuance Attachment (Blob)
As a `reviewer`, `auditor`, or `super_admin`, I can call `POST /issuances/:id/attachment` to upload a PDF or file blob so that the source issuance document is stored.
- **AC+:** File is accepted (up to 50 MB); stored and downloadable.
- **AC−:** File exceeding 50 MB is rejected.

### ISS-009 — Download / Preview Issuance Attachment
As the same roles as ISS-002, I can download or preview the issuance attachment blob so that the source document is accessible.
- **AC+:** Correct file is returned with appropriate content disposition.
- **AC−:** Issuance without an attachment returns `404` on the attachment endpoint.

---

## 10. Incident Management (INC)

### INC-001 — Create Incident
As any authenticated user, I can call `POST /incidents` so that security or operational events are formally recorded.
- **AC+:** Incident is created with `title`, `description`, `category`, `severity`, `status: open`, `reported_by`.
- **AC−:** Missing required fields return `400`.

### INC-002 — List Incidents
As any authenticated user, I can call `GET /incidents` so that all recorded incidents are visible.
- **AC+:** Returns all incidents; `reported_by` and `assigned_to` are populated.

### INC-003 — Get Single Incident
As any authenticated user, I can call `GET /incidents/:id` so that full incident detail is accessible.
- **AC+:** Returns the full incident record.
- **AC−:** Non-existent `id` returns `404`.

### INC-004 — Update Incident
As any authenticated user, I can call `PUT /incidents/:id` so that status, assignment, or resolution can be updated.
- **AC+:** Updated fields are persisted; `status` transitions (`open` → `in_progress` → `resolved` → `closed`) are valid.

### INC-005 — Delete Incident
As any authenticated user, I can call `DELETE /incidents/:id` so that erroneous records are removed.
- **AC+:** Incident is removed; `GET /incidents/:id` returns `404`.

### INC-006 — Incident Statistics
As any authenticated user, I can call `GET /incidents/statistics` so that aggregate counts by category, severity, and status are visible.
- **AC+:** Returns counts per combination; no crashes when data is sparse.

### INC-007 — Today's Incident Stats
As any authenticated user, I can call `GET /incidents/today-stats` so that the day's operational picture is available.
- **AC+:** Returns activity between `08:00` and `17:00` for today.

### INC-008 — Period Statistics
As any authenticated user, I can call `GET /incidents/period-stats` so that monthly or quarterly trend data is accessible.
- **AC+:** Returns aggregated stats grouped by period.

### INC-009 — Incident Snapshots
As any authenticated user, I can call `GET /incidents/snapshots/latest` or `GET /incidents/snapshots/:date` so that historical daily summaries are retrieved.
- **AC+:** Returns the snapshot record for the requested date; `latest` returns today's or the most recent snapshot.

---

## 11. Cybersecurity Metrics (CYB)

### CYB-001 — List Cybersecurity Metrics
As any authenticated user, I can query the cybersecurity metrics endpoint so that the current posture dashboard is populated.
- **AC+:** Returns all `cybersecurity_metrics` records with `metric_type`, `name`, `status`, `value`, `last_checked`.

### CYB-002 — View Single Metric
As any authenticated user, I can view a single cybersecurity metric so that detail and `api_endpoint` fields are accessible.
- **AC+:** Returns full record for a valid `id`.
- **AC−:** Non-existent `id` returns `404`.

### CYB-003 — Create / Update Cybersecurity Metric
As an authorized admin role, I can create or update cybersecurity metric records so that new check types can be added and values maintained.
- **AC+:** Created/updated metric reflects in the list.
- **AC−:** Duplicate `metric_type` (unique constraint) returns `409` on create.

### CYB-004 — Cybersecurity Metric Status Values
As a reviewer, I can verify the status values of each metric are one of `compliant`, `warning`, `non_compliant`, or `unknown` so that the status domain is enforced.
- **AC+:** Attempting to set an invalid status value returns `400`.

---

## 12. Ticketing — Core (TKT)

### TKT-001 — Create Ticket
As any authenticated user, I can call `POST /tickets` so that a support request is formally submitted.
- **AC+:** Ticket is created with an auto-generated `ticketNumber` (`TKT-YYYY-NNNN`), `status: open`, `priority: null` initially.
- **AC−:** Missing `subject` or `description` returns `400`.

### TKT-002 — List Tickets (Role-Scoped)
As any authenticated user, I can call `GET /tickets` so that I see tickets appropriate for my role (own tickets for `user`, all for `super_admin`).
- **AC+:** `user` only sees their own tickets; `reviewer`/`super_admin` see all tickets.
- **AC+:** Filters `status`, `ticketType`, `requesterId`, `assignedToId`, `escalatedToMe` work as expected.

### TKT-003 — View Single Ticket
As any authenticated user, I can call `GET /tickets/:id` so that full ticket detail with comments and escalations is accessible.
- **AC+:** Returns ticket with `comments`, `category`, `assignedTo`, `satisfactionRating`.
- **AC−:** Non-existent `id` returns `404`.

### TKT-004 — Update Ticket
As an authorized role, I can call `PATCH /tickets/:id` to change `status`, `priority`, `resolutionNotes`, or `freeze` the ticket.
- **AC+:** Status transition is valid; `user_closed` flag is set only by the requester.
- **AC−:** `user` can only update their own ticket; updating another user's ticket returns `403`.

### TKT-005 — Assign Ticket
As a `super_admin`, `focal`, `section_head`, `reviewer`, or technician role, I can call `PATCH /tickets/:id/assign` to assign the ticket to a technician and set SLA deadline.
- **AC+:** `assignedToId` is set; `slaDeadline` is calculated from `category.slaHours`; status moves to `assigned`.
- **AC−:** Assigning to a non-technician user returns a validation error.

### TKT-006 — Mark Ticket Viewed (Auto Progress)
As an assigned technician, I can call `PATCH /tickets/:id/mark-viewed` so that the ticket automatically transitions from `assigned` to `in_progress` when I first open it.
- **AC+:** Status changes from `assigned` → `in_progress` when called by the assigned technician.
- **AC−:** Calling on an already `in_progress` ticket is idempotent.

### TKT-007 — Ticket Events Timeline
As any authenticated user, I can call `GET /tickets/:id/events` so that every status change, assignment, comment, and escalation is auditable.
- **AC+:** Returns ordered events with `event_type`, actor, and timestamp.

### TKT-008 — Add Comment
As an authorized role, I can call `POST /tickets/:id/comments` so that communication and progress notes are recorded on the ticket.
- **AC+:** Comment is persisted with `author`, `body`, and `created_at`.
- **AC−:** Empty `body` is rejected with `400`.

### TKT-009 — Submit Satisfaction (CSAT)
As any authenticated user (ticket requester), I can call `POST /tickets/:id/satisfaction` to submit the client satisfaction form so that service quality is tracked.
- **AC+:** `satisfactionRating`, `satisfactionComment`, and full `satisfactionFormData` (JSON) are stored.
- **AC−:** Submitting satisfaction on a ticket that already has a rating is rejected or handled gracefully.

### TKT-010 — Escalate Ticket
As an authorized role, I can call `PATCH /tickets/:id/escalate` with `EscalateTicketDto` so that unresolved tickets are routed to next-level support.
- **AC+:** A `ticket_escalation` record is created; ticket events reflect the escalation.

### TKT-011 — Return Escalation
As an authorized role, I can call `PATCH /tickets/:id/return-escalation` with `ReturnEscalationDto` so that escalations are resolved and control returns to original assignee.
- **AC+:** Escalation record is closed; ticket events timeline is updated.

### TKT-012 — Mark Ticket as Duplicate
As an authorized focal/tech/admin, I can set a ticket's status to `duplicate` and point `duplicateOfId` to the original so that redundant tickets are collapsed.
- **AC+:** Status becomes `duplicate`; `duplicateOfId` is set; original ticket is unaffected.
- **AC−:** Pointing a ticket to a non-existent ticket returns `404`.

### TKT-013 — Freeze Ticket
As an authorized role, I can set a ticket's status to `freeze` so that tickets awaiting parts or external response are halted without closing.
- **AC+:** Status becomes `freeze`; ticket can be un-frozen by updating status.

### TKT-014 — User Self-Close
As a `user` requester, I can close my own ticket (`userClosed: true`) so that resolved issues initiated by me are removed from active queues.
- **AC+:** Ticket receives `userClosed: true`; excluded from technician operational statistics.

### TKT-015 — Ticket Statistics
As a `reviewer`, `super_admin`, `focal`, `section_head`, `compliance_officer`, `cybersec`, or `infosec`, I can call `GET /tickets/statistics` so that operational counts are available for management.
- **AC+:** Returns totals by `status` and `ticketType`.

### TKT-016 — Technician Availability
As an authorized role, I can call `GET /tickets/technicians` so that available technicians are listed for assignment.
- **AC+:** Returns list of technician users with availability status.

### TKT-017 — Dashboard Stats (User-Scoped)
As any authenticated user, I can call `GET /tickets/dashboard` so that my personalized ticket summary is shown.
- **AC+:** Returns open, pending, and resolved counts scoped to the calling user's role.

### TKT-018 — Assigned Stats (Monthly)
As any authenticated user, I can call `GET /tickets/assigned-stats?year=&month=` so that monthly performance for tickets assigned to me is visible.
- **AC+:** Returns counts for the specified month; defaults to current month if not provided.

### TKT-019 — Ticket Reports (Satisfaction)
As a `super_admin`, `focal`, `section_head`, `reviewer`, or senior tech role, I can call `GET /tickets/reports` with period filters so that satisfaction data and resolution rates are reported.
- **AC+:** Returns aggregated satisfaction scores by technician, type, and period.
- **AC+:** Filters `year`, `month`, `quarter`, `semester`, `technicianId`, `ticketType` each work independently.

### TKT-020 — Open Tickets for Requester (Duplicate Picker)
As an authorized focal/tech/admin, I can call `GET /tickets/requester/:requesterId/open` so that existing open tickets for a requester are displayed before creating a possible duplicate.
- **AC+:** Returns only open tickets for the given requester.

---

## 13. Ticket Settings (TKTS)

### TKTS-001 — List Categories
As any authenticated user, I can call `GET /ticket-settings/categories` so that category options are available for ticket creation and settings views.
- **AC+:** Active categories by default; `?all=true` returns all (including inactive) for admin views; `?ticketType=` filter works.

### TKTS-002 — Get Category
As a settings role, I can call `GET /ticket-settings/categories/:id` so that category detail including `slaHours` is visible.
- **AC+:** Returns the category record.
- **AC−:** Non-existent `id` returns `404`.

### TKTS-003 — Create Category
As a `super_admin` or tech admin role, I can call `POST /ticket-settings/categories` to add a new ticket category with SLA hours.
- **AC+:** Category appears in subsequent list.
- **AC−:** Missing `name` or `slaHours` returns `400`.

### TKTS-004 — Update Category
As a settings role, I can call `PATCH /ticket-settings/categories/:id` to change category details.
- **AC+:** Updated `slaHours` is used for new ticket assignments immediately.

### TKTS-005 — Delete Category
As a settings role, I can call `DELETE /ticket-settings/categories/:id` to remove a category.
- **AC+:** Category no longer appears in active list; existing tickets retain the category reference (or `null`, per cascade).

### TKTS-006 — Keyword Rules CRUD
As a settings role, I can manage keyword rules via `GET`, `POST`, `PATCH`, `DELETE` on `/ticket-settings/keyword-rules` so that incoming ticket auto-categorization is maintained.
- **AC+:** Creating a rule with matching keywords causes tickets containing those words to be auto-categorized.
- **AC−:** Missing `pattern` or `category_id` returns `400`.

### TKTS-007 — Issue Types CRUD
As a settings role, I can manage issue types so that tickets can be classified by problem type in addition to category.
- **AC+:** Created issue types appear in ticket creation dropdowns.

### TKTS-008 — Escalation Focal Config CRUD
As a settings role, I can manage escalation focal configurations so that tickets escalated beyond front-line support are routed to the correct focal person.
- **AC+:** Created config maps ticket types to focal users; escalations follow the config.

### TKTS-009 — SMTP Email Test
As a `super_admin`, I can call `POST /ticket-settings/email-test` to verify the SMTP configuration is working.
- **AC+:** Test email is received at the configured address; response confirms delivery attempt.
- **AC−:** `reviewer` calling this endpoint receives `403`.

---

## 14. Technician Attendance (ATT)

### ATT-001 — Get Technician Attendance
As a `super_admin`, `reviewer`, `section_head`, or senior tech/focal role, I can call `GET /attendance` with `date`/`technicianId` filters so that daily attendance per technician is visible.
- **AC+:** Returns attendance records with `status` (present, absent, half-day, etc.) for the query.

### ATT-002 — Set Technician Attendance
As a focal/senior role, I can call `POST /attendance` with `SetAttendanceDto` to mark a technician present or absent for a specific date.
- **AC+:** Record is persisted; repeated calls on the same date update rather than duplicate.

### ATT-003 — Bulk Set Attendance
As the same roles, I can call `POST /attendance/bulk` with `BulkSetAttendanceDto` to set attendance for multiple technicians at once.
- **AC+:** All records in the bulk payload are created or updated correctly.
- **AC−:** Partial failures (e.g., invalid technician IDs) are reported per-item without rolling back valid entries.

### ATT-004 — Delete Attendance Record
As the same roles, I can call `DELETE /attendance/:id` to remove an incorrect attendance entry.
- **AC+:** Record is removed; attendance query no longer shows it.

### ATT-005 — Get Office Days
As any authorized role, I can call `GET /attendance/office-days` to see which dates are designated as working days.
- **AC+:** Returns the calendar with office day flags.

### ATT-006 — Set / Toggle Office Day
As an office-day management role, I can call `POST /attendance/office-days` with `SetOfficeDayDto` to mark a date as an office day or holiday.
- **AC+:** Date flag is updated; attendance SLA calculations use the new calendar.

### ATT-007 — Bulk Set Office Days
As the same roles, I can call `POST /attendance/office-days/bulk` with `BulkSetOfficeDaysDto` to configure a range of calendar dates at once.
- **AC+:** All dates in the bulk payload are set correctly.

---

## 15. Gateway and Service Health (GW)

### GW-001 — API Gateway Health
As an operator, I can call `GET /api/health` so that the status of all three microservices is visible in one response.
- **AC+:** Returns `{ users: "ok"|"error", ticketing: "ok"|"error", compliance: "ok"|"error" }`.
- **AC−:** If a service is down, the gateway still responds; the affected service flag shows `"error"`.

### GW-002 — Unauthenticated Request Rejection
As an attacker, calling any protected endpoint without a token returns `401` so that unauthenticated access is blocked.
- **AC+:** Every endpoint under `/api/**` (except `/api/auth/login`, `/api/auth/refresh`, `/api/auth/google-login`) returns `401` without a token.

### GW-003 — Cross-Service JWT Acceptance
As a frontend client, the same `accessToken` issued by the users service is accepted by requests proxied to compliance and ticketing services so that users authenticate only once.
- **AC+:** A token that works on `/api/documents` also works on `/api/tickets` without re-login.

### GW-004 — Service Restart Recovery
As an operator, I can restart one service container while the other two remain running so that maintenance is scoped.
- **AC+:** After restart, the restarted service resumes processing within its normal startup time.
- **AC+:** The other two services do not crash or produce errors during the restart window.

---

## 16. Data Integrity (DI)

### DI-001 — Bounded Database Ownership
As an operator, compliance data persists in `compliance_hub`, user accounts in `compliance_hub_users`, and ticketing data in `compliance_hub_ticketing` so that domain boundaries are enforced.
- **AC+:** Verify via DB tool or logs that documents, KPI, MOV, incidents, issuances are only in `compliance_hub`; users/roles are only in `compliance_hub_users`; tickets/categories/attendance are only in `compliance_hub_ticketing`.

### DI-002 — Foreign Key Integrity on Deletion
As an operator, deleting a user does not orphan their documents or tickets (either cascade or `SET NULL` as designed).
- **AC+:** After deleting a user, related document `uploaded_by` is `SET NULL` (or cascaded) without database errors.

### DI-003 — Unique Constraint Enforcement
As any user, attempting to create a duplicate issuance number, ticket number, or user email returns a `409` so that natural keys are protected.
- **AC+:** Backend enforces uniqueness before inserting; no duplicate rows in the database.

### DI-004 — Concurrent Version Upload
As two users uploading different versions of the same document simultaneously, only one version is accepted and the other is rejected or serialized so that data consistency is not violated.
- **AC+:** `current_version` counter reflects the correct final number; no version gaps.

---

## 17. Non-Functional Requirements (NFR)

### NFR-001 — Page Load Under Load
As a user, navigating between modules responds within 3 seconds on a standard network so that the system is usable.
- **AC+:** All frontend routes render within 3 seconds on the deployment network.

### NFR-002 — File Upload Performance
As a user, uploading a 10 MB document completes within 30 seconds so that the system is not perceived as broken.
- **AC+:** Upload and processing complete within the time limit.

### NFR-003 — Docker Compose Startup
As an operator, running `docker compose --profile microservices up -d` brings all 7 containers to a healthy state within 2 minutes so that deployment is repeatable.
- **AC+:** All containers show `healthy` or `running` status in `docker compose ps` after startup.

### NFR-004 — Token Expiry Enforcement
As an attacker, using an expired access token returns `401` so that token replay attacks are mitigated.
- **AC+:** Expired tokens are rejected; valid tokens within their window are accepted.

### NFR-005 — HTTPS / Reverse Proxy
As an operator, all traffic in production is routed through HTTPS so that credentials and tokens are not transmitted in plaintext.
- **AC+:** Direct HTTP access either redirects to HTTPS or is blocked at the infrastructure level.

---

## 18. Edge Cases and Boundary Tests (EC)

### EC-001 — Upload Exactly 50 MB File
As a user, uploading a file of exactly 50,000,000 bytes is accepted so that the boundary limit is correctly applied.
- **AC+:** 50 MB file is accepted; 50,000,001 bytes is rejected.

### EC-002 — KPI Period with No Data
As a reviewer, viewing the KPI dashboard for a period with no monitoring entries shows zero values or an empty state, not a crash.
- **AC+:** Response is a valid structure with empty/zero values.

### EC-003 — Ticket Created by Deleted User
As an operator, a ticket whose `requesterId` references a deleted user (cascade deleted) is handled gracefully in list queries.
- **AC+:** Query does not crash; deleted user fields appear as `null`.

### EC-004 — Inactivity Lock Precise Timing
As a local-auth user, the lock triggers at exactly 15 minutes (not sooner, not significantly later) so that the timer is reliable.
- **AC+:** Lock appears within ±30 seconds of the 15-minute mark.

### EC-005 — Concurrent Login from Two Devices
As a user, logging in from a second device generates a new token without invalidating the first device's session (unless the system explicitly enforces single-session).
- **AC+:** Behavior conforms to the session policy documented in `SECURITY.md`.

### EC-006 — Review Remarks with Special Characters
As a reviewer, submitting review remarks containing Unicode characters, quotes, or HTML entities does not corrupt the stored data.
- **AC+:** Retrieved remarks are identical to what was submitted; no XSS injection escapes.

### EC-007 — Empty KPI Monitoring List
As a user, calling `GET /kpi/monitoring` when no entries exist returns an empty array, not `null` or an error.
- **AC+:** Response body is `[]`.

### EC-008 — MOV Artifact with Null Quarter
As a reviewer, creating a MOV artifact with `quarter: null` (annual scope) is accepted.
- **AC+:** Artifact is stored; `quarter` column is `NULL` in the database.

### EC-009 — Ticket with No Category
As any user, creating a ticket without selecting a category is accepted (category is nullable).
- **AC+:** Ticket is created with `categoryId: null`; no SLA deadline is set.

### EC-010 — Return Document Without Remarks
As a reviewer, attempting to return a document without providing `remarks` is blocked.
- **AC+:** `POST /documents/:id/return` with empty `remarks` returns `400 Bad Request`.

---

## Acceptance Checklist

Use this table to log each story as it is validated. One row per story per test execution.

| Story ID | Scenario | Steps Performed | Expected Result | Actual Result | Pass/Fail | Evidence | Tester | Date | Severity (if Fail) |
|---|---|---|---|---|---|---|---|---|---|
| AUTH-001 | Positive | Login with valid credentials | 200 + tokens returned | | | | | | |
| AUTH-001 | Negative | Login with wrong password | 401 Unauthorized | | | | | | |
| AUTH-002 | Positive | Google login with valid idToken | 200 + tokens returned | | | | | | |
| AUTH-003 | Positive | Refresh with valid refresh token | 200 + new accessToken | | | | | | |
| AUTH-006 | Positive | Change password with correct current | Password updated | | | | | | |
| AUTH-007 | Positive | Re-authenticate with correct password | Confirmation returned | | | | | | |
| AUTH-008 | Positive | Inactivity lock after 15 min | Lock screen appears | | | | | | |
| USR-002 | Positive | Create user as super_admin | User created | | | | | | |
| USR-002 | Negative | Create user as reviewer | 403 Forbidden | | | | | | |
| UNIT-003 | Negative | Create unit as focal | 403 Forbidden | | | | | | |
| DOC-001 | Positive | Upload 10 MB file as focal | Document created | | | | | | |
| DOC-001 | Negative | Upload 60 MB file | 413 / validation error | | | | | | |
| DOC-012 | Negative | Return document with empty remarks | 400 Bad Request | | | | | | |
| REV-001 | Positive | Submit compliant review as reviewer | Review record created | | | | | | |
| REV-001 | Negative | Submit review as focal | 403 Forbidden | | | | | | |
| KPI-006 | Positive | Upsert monitoring entry | Entry created/updated | | | | | | |
| KPI-008 | Positive | Lock monitoring entry | Locked flag set | | | | | | |
| KPI-008 | Negative | Attempt to update locked entry | 409 / validation error | | | | | | |
| MOV-003 | Positive | Create MOV artifact as reviewer | Artifact created | | | | | | |
| ISS-001 | Positive | Create issuance as reviewer | Issuance created | | | | | | |
| ISS-006 | Positive | Link document to issuance | Document linked | | | | | | |
| ISS-008 | Positive | Upload issuance attachment | File stored | | | | | | |
| INC-001 | Positive | Create incident | Incident created, status=open | | | | | | |
| TKT-001 | Positive | Create ticket as user | Ticket created, TKT-YYYY-NNNN | | | | | | |
| TKT-005 | Positive | Assign ticket to technician | Status=assigned, SLA set | | | | | | |
| TKT-009 | Positive | Submit CSAT on resolved ticket | Rating stored | | | | | | |
| TKT-019 | Positive | Get ticket reports with year filter | Satisfaction report returned | | | | | | |
| TKTS-009 | Negative | Send email test as reviewer | 403 Forbidden | | | | | | |
| ATT-002 | Positive | Mark technician present | Attendance record created | | | | | | |
| ATT-006 | Positive | Toggle office day | Date flag updated | | | | | | |
| GW-001 | Positive | GET /api/health | All three services reported | | | | | | |
| GW-002 | Negative | Request without token | 401 on protected endpoint | | | | | | |
| EC-001 | Boundary | Upload exactly 50 MB | Accepted | | | | | | |
| EC-001 | Boundary | Upload 50 MB + 1 byte | Rejected | | | | | | |
| EC-010 | Negative | Return document, empty remarks | 400 Bad Request | | | | | | |

## Authentication and Session
1. As a user, I can sign in with valid credentials so that I can access my unit-specific modules.
2. As a user, I am rejected when my password is invalid so that unauthorized access is prevented.
3. As a user, I can refresh my session token so that I stay logged in securely.
4. As a user, I am required to re-enter my password after 15 minutes of inactivity so that unattended sessions cannot be misused.
5. As a Google-authenticated user, I am asked to sign in again when inactivity lock occurs so that provider-specific authentication is respected.
6. As a user, I can log out so that local tokens and session state are cleared.
7. As an authenticated user, I can view my profile information so that I can verify account details.

## Authorization and Unit Access
1. As an admin, I can access admin-only actions so that role-based control is enforced.
2. As a non-admin user, I cannot access admin-only actions so that sensitive operations are protected.
3. As a user assigned to a unit, I can only access permitted unit data so that cross-unit data leakage is prevented.

## Dashboard and Navigation
1. As a user, I can open the dashboard after login so that I can see system status at a glance.
2. As a user, I can navigate between modules from the sidebar so that I can perform operational tasks quickly.
3. As a user, page title and layout context update correctly during navigation so that page state remains clear.

## Documents Module
1. As a compliance user, I can upload documents so that evidence is stored centrally.
2. As a compliance user, I can preview supported files so that I can validate content before review.
3. As a compliance user, I can download documents so that I can work on approved artifacts offline.
4. As a compliance user, I can filter/list documents so that I can locate files efficiently.

## Reviews Module
1. As a reviewer, I can create and update review records so that assessments are tracked.
2. As a reviewer, I can view review history so that prior decisions are auditable.
3. As a reviewer, I can associate reviews with units/documents so that traceability is maintained.

## Ticketing and Incidents
1. As an operations user, I can create tickets so that issues are formally tracked.
2. As an operations user, I can update ticket status so that workflow progression is visible.
3. As an operations user, I can view assigned/open tickets so that workload can be managed.
4. As an operations user, I can log incidents so that security/compliance events are recorded.

## KPI and Metrics
1. As a manager, I can view KPI values so that organizational performance can be monitored.
2. As a manager, I can view metrics trends so that changes over time are visible.
3. As a manager, I can access attendance-related KPI data so that attendance compliance is measurable.

## MOV and Cybersecurity
1. As a compliance user, I can create and track MOV records so that mandatory obligations are monitored.
2. As a cybersecurity user, I can view cybersecurity entries so that risk posture can be reviewed.
3. As a cybersecurity user, I can manage cybersecurity records according to permissions so that governance remains controlled.

## Units and Users Administration
1. As an admin, I can create and maintain units so that organization structure is current.
2. As an admin, I can create and maintain users so that onboarding/offboarding is controlled.
3. As an admin, I can assign users to units/roles so that least-privilege access is enforced.

## API Gateway and Service Reliability
1. As a frontend user, I receive clear service-unavailable feedback when a backend service is down so that failures are understandable.
2. As an operator, I can query gateway health to see users/ticketing/compliance service status so that outages are diagnosed quickly.
3. As an operator, strict microservice mode blocks degraded routing when dependencies fail so that inconsistent behavior is minimized.

## Data Integrity and DB Ownership
1. As an operator, users data persists in compliance_hub_users so that bounded-context ownership is enforced.
2. As an operator, ticketing data persists in compliance_hub_ticketing so that ticketing services remain isolated.
3. As an operator, compliance and units data persist in compliance_hub so that compliance domain ownership is preserved.
4. As an operator, compatibility views continue to resolve expected cross-context references so that existing reads do not break.

## Non-Functional Stories
1. As an operator, I can deploy split services from one backend codebase so that operational scaling is possible.
2. As an operator, I can restart one affected service without stopping all services so that maintenance is safer.
3. As an operator, I can validate container health quickly using compose and gateway health endpoints so that release checks are repeatable.

## Session Inactivity Edge Cases
1. As a local-auth user, I am locked after exactly 15 minutes of inactivity so that the timeout is precise and not affected by clock drift.
2. As a local-auth user, any valid activity (mouse move, keypress, API call) resets the 15-minute inactivity timer so that active users are not interrupted.
3. As a local-auth user, submitting an incorrect password on the inactivity unlock dialog shows a clear error and does not log me out so that I can retry.
4. As a Google-auth user, the inactivity lock triggers the Google sign-in flow (not a password dialog) so that provider-specific authentication is respected.
5. As a user, closing and reopening the browser tab while locked requires re-authentication so that unattended sessions cannot be resumed without credentials.

## Document Workflow Edge Cases
1. As a focal user, uploading a document with a filename that does not match the expected pattern for the selected reportorial document type results in a clear validation error so that naming conventions are enforced at upload time.
2. As a reviewer, returning a document with empty remarks is blocked by the system so that focal users always receive actionable feedback.
3. As a focal user, a returned document shows the return remarks prominently and the document status is `needs_revision` so that the correction requirement is unambiguous.
4. As a reviewer, a document marked `compliant` transitions to `ready` status immediately so that the workflow state is consistent.
5. As a focal user, I cannot delete a document that is linked to an issuance so that reference integrity is preserved.

## Microservice Resilience Stories
1. As a frontend user, when the compliance service is unavailable, pages requiring compliance data show a service-unavailable panel instead of an unhandled error so that partial outages are gracefully handled.
2. As a frontend user, sidebar navigation items scoped to a down service are hidden automatically so that users are not led to broken pages.
3. As an operator, restarting a single microservice restores its functionality without requiring a restart of sibling services so that maintenance is targeted.
4. As an operator, the gateway health check endpoint (`GET /api/health`) returns individual service flags for users, ticketing, and compliance so that the affected service can be identified without checking each port manually.

## QA Acceptance Checklist

### Story Coverage
- Each user story in this document must be validated with at least one positive scenario (happy path) and one negative scenario (failure/boundary case).
- Stories that cannot be tested in the current environment must be explicitly deferred with a documented reason.

### Evidence Requirements
For each story tested, record the following:
| Field | Description |
|---|---|
| Story ID | Module + sequential number (e.g., Auth-3) |
| Scenario | Positive or Negative |
| Steps Performed | Numbered list of exact steps taken |
| Expected Result | What the system should do |
| Actual Result | What the system actually did |
| Pass / Fail | Outcome |
| Evidence | Screenshot filename, log snippet, or API response excerpt |
| Tester | Name of person who validated |
| Date | Date of validation |
| Severity (if Fail) | Critical / High / Medium / Low |
| Module Owner | Team member responsible for the module |

### Defect Handling
- All failed stories must be logged as defects with the severity and module owner filled in.
- Defects rated Critical or High must be resolved before the release is marked QA-cleared.
- After a fix is deployed, the story must be re-tested and the re-test date must be recorded alongside the original failure date.
- Re-tested stories that pass are marked Closed with the closure date.

### Regression Baseline
Before each release, the following minimum regression checks must pass:
1. Backend build completes without error (`npm run build` in `backend/`).
2. Frontend build completes without error (`npm run build` in `frontend/`).
3. Backend unit tests pass (`npm run test` in `backend/`).
4. Gateway health check returns all services healthy (`GET /api/health`).
5. Login succeeds for at least one account of each role: `super_admin`, `reviewer`, `focal`, `user`.
6. Documents module loads and at least one document is listed without a 500 error.
7. Tickets module loads and ticket creation succeeds.
8. KPI dashboard loads without NaN or unhandled error state.

### Non-Functional Acceptance Criteria
- All API responses for authenticated endpoints return `401 Unauthorized` when called without a valid token.
- All write endpoints for privileged operations (`users`, `metrics`, `kpi master`, `reviews`) return `403 Forbidden` when called by a role that does not have write access.
- Uploading a file larger than the configured limit returns a `413 Payload Too Large` response.
- The inactivity lock triggers at or before 15 minutes of inactivity on all tested browsers (Chrome, Firefox, Edge).
