# Database initialization order

## For release 1.1.1 (from application version 1.1.0)

There is no schema migration for this release. Rebuild/recreate Users, Ticketing, Compliance, Gateway and frontend together so the shared application version and staff-photo projection are aligned. Then apply `20261109-add-application-changelog-v1.1.1-users.sql` to the verified Users database so release notes match the deployed version. The file defaults to the local/staging-named Users schema; replace its `USE` target with the verified production Users schema before execution. Rebuild Android separately only if distributing a native package. The local Docker Users database is updated during implementation; staging/production SQL execution remains operator-managed. The SQL file is ignored by Git, so copy it separately; a Git pull does not deliver it. For a rollback to 1.1.0 during the 1.1.1 display window, redeploy the 1.1.0 images and set the 1.1.1 `app_releases.status` to `draft` in Users; preserve its release notes and delivery/acknowledgment rows.

## For release 1.1.0 (from application version 1.0.37)

Verify the Users schema target, then apply `20261105-add-ui-preferences-users.sql` before starting the updated Users service. This additive migration is repeatable and preserves existing user data. Apply `20261109-add-application-changelog-v1.1.0-users.sql` to Users to publish the curated staff and End User notes. No Ticketing schema change is required for this release. Rebuild Users, Ticketing and frontend together; rebuild the Android application separately if distributing a native package. The local Docker Users database already has `ui_preferences`, and the 1.1.0 notes are applied during implementation. Staging/production SQL execution remains operator-managed. These SQL files are ignored by Git and must be copied separately; a Git pull does not deliver them.

For **1.0.37**, apply `20261105-add-application-changelog-v1.0.37-users.sql` to the verified Users database for the staff and separate End User notes. No new schema is required. The existing enabled unit restriction now also gates application access and OTP/recovery email. Review saved active units before rollout; active accounts with persisted `isSecuritySettingsAccess` retain application access and security emails regardless of selection, while routine mail still requires selected units. Existing unapproved sessions are rejected on API requests; live connections recheck within 20 seconds plus bounded policy time. Rebuild/recreate Users, Ticketing, Compliance, gateway and frontend together: the private approval endpoint is a required dependency, with unavailable policy failing closed. Preserve internal service credentials and URLs. Test Override Email redirects permitted security messages only. Local release notes are applied during implementation; staging/production execution remains operator-managed. SQL and diagnostic/test artifacts remain outside Git. Older images remove this access gate; use existing account activation controls before any security rollback.

For **1.0.36**, apply `20261105-add-application-changelog-v1.0.36-users.sql` to the verified Users database for the staff and End User notes. No new schema is required; retain the earlier ticket-unit snapshot prerequisite. The explicit Sync Units from UMS action replaces manual selections and clears their tags for valid matched active accounts, while automatic runs keep manual tags even when UMS agrees. Role/unit restrictions, active-record checks, ambiguity handling and audit rollback remain enforced. After an explicit sync clears a tag, future automatic runs follow UMS unless a new manual choice is made. Rebuild/recreate services and frontend together; the force action requires the new explicit confirmation payload, so older cached pages must refresh before syncing. Local notes are applied during implementation, while staging and production updates remain operator-managed. SQL and diagnostic/test evidence remain outside Git.

For **1.0.35**, apply `20261105-add-application-changelog-v1.0.35-users.sql` to the verified Users database for the staff and End User notes. No new schema change is required; retain earlier prerequisites. Deploy the updated services and frontend together. MFA failures now return a structured classification/message, while the frontend also handles legacy JSON-string errors during rollout. The third incorrect code closes verification and returns to login; locked accounts receive a clear notice. The existing nine-failure accumulation and 15-minute lock/unlock behavior are unchanged. Local Docker notes are applied during implementation; staging and production remain operator-managed, with SQL kept outside Git.

For **1.0.34**, apply `20261105-add-application-changelog-v1.0.34-users.sql` to the verified Users database for the staff and End User notes. There is no new schema change; retain earlier prerequisites and the Users-to-Ticketing address described below. Rebuild/recreate the application services and frontend so the old duplicate email listeners are removed from memory. The MFA page adds a protected 60-second resend flow; only the newest code works and the existing attempt/lockout limits and original sign-in deadline remain in effect. Local Docker release notes are applied during implementation; staging and production remain operator-managed. SQL and disposable verification evidence remain outside Git.

**1.0.33 standalone staging configuration:** `docker-compose.staging.yml` is intentionally ignored by Git, so pulling the main Compose update does not change that server file. Under `services.users-service.environment`, add `TICKETING_SERVICE_URL: http://ticketing-service:4102` alongside the existing entries and preserve the internal service-token configuration. Recreate Users with the usual staging Compose/environment-file arguments; a restart alone does not apply a new environment value. Omitting this URL makes Users fall back to localhost inside its own container, causing the MFA policy read to fail with HTTP 503. This configuration correction requires no SQL or application rebuild when the 1.0.33 service images are already deployed. Outbound email must still be enabled for emailed login MFA; routine recipient-unit restrictions do not block security OTPs.

