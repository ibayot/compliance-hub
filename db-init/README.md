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

Incremental SQL files are environment-managed deployment artifacts and are not
committed to Git. Before running one, verify that its `USE` statement names the
intended environment database.

For application version 1.0.17, run these local files against the Users database
in this order:

1. `20260929-add-knowledge-base-manage-capability-users.sql`
2. `20260929-add-application-changelog-v1.0.17-users.sql`

Both scripts are repeatable. The changelog script refreshes only the v1.0.17 notes
and preserves existing display and acknowledgement records.
