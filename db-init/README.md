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