For **1.0.33**, no new schema change is required. Apply `20261104-add-application-changelog-v1.0.33-users.sql` to the verified Users database for the staff and End User notes; earlier prerequisites below remain required. Deploy the updated Users and Ticketing services together with the frontend and the Users `TICKETING_SERVICE_URL` Compose setting. Users reads only the protected outbound-email-enabled flag from Ticketing during sign-in; do not remove internal service-token configuration. Temporary MFA Mode displays codes in the application; otherwise enabled outbound email uses emailed MFA, and both off skips MFA. Preserve existing trusted-device and explicit VAPT behavior. SMTP/policy failures are errors rather than a signal to bypass MFA. The local application database is updated during implementation; staging and production execution remains operator-managed.

For hotfix **1.0.32**, retain the 1.0.31 schema prerequisites below and apply `20261104-add-application-changelog-v1.0.32-users.sql` to the verified Users database for the staff and separate End User release notes. No additional schema change is needed. Rebuild/deploy the updated services and frontend together. Authentication/recovery and feedback verification mail now honors Test Override Email, even when its mailbox is outside the routine-email unit selection. Clearing that setting restores normal security-mail destinations. Routine unit filtering and the system-wide email kill switch remain effective. Local Docker is updated; production execution is operator-managed, and the SQL remains ignored by Git.

For release **1.0.31** (2026-11-04), assuming the 1.0.30 prerequisites are already applied:

1. Pause ticket writes and personnel-unit changes. Verify both schema references and apply `20261104-add-ticket-requester-unit-snapshot-ticketing.sql` to Ticketing. It captures current units as a rollout baseline and preserves existing ticket fields/timestamps.
2. Verify the Users target and apply `20261104-add-outbound-email-unit-controls-users.sql`. The restriction remains off until configured; reapply preserves saved choices.
3. Apply `20261104-add-application-changelog-v1.0.31-users.sql` to Users for capability-scoped staff notes and separately curated End User notes. Reapply preserves publication windows and acknowledgments.
4. Rebuild/deploy all application services and frontend together so versions, ticket snapshots, MFA behavior and the private email-policy endpoint agree. Preserve JWT/cookie/service credentials and persistent volumes. Resume writes after readiness checks, then configure allowed units in Security Settings when desired. Rebuild the native bundle separately if distributing mobile.

All three scripts have been prepared for the verified local Docker schemas and remain environment-managed/ignored by Git. A pull alone does not deliver them. Staging/production execution remains the operator's responsibility; change the supplied schema names to the actual targets before execution. Retain additive columns on rollback; older senders do not enforce the email policy, so stop outbound email before reverting them while the restriction is active. Already transferred historical units cannot be reconstructed by the ticket baseline.

For the pending manual unit-sync / historical ticket-unit change, apply `20261104-add-ticket-requester-unit-snapshot-ticketing.sql` **before** deploying the updated Ticketing service, Users service and frontend. Verify both the Ticketing `USE` target and the Users schema references; the supplied defaults are the staging-named schemas on the local Docker engine. Pause ticket writes and unit changes during migration/deployment. Fresh installs apply it after the base Users/units/access and Ticketing tables.

The repeatable migration captures current requester units on older tickets as a rollout baseline, in batches of 500, without changing existing ticket fields or update timestamps. Existing snapshots, including no-unit snapshots, survive repeats and subsequent personnel transfers. It does not reconstruct earlier transfers. Local Docker has been updated; staging/production remain operator-managed. The SQL is ignored by Git, so a Git pull will not deliver it. Retain the additive JSON column during rollback.

For the pending outbound-email controls, apply `20261104-add-outbound-email-unit-controls-users.sql` to the verified Users schema before deploying Users, Ticketing and frontend together. Fresh installs apply it after `security_config` exists. This additive repeatable migration defaults the restriction off, initializes empty unit selections and preserves saved values on repeat. Local Docker has been updated; staging/production execution remains operator-managed, and Git pull does not deliver this ignored SQL file. Existing service-to-service authentication must remain configured for the private delivery-decision endpoint. Routine email is suppressed if its policy cannot be verified; OTP/recovery is exempt from unit filtering and routine notification toggles, while `EMAIL_ENABLED` remains the master kill switch. SMTP tests and routine test-override destinations obey the unit restriction. Retain the new fields on rollback; disable outbound email before running older senders if the policy is active, because older code does not enforce it.

