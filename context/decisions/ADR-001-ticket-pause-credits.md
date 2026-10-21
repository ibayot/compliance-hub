# ADR-001: Ticket Pause Credits and Historical Estimates

Status: accepted for the current implementation request. Date: 2026-10-21. Owner: application maintainers.

Authority: the user requested correct pause deductions, visible pause counts, and explicitly approved tracking new intervals while labelling older corrected calculations as estimates. This does not authorize production SQL execution or deployment.

## Context

The previous ticket row stored only accumulated pause seconds. Deducting the whole aggregate from a corrected earlier completion could include later pauses. Audit-event timestamps are not a reliable replacement for actual interval boundaries; event writes are separate and sometimes asynchronous.

## Decision

Store an optional `sla_pause_ledger` JSON value on the ticket alongside the existing aggregate. The ledger records its SLA origin, unlocated legacy seconds, and new intervals with start/end and credited seconds. Credit mutations update ledger and aggregate together on the same ticket row. A changed SLA origin or inconsistent aggregate invalidates reuse of the old ledger.

Calculate active time from elapsed business time minus credited pauses clipped to effective completion. Respect the original credit cap; do not retrospectively award extra pause credit. Keep saved-deadline SLA Met/Missed classification separate. Use the same timing projection in detail, weekly ranking, and selected-period ranking UI.

For legacy unlocated credits, preserve the aggregate and show an estimate warning on corrected tickets; the pause count is unavailable rather than fabricated. This is an approved compatibility limitation, not a claim that historical timing is exact. The current configured business calendar remains the existing calculation basis; this decision does not introduce historical calendar snapshots.

## Options Considered

- Reconstruct intervals from audit status events: rejected as authoritative because exact credit boundaries and allowance snapshots are not guaranteed.
- Exclude every older corrected ticket from efficiency: offered to the user; they selected explicitly labelled estimates instead.
- Separate interval table: viable for future analytics, but a nullable ledger keeps this bounded correction within the existing ticket-row persistence owner.

## Migration and Rollback

Run the repeatable `db-init/20261021-add-sla-pause-ledger-ticketing.sql` after base ticket initialization and before starting the updated service. Its default target is staging and must be deliberately changed/verified for another environment. Do not backfill invented timestamps. Existing rows remain NULL; new credits retain old totals as legacy seconds.

The old application can ignore the extra nullable column on rollback. Retain it so rollback does not destroy captured history. SQL is intentionally environment-managed and ignored by Git.

## Validation

Unit cases cover credits wholly before, crossing, and wholly after corrected completion; caps; mixed legacy/new credits; retry deduplication; and a reset SLA origin. An isolated local MariaDB migration check applied the script twice, verified one column and unchanged pre-existing pause totals, and removed only its freshly created test database. Full duty/SLA concurrency and physical native-device acceptance are separate runtime checks, not certified here.

Related: CH-TICKET-003/006/007/009, DOMAIN-REPORT-001/003/004, DATA-TXN-001/002, DATA-SCHEMA-004/005.
