# Ticketing Consistency Re-audit — Prepared 1.0.25

Date: 2026-10-21. Baseline: `75efd7f` plus the local 1.0.25 changes. Status: locally verified within the scope below; not deployed or certified application-wide.

This re-audit was performed after implementing the requested fixes. Its final corrective iteration tightened mixed-precision meeting-time validation, followed by another full backend test run and read-only audit. No application source was changed after that final audit. Original findings are retained in the [earlier record](2026-10-21-ticketing.md); do not treat its old defect probes as current acceptance tests.

## Scope and evidence

The [evidence snapshot](2026-10-21-ticketing-reaudit-evidence.json) records hashes for 101 listed files / 64,162 lines, including package manifests/locks and affected shared boundaries. This is a complete inventory for the listed paths, not a claim that 64,162 lines or all context rules received exhaustive semantic verification. Review focused on ticketing, duty/meeting lifecycle, management timing views, requester navigation/profile/manuals, notifications, transport, upload limits, and search/filter state.

Applicable rules include APP-CH-001/002/003, CH-TICKET-003/005 through 011, CH-ADMIN-002/003, SEC-INPUT-001/002/003, TECH-NEST-DTO-001/002, SEC-UPLOAD-001, API-CLIENT-001, API-SSE-001/002/005, DOMAIN-REPORT-001/003/004, DOMAIN-NOTIFY-001/002, DS-SEARCHFILTER-002/003/005, DS-LISTLOAD-001/002/003, DS-CONFIRM-001/002/003, FND-A11Y-001, QA-AUDIT-001/003/006/007, and QA-MATRIX-001/002. The historical pause policy is [ADR-001](../decisions/ADR-001-ticket-pause-credits.md).

## Request-to-implementation results

| Requested behavior | Result and evidence |
| --- | --- |
| Protect meeting venue during active duty | Server rechecks active coverage/relievers; venue, date, period, and status are locked. UI disables the corresponding fields. |
| Completed/logged meetings: purpose only | Server rejects other changes; purpose-only correction avoids rescheduling/reconciliation. Mocked browser verified that the submitted PATCH contains only purpose. |
| Do not delete meetings with duty history | Current-state guard rejects linked logs, completed meetings, or active duty before destructive operations. Direct negative tests assert no deletion. |
| Manual vs application-activated logs | Authorized manual logs remain editable/deletable; automatic, management-completion, and activated-coverage logs are read-only. Source/ID/link fields cannot be supplied through the public update DTO. Browser verified distinct available actions. |
| Additional lifecycle restrictions | Generic status edits cannot complete meetings or reopen cancelled meetings. The current OD cannot move a historical meeting into the future to bypass historical restrictions. Invalid/reversed/zero-length times are rejected, including mixed HH:mm/HH:mm:ss precision. |
| Full long-ticket calculations | Removed the 365-step partial return. A 181-date fixture totals 1,448 business hours; long deadlines complete. Invalid/non-progressing calculation paths fail explicitly. |
| Explain pause deductions | Shared timing explanation appears in detail, weekly breakdown, and selected-period ranking: calendar elapsed, business elapsed, credited pauses, active hours, recorded count, and applicable estimate warning. A render test checks the explanation content. |
| Clip pauses to corrected completion | New credits persist actual intervals with the ticket. Tests cover before/crossing/after completion, caps, duplicate credit attempts, legacy totals, and reset clocks. Older corrected totals remain explicitly labelled estimates per the user's choice. |
| Correct feedback Yes/No | Concrete boolean DTO and validated article ID; wrong primitive types are rejected through the validation pipe and direct service boundary. |
| Web/native live updates | Token request and stream share the configured API address. Reconnect handles visibility/online changes and invalidates affected query owners without playing a new-comment sound. An aborted request from a previous mount is not reused. Actual transport modules pass stubbed native-configured, native-emulator, and web cases, including reconnect/logout/remount cleanup. |
| 10 MiB per file | Existing five-file and 10-MiB-per-file backend/UI limits remain. Proxy body capacity is 55 MiB to accommodate all five files plus multipart overhead, not a combined 10-MiB restriction. Candidate Nginx configuration syntax passed without changing/reloading the running proxy. |
| Search must not move backward | Current-generation checks protect results and pending state; initial duplicate search was removed; failure has a persistent Retry path. Browser delivered Printer after Network and verified Network stayed visible. |
| Regular users use My Tickets | Duplicate staff Tickets navigation is hidden. Old Tickets links redirect to canonical My Tickets while retaining explicit link intent. Backend requester ownership restrictions remain in place. |
| Profile confirmation inside application | Replaced native browser confirmation with a labelled MUI dialog; browser verified cancel causes no update and confirm submits once. |
| Appropriate User Manual topics | Requester view includes Dashboard, My Tickets, Settings & Profile, and Knowledge Base when available. Staff support-management content no longer appears merely because ticket-module access exists. Verified at desktop and 390px widths. |
| New Comment notices with no visible comment | Confirmed a source path: initial images were stored as comment rows hidden from the Comments list, yet could trigger comment notifications. They now use description-attachment audit semantics, without comment-unread flags or comment notices. Normal visible comments/internal-note recipient rules are unchanged. This does not establish that every old production notice had this cause. |
| Retain filters when returning | Filters/search are session-scoped by user and list view. Ordinary navigation restores them; explicit deep links override them; Reset keeps its documented defaults. Browser verified My Tickets retention and the canonical requester route. |

