# Database initialization order

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