Run the dated seed files in this order against the staging database server:

1. `20260827-seed-02_db_stg_compliance_hub_users.sql`
2. `20260827-seed-02_db_stg_compliance_hub_ticketing.sql`
3. `20260827-seed-02_db_stg_compliance_hub.sql`

Each file creates/selects its own database with `CREATE DATABASE IF NOT EXISTS` and
`USE`. The users seed intentionally excludes the local Docker `vw_rictms_clock_in`
base table because staging/production provide that object as a view. The ticketing
seed retains the current roster memberships, assignments, meeting reservations, and
ticket-routing reference data, while transactional ticket data is empty.

## Incremental release updates

### Existing production 1.0.27 to 1.0.30

Do not rerun the base seeds. After the normal database backup, verify each script's `USE` target against the actual production Users or Ticketing schema; the distributed scripts currently name local/staging schemas. Apply this ordered set before starting the updated application services:

1. **Ticketing schema:** `20261027-add-ticket-report-builder-ticketing.sql` (adds nullable interruption history and personal report templates).
2. **Users release notes:** `20261026-add-application-changelog-v1.0.28-users.sql`.
3. **Users release notes:** `20261027-add-application-changelog-v1.0.29-users.sql`.
4. **Users release notes:** `20261027-add-application-changelog-v1.0.30-users.sql` (includes the latest report corrections and presentation changes).

These are the only new database prerequisites after a fully upgraded 1.0.27 installation. They are environment-managed files ignored by Git: copy them separately from the prepared local artifacts. Repeated application preserves tickets, existing publication windows and acknowledgment history. Rebuild the frontend and backend service images together after applying the schema update. For the optional account-request integration, configure `SERVER_ADMIN_TICKETS_API_KEY` through the deployment environment and pass it only to Ticketing; leave it unset to keep the integration disabled. Keep existing JWT secrets and database/Redis volumes stable. Production execution remains the operator's responsibility.

Local application updates are part of implementation readiness (APP-CH-007). Apply reviewed required increments to the verified running local Docker database, preserving existing data, and validate the affected localhost workflow before handoff. Disposable database validation is additional evidence. Rebuilding application containers does not apply incremental SQL to an existing database volume. Verify the actual database host and service-selected schema; a schema name containing `stg` can also exist inside the local Docker database and does not identify a remote environment by itself. Staging and production updates remain user-managed unless explicitly authorized.

For prepared version **1.0.30**, after the 1.0.29 prerequisites, verify the Users target and apply `20261027-add-application-changelog-v1.0.30-users.sql`. There is no new schema change. The implementer applies the notes to the verified local Docker database; staging/production remain user-managed. Rebuild the frontend and Users/Ticketing services for report layouts, scoped staff names, Staff ID validation and reduced update polling. Existing records and credentials do not require a backfill or password reset. The SQL remains ignored and must be delivered separately for remote environments. Native packaging/printing requires separate acceptance.

For prepared version **1.0.29**, after the 1.0.28 prerequisites:

1. Verify the Ticketing target in `20261027-add-ticket-report-builder-ticketing.sql`, then apply before starting the updated ticketing service. Fresh installations apply after the base schema and previous upgrades. The repeatable additive update preserves existing tickets and SLA credits; it creates personal templates and nullable actual-interruption history without inventing old intervals.
2. Verify the Users target and apply `20261027-add-application-changelog-v1.0.29-users.sql`. It preserves publication/acknowledgment history and targets ticket report capability. No requester-visible workflow changed, so no separate End User note is published.
3. Rebuild backend/frontend images together. If distributing mobile, rebuild its bundle separately; native-device print/PDF behavior requires acceptance checks. These SQL files are ignored environment artifacts, not delivered by Git pull, and have not been applied to production.

See the [monthly report contract](../context/application/compliance-hub/ticket-report-builder.md) for exact metrics, current-assignment/calendar semantics, historical limitations and bounded report size. Retain additive storage on rollback. Older application writers do not capture new interruption transitions; affected periods cannot subsequently be assumed complete without a deliberate capture-gap review.

For prepared version **1.0.28**, after the 1.0.27 prerequisites:

1. Set the dedicated `SERVER_ADMIN_TICKETS_API_KEY` in the project-root Compose environment (or direct-process environment), using a separate random 32–512-character secret. The templates pass it only to ticketing-service. Leaving it unset keeps the integration disabled. The staging Compose file is ignored by Git; add its ticketing-service environment entry `SERVER_ADMIN_TICKETS_API_KEY: ${SERVER_ADMIN_TICKETS_API_KEY:-}` to the actual server configuration separately.
2. Rebuild release images to align displayed versions; ticketing-service and gateway must be updated together for the new read-only route. No ticket migration or backfill is needed. See the [integration contract](../context/application/compliance-hub/server-admin-api.md) for authentication, examples, eligibility, pagination and review flags.
3. Verify the Users database target and apply `20261026-add-application-changelog-v1.0.28-users.sql`. This local-only environment artifact preserves existing publication/acknowledgment history. The release changes no requester UI workflow, so no separate End User note is published.

