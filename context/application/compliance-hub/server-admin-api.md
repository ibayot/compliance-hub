# Account Request Integration API

This contract implements CH-TICKET-016 for the server administration consumer. It shares derived metadata through a dedicated workload credential; it does not modify tickets or execute Active Directory operations.

## Authentication and deployment

Set `SERVER_ADMIN_TICKETS_API_KEY` to a dedicated random secret of 32–512 characters. Send it in the `X-Server-Admin-Key` header, without a Bearer prefix. Missing, empty or invalid credentials return 401. A short nonempty configured key fails startup validation. Do not reuse the staff-directory key, put this key in VITE variables, URLs or logs, or grant it access to unrelated APIs.

Both Compose templates inject the key only into ticketing-service from the project-root environment. The staging Compose file is environment-managed and ignored by Git: propagate its ticketing-service environment entry, `SERVER_ADMIN_TICKETS_API_KEY: ${SERVER_ADMIN_TICKETS_API_KEY:-}`, to the actual server file; Git pull alone does not update that file. For a direct Node/monolithic deployment use its process environment. Rotate by replacing the environment-managed secret, updating the consumer and restarting the consuming service; the old key stops working. Use the existing deployment HTTPS and rate limits. The consumer owns secure credential storage and handling of exported employee IDs; no third-party or AI provider receives ticket text from this implementation.

Deploy the updated ticketing service and gateway together. No ticket schema migration or data backfill is required. The endpoint stays disabled when the key is unset. Rebuild native packages separately if distributing the release version; this integration adds no native UI behavior.

## Endpoints

- `GET /api/v1/integrations/server-admin/tickets?page=1&limit=50`
- `GET /api/v1/integrations/server-admin/tickets/{ticket_id}`
- The existing gateway alias `/api/integrations/server-admin/tickets` supports the same contract.
- Direct ticketing-service paths use `/api/integrations/server-admin/tickets`.

Only `page` (1–100000) and `limit` (1–100) are supported list query parameters. Defaults are 1 and 50. Unknown filters are rejected; callers cannot widen the status or owner scope. Ordering is creation time ascending with ticket ID as the stable tie-breaker. Follow page/limit/total until the page is empty or all eligible records have been read; this is a live queue, not a processing acknowledgment or immutable export snapshot. Poll safely; do not assume that reading a record claims or completes it.

Eligibility requires current assignment to an active account whose stored role value is `server_admin`, and ticket status `assigned` or `in_progress`. Categories are not an eligibility filter. A pending escalation to such an account does not qualify a ticket still assigned elsewhere. Acceptance transfers assignment through the normal workflow; reassignment away or a status change removes eligibility. Counts and detail reads use the same scope. Unknown or out-of-scope detail IDs return 404; malformed identifiers/pagination return 400. Database failures use the application's error response and must not be interpreted as an empty successful result.

## Response

Synthetic example:

~~~json
{
  "data": [{
    "ticket_id": "11111111-1111-4111-8111-111111111111",
    "ticket_number": "TKT-2026-0001",
    "status": "assigned",
    "emp_id": "020123",
    "emp_id_source": "description",
    "request_type": "enable",
    "requires_review": false,
    "review_reasons": []
  }],
  "page": 1,
  "limit": 50,
  "total": 1
}
~~~

The detail endpoint returns one record with the same fields. Raw Subject/Description, comments, attachments, requester/filer personal data and credentials are not returned. Responses use `Cache-Control: no-store`.

## Employee IDs

Recognize contiguous digit sequences `2` plus four or five digits, or `02` plus four digits. Do not match a substring inside a longer digit sequence. Labels are not required. Treat IDs as strings, preserving leading zeros; differently formatted strings remain distinct values.

- One distinct text ID wins over the requester's saved `staff_id`, including for proxy-filed tickets. `emp_id_source` is subject, description or subject_and_description.
- Repeated copies of the same text ID are one candidate.
- Several distinct text IDs return `emp_id: null`, `emp_id_source: null`, and `conflicting_employee_ids` in review_reasons. Do not silently choose the requester ID in this case.
- Without a text ID, use the actual requester's valid saved ID and source requester. Missing/invalid fallback returns null with missing_employee_id or invalid_requester_employee_id.

## Request types

Names are matched case-insensitively with normalized whitespace. This is an explicit mapping of the current configured category/issue names; renaming those definitions requires updating this mapping and its checks.

| Category | Issue type | Result |
| --- | --- | --- |
| Active Directory Management | Active Directory Account Creation | create |
| Active Directory Management | Active Directory Account Enable/Disable | enable or disable from Subject/Description |
| Active Directory, Global Protect or any other category | Any | Others |
| Active Directory Management | Any other issue | Others |

The combined issue accepts clear enable/re-enable/activate/reactivate and disable/deactivate wording. Missing, conflicting or negated action wording returns Others with unclear_enable_disable_action for manual review. This deterministic classifier does not claim full natural-language understanding. `requires_review` is true whenever review_reasons is nonempty. Consumers must route such records for review before using their derived fields in a downstream workflow.

## Validation

Use synthetic IDs to check key absence/rotation, assignment/status/accepted-escalation scope, count/detail agreement, pagination, conflicting/missing IDs, leading zeros, action ambiguity, response minimization and absence of ticket writes. Validate query behavior against an isolated MariaDB target; never use production records as ordinary fixtures.
