# ADR-002: Historical Pause/Freeze Report Estimates

Status: accepted for the user's 2026-10-28 request to recover older pause/freeze counts and business minutes. Owner: application maintainers.

## Decision and scope

Extend CH-REPORT-005 with read-time reconstruction for authorized monthly reports. Pair historical status transitions using ticket events and status-only audit projections. Saved old pause timestamps and justifications may corroborate a missing entry when an observed exit/current explicit status supports it; an orphan justification is not a committed transition. Current typed history takes precedence. Clip older estimates at the direct recording boundary and use the existing business calendar, monthly cutoff and effective completion.

Historical timestamps can be delayed, missing or contradictory. Reconstructed values are estimates, never authoritative stored intervals. Cross-source copies of the same transition within five seconds are coalesced; rapid transitions within one source remain distinct. Same-status extensions do not create another episode. A saved completion timestamp can supply an explicitly incomplete estimated endpoint. Ordinary queue/schedule suspension never becomes an explicit Pause/Freeze.

Display supported counts/minutes even with partial history, but keep unsupported values unavailable. Distinguish Recorded, Reconstructed estimate, Incomplete, and Incomplete — reconstructed estimate in preview and print. A coherent reconstructed sequence covering the period may contribute estimated averages; incomplete sequences are excluded and eligible/estimated denominators are disclosed. Unknown history must not become an exact zero.

## Boundaries and impact

This adds no schema, background job or persisted backfill. Report generation never changes tickets, SLA credits/deadlines, corrections or audit rows. ADR-001 remains authoritative for SLA/efficiency; its rejection of audit reconstruction as exact credit history is unchanged.

Read evidence only for the already-authorized report source. Batch up to 250 IDs; restrict audit records to the Ticketing database/table and project status/time fields only. Bound each query to 20,000 evidence rows and the report to 100,000, rejecting oversized work without partial results. Unavailable optional audit history produces a visible warning and event-based fallback; required-source/database outages fail visibly. Staging/production authority is unchanged.

## Validation

Check pause/freeze transitions, corroborating duplicates, extensions, orphan justifications, missing starts/ends, current interruptions, mixed direct/legacy boundaries, corrected completion, lunch/weekends/OT, estimates/partial averages, scope/privacy, bounded reads, source outages and preview/print reconciliation. Use local-only fixtures and read-only local coverage checks; do not infer production coverage from local data.

Related: [report contract](../application/compliance-hub/ticket-report-builder.md), [ADR-001](ADR-001-ticket-pause-credits.md), CH-REPORT-003/004/005/006/007, DOMAIN-REPORT-006/007, SEC-SCOPE-001/002, DATA-QUERY-001/003/004.
