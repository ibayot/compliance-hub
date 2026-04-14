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

## QA Acceptance Checklist
- Validate all stories with positive and negative scenarios.
- Record expected vs actual behavior per story.
- Attach evidence (screenshots/log snippets/API responses).
- Tag each failed story with severity and module owner.
- Re-test failed stories after fixes and mark closure date.
