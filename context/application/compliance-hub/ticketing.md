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
- CH-TICKET-012 MUST use the same normal-day automatic-assignment eligibility gate for creation, reopening, completion pickup, verified-attendance pickup, and automatic reassignment: active account, explicit individual opt-in, matching support capability (or the union of support capabilities for an approved broad fallback), non-senior status, verified Present availability, and no duty block. Attendance eligibility alone MUST NOT qualify an assignee. Revalidate a selected assignee before persistence and exclude the actual requester. Preserve manual-assignment authority and already-assigned queue handoffs. Role labels and former roles do not grant eligibility; HR ID OFFICER can qualify through the same current capability settings as Desktop Support Junior. Declared OT days follow CH-TICKET-013/014 instead of automatic routing.
- CH-TICKET-013 MUST treat declared Overtime as optional attendance: no inferred absence or non-attendance report, and no automatic ticket assignment on that day. Keep past calendar dates locked. Snapshot the OT filing date on new tickets; do not backfill or rewrite existing tickets. A staff-filed proxy request belongs to its active staff filer; a request for the filer personally remains Open for someone else. Regular-user OT requests remain Open until acquired. Manual acquisition requires a clock-in on the original OT day, excludes the requester, retains specialized-support restrictions, and atomically permits only one winner. Original-day participants retain access to unclaimed requests afterwards. Acquired OT tickets are private to their requester, filer, assignee, ticket administrators, and explicitly authorized escalation participants; enforce the same scope on alternate reads and notifications.
- CH-TICKET-014 MUST include the OT date as an extra SLA business day only for a ticket filed and assigned on that date. Preserve configured hours, lunch, pause limits, effective-completion corrections, and ticket-specific calendar/cache isolation. Other tickets do not consume that OT date as a normal office day. Unclaimed OT requests are prioritized for eligible verified-attendance pickup on the next ordinary office day under CH-TICKET-012; no pickup during OT or a non-office day. Existing assigned queues and status transitions remain unchanged.
- CH-TICKET-015 MUST allow duty administrators to select late-clocked-in staff as immediate meeting relievers when they have valid PRESENT attendance and are within working hours. Preserve active-roster, duty-conflict, workload, and authorization checks; do not relax normal rotation's on-time rule. Overview must use the same immediate-reliever eligibility calculation and display the selected names and reason.
- CH-TICKET-016 MUST restrict the dedicated read-only account-request integration to Assigned/In Progress tickets currently assigned to an active `server_admin` account. Pending escalations never grant eligibility; accepted escalations qualify only through the resulting current assignment. This approved workload credential receives only the bounded metadata projection described in the [API contract](server-admin-api.md), including OT requests assigned to its permitted owners; it does not grant staff UI access or access to unrelated tickets. IDs in Subject/Description matching `2xxxx`, `2xxxxx` or `02xxxx` override the actual requester's saved ID; preserve leading zeros and flag distinct text IDs for manual review. Derive create/enable/disable only from the approved Active Directory Management issue mapping, with unclear enable/disable wording flagged for review; other cases are Others. Never rewrite requester identity, assignment, SLA or ticket status, and never perform account actions while serving this API.

## Implementation evidence

Monthly templates and explicit interruption analytics follow [the report-builder contract](ticket-report-builder.md), CH-REPORT-001 through CH-REPORT-007. Operational interruption history is separate from SLA credits and does not alter pause allowances or deadline rules.

- [Presentation action selector](../../../frontend/src/lib/utils/ticket-detail-actions.ts)
- [Cancellation policy](../../../backend/src/modules/tickets/services/ticket-cancellation-policy.ts)
- [Attachment policy](../../../backend/src/modules/tickets/services/ticket-attachment-policy.ts)
- [Ticket service](../../../backend/src/modules/tickets/services/ticket.service.ts)
- [Account-request integration contract](server-admin-api.md)
- [SLA summary](../../../frontend/src/lib/utils/ticket-sla-summary.ts)

## Validation

Use affected action/status matrices and direct API negatives. For layout-only work compare visibility before/after, responsive screenshots, keyboard actions, and refresh behavior. Existing helpers are evidence, not a complete policy specification.
