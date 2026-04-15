# In-House QA User Stories

## Scope
These user stories are intended for internal QA validation of currently implemented capabilities in Compliance Hub.

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