## Final validation

- Backend `npm.cmd run test -- --runInBand`: **53 suites / 599 tests passed**. Successful runs used approved outside-sandbox execution because Windows sandbox cache renames failed. These are local mocked/unit tests, not a production HTTP test matrix.
- Backend and frontend `npm.cmd run build`: passed at version 1.0.25. Frontend retains Vite CJS-deprecation and large-bundle warnings.
- Isolated browser fixture: **10 scenarios passed**, 148 intercepted API requests, zero page exceptions. Real APIs, external identity/image services, and production were not used. Expected navigation-aborted requests and intentionally blocked external resources are not application test failures. Screenshots were inspected for requester manual layout and protected/manual duty-log actions.
- Read-only final audit: **22 targeted checks passed**, including shared timing render and version alignment; source hashes are in the evidence snapshot.
- Non-fixing lint on changed/new paths: backend 8 files, 1,076 formatting reports and 77 warnings, zero non-formatting errors; frontend 17 files, zero errors and 290 warnings. **Lint is not clean.** This scope differs from the earlier whole-ticket-module scan; no mass formatter/linter fix was run.
- Actual transport-module probes: configured native backend, emulator fallback, and web same-origin passed URL selection, reconnect, logout cleanup, and pending-request remount checks. This is not physical-device execution.
- Pause-ledger SQL: applied twice in a new isolated local MariaDB database; exactly one column existed, the prior 3,600-second total survived, and historical ledger remained NULL. Only that temporary test database was removed.
- Changelog SQL: applied twice against a disposable schema based on the repository's changelog DDL with current audience/title prerequisites. Seven notes, four separately curated End User notes, nonempty capability targets, original publication time, display time, and acknowledgment survived. Only the temporary test database was removed.
- Candidate Nginx server configuration: `nginx -t` passed using a unique temporary file; the file was removed. The running proxy configuration was neither replaced nor reloaded.
- Context validator and `git diff --check`: run after the final evidence/documentation update. Structural checks do not certify application behavior.

## Remaining limits and consistency debt

1. **Historical pause uncertainty is an approved variant, not repaired history.** Exact timestamps cannot be recovered from a total alone. The estimate/count-unavailable labels are intentional. Calculations retain the existing current-calendar basis, not historical calendar snapshots.
2. **Previously saved misleading notifications were not deleted or rewritten.** The known generation path is fixed going forward. Inspecting the actual production examples would be needed before any narrowly targeted historical cleanup.
3. **Physical mobile devices and rebuilt APK/iOS artifacts were not exercised.** Shared native/web logic was tested with platform stubs. A physical device must use the actual reachable public API address; `10.0.2.2` is emulator-only. Android version metadata is 1.0.25 / 10025, but no native package was built or published.
4. **Live HTTP/database lifecycle concurrency remains unverified.** Current-state checks and negative unit tests are not a proof against races between simultaneous scheduling, activation, completion, and deletion. Existing multi-write duty workflows still warrant transaction/locking/failure-injection review before making a strict concurrency guarantee. This review did not silently replace their architecture.
5. **Not every visual state or permission combination was exercised.** Keyboard labels/dialogs and selected responsive views were checked, but dark-mode/screens-reader/full route-state acceptance, all cross-unit/status matrices, provider outages, actual combined uploads through a rebuilt proxy, and production performance remain open runtime acceptance work.
6. **Formatting, type-warning, and older container-hardening debt remains.** Do not turn the 22 scoped checks or zero semantic lint errors into an application-wide compliance claim. Broader compiler/runtime-image hardening and full lint migration are separate work.
7. **Existing repository policy keeps test files local-only.** The new regression files and temporary browser/transport harnesses are therefore not delivered by an ordinary Git pull. The persisted evidence snapshot and this report remain traceable; changing the test-versioning policy requires its own authorization.

## Deployment handoff — not executed

Prepared version: backend/frontend 1.0.25; package-lock roots aligned; Android versionName 1.0.25 and versionCode 10025. Existing services/production were not rebuilt, restarted, deployed, or mutated. Only task-owned temporary dev servers were stopped.

Environment-managed files (intentionally ignored by Git):

1. `db-init/20261021-add-sla-pause-ledger-ticketing.sql` — verify its target and run **before** the updated ticketing service starts; a missing column will break entity queries. Fresh installs run it after base ticket initialization. No invented interval backfill is performed.
2. `db-init/20261021-add-application-changelog-v1.0.25-users.sql` — verify the Users target and existing changelog schema, then apply the capability-targeted staff and separately curated requester notes. Display and acknowledgment history are preserved.

Rebuild frontend/backend and the mobile bundle through the normal controlled release process. Updating only the web server does not update an installed native bundle. Both SQL defaults select staging; do not infer a production target from local defaults. Rollback can retain the additive nullable column and its captured history.