Rollback by disabling the dedicated key and rolling back the application images; there is no integration-owned ticket data to undo. SQL/configuration have not been applied to production. Git pull does not deliver the ignored release-note SQL file.

For prepared version **1.0.27**, after the 1.0.26 prerequisites:

1. Verify the Users target in `20261026-add-idle-lock-minutes-users.sql` and apply it before deploying the updated Users service. The additive, repeatable migration defaults existing and new configurations to 15 minutes without overwriting a configured value on repeated apply. Fresh installs apply it after the Users base schema.
2. Verify the Users target and apply `20261026-add-application-changelog-v1.0.27-users.sql`. Reapplying preserves publication dates and acknowledgment history and supplies separate End User notes.
3. Rebuild the backend/frontend and rebuild the native bundle if distributing the mobile application. These SQL files are environment-managed and local-only; Git pull does not include them. They have not been applied to production.

The new duration controls the existing client screen lock, not token lifetime. Existing sessions refresh it within a minute while running and on returning to the application; locked sessions remain locked. Retain the additive column during rollback: older clients continue using their fixed 15-minute limit. No data reset or backfill is needed.

This release also corrects session recovery during service restarts. Deploy the Users service fix and frontend together: temporary renewal failures return 503, while actual invalid/revoked credentials still return 401. The frontend retries verification only inside protected routes and waits for service readiness before a build refresh. Keep existing JWT signing secrets, issuer/audience and cookie names stable across routine deployments; retain durable database/revocation data. Do not regenerate credentials or recreate volumes as a deployment step. Users already at the login screen sign in normally once; the update does not resurrect signed-out sessions. No production configuration has been changed or verified by this preparation.

For prepared version **1.0.26**, after the 1.0.25 prerequisites:

1. Verify the target database in `20261026-add-overtime-routing-ticketing.sql` and apply it before deploying the updated ticketing service. This repeatable additive migration adds OT calendar and ticket provenance fields; no historical tickets are backfilled or reassigned.
2. Verify the Users target and apply `20261026-add-application-changelog-v1.0.26-users.sql` for the capability-targeted and separately curated End User release notes. Existing acknowledgments are preserved.
3. Rebuild the backend/frontend, and rebuild the native bundle separately if distributing the mobile application. These environment-managed SQL files are local-only, not delivered by Git pull. They have not been applied to production.

OT calendar dates remain locked in the past. Retain the additive columns to preserve provenance. Once OT tickets exist, older builds do not enforce their restricted visibility: a rollback requires an OT-compatible access-control fix or blocking access to those records. Do not deploy before applying the migration.

For the prepared application version **1.0.25**, after the normal 1.0.24 prerequisites:

1. Verify the target database in `20261021-add-sla-pause-ledger-ticketing.sql`, then run it against Ticketing **before** starting the updated ticketing service. Fresh installs run it after the base ticket schema. Existing totals are retained without inventing historical intervals.
2. Verify the Users target in `20261021-add-application-changelog-v1.0.25-users.sql` and apply the capability-targeted staff and separate End User notes. Reapplying preserves publication and acknowledgment history.
3. Rebuild/update the backend and frontend. Rebuild the native mobile application with its actual public `VITE_API_URL`; updating the web server alone does not update an installed native bundle. Do not use the Android emulator address for a physical device.

The schema is additive. An older application can ignore the nullable pause-ledger column on rollback; retain it so captured history is not lost. These scripts are environment-managed and ignored by Git. They have not been run against production.

Incremental SQL files are environment-managed deployment artifacts and are not
committed to Git. Before running one, verify that its `USE` statement names the
intended environment database.

For application version 1.0.17, run these local files against the Users database
in this order:

1. `20260929-add-knowledge-base-manage-capability-users.sql`
2. `20260929-add-application-changelog-v1.0.17-users.sql`

Both scripts are repeatable. The changelog script refreshes only the v1.0.17 notes
and preserves existing display and acknowledgement records.

For application version 1.0.18, run these local files in this order:

1. Run `20260930-add-manual-rating-invitations-ticketing.sql` against the Ticketing database.
2. Run `20260930-add-application-changelog-v1.0.18-users.sql` against the Users database.

Both scripts are repeatable. The ticketing migration creates the restricted rating-invitation,
ticket-snapshot, and access-event tables. The changelog script refreshes only the v1.0.18 notes
and preserves existing display and acknowledgement records.
