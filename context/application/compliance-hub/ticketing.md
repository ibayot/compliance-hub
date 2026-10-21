# Ticketing Overlay

## Guidelines and why

Ticket status, ownership, SLA, escalation, rating, cancellation, requester correction, attachments, duty, and attendance are related but distinct rules. A visual consistency edit must preserve their predicates.

## Structure and state

Controller validates/authenticates -> capability and record policy -> ticket service transaction -> audit/notifications -> response -> list/detail refresh. The backend owns ticket state; frontend presentation helpers do not grant permissions.

## Rules

- CH-TICKET-001 MUST preserve requester/filer distinction in creation, display, correction, cancellation, and attachment ownership.
- CH-TICKET-002 MUST inspect the existing policy for status-dependent actions rather than copy a visible button condition as authorization.
- CH-TICKET-003 MUST preserve SLA freeze/pause/resolution calculations during layout or wording edits.
- CH-TICKET-004 MUST preserve prior file/audit history during image replacement and authorize historical retrieval.
- CH-TICKET-005 MUST test allowed/denied capability, owner, status, and unit combinations for changed actions.
- CH-TICKET-006 MUST use the approved corrected resolution time, when present, for performance-period membership, active resolution time, SLA results, and efficiency scoring; otherwise use the recorded resolution time. A late status update must not replace the approved completion time in those calculations. Keep the original recorded timestamp and correction history intact.
- CH-TICKET-007 MUST classify completed-ticket SLA Met/Missed consistently across details, performance breakdowns, and reports using effective completion time against the saved SLA deadline (at the deadline is Met). Keep active business hours as the separate duration/efficiency input. For legacy records without a usable deadline, retain the active-hours-versus-allowance fallback; do not silently recalculate saved historical deadlines from current settings.
- CH-TICKET-008 MUST keep application-rendered duty logs immutable through generic edit/delete routes. Genuinely manual logs without an activated-coverage origin may be edited/deleted with existing duty-management authority; retain server-owned provenance and links. A meeting with active duty locks its venue, date, period, and lifecycle status; a completed/logged meeting permits purpose-only corrections and cannot be deleted. Completion uses the dedicated duty workflow, not a generic status edit.
- CH-TICKET-009 MUST preserve original pause aggregates and capture new credited pause intervals with the same ticket update. Clip known intervals to effective completion, expose pause count/duration alongside active-time calculations, and label corrected legacy totals with unknown interval history as estimates. See [pause-credit decision](../../decisions/ADR-001-ticket-pause-credits.md).
- CH-TICKET-010 MUST retain ticket filters during ordinary back/navigation within the current user's separate list scope. Explicit dashboard/deep-link intent overrides saved filters; Reset restores documented defaults. Do not store fetched tickets or credentials in filter state.
- CH-TICKET-011 MUST distinguish description attachments from visible comments in audit/notification semantics. Initial ticket images must not generate a New Comment notification or comment-unread indicator when no visible comment exists.
- CH-TICKET-012 MUST use the same automatic-assignment eligibility gate for creation, reopening, completion pickup, verified-attendance pickup, and automatic reassignment: active account, explicit individual opt-in, matching support capability (or the union of support capabilities for an approved broad fallback), non-senior status, verified Present availability, and no duty block. Attendance eligibility alone MUST NOT qualify an assignee. Revalidate a selected assignee before persistence and exclude the actual requester. Preserve manual-assignment authority and already-assigned queue handoffs. Role labels and former roles do not grant eligibility; HR ID OFFICER can qualify through the same current capability settings as Desktop Support Junior.

## Implementation evidence

- [Presentation action selector](../../../frontend/src/lib/utils/ticket-detail-actions.ts)
- [Cancellation policy](../../../backend/src/modules/tickets/services/ticket-cancellation-policy.ts)
- [Attachment policy](../../../backend/src/modules/tickets/services/ticket-attachment-policy.ts)
- [Ticket service](../../../backend/src/modules/tickets/services/ticket.service.ts)
- [SLA summary](../../../frontend/src/lib/utils/ticket-sla-summary.ts)

## Validation

Use affected action/status matrices and direct API negatives. For layout-only work compare visibility before/after, responsive screenshots, keyboard actions, and refresh behavior. Existing helpers are evidence, not a complete policy specification.
