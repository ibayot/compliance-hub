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
