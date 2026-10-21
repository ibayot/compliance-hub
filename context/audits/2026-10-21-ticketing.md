# Ticketing Context Review — 2026-10-21

Status: scoped local review, with open findings. This record is evidence, not an instruction, a release approval, or a security/compliance certification.

Later source changes supersede this snapshot: see the [prepared 1.0.25 re-audit](2026-10-21-ticketing-reaudit.md) for remediation and remaining limits. The original probes intentionally assert defects on the original source; they are not current-source acceptance tests.

## Request, scope, and revision

The requested implementation is to make Weekly Ticket Performance honor approved completion-time corrections, specifically its SLA Met/Missed breakdown. The subsequent broader ticketing review is read-only. The reported example exists only in production; it was not accessed or inspected.

Baseline: `75efd7f` (v1.0.24), plus the local SLA-count patch described below and the in-progress context library. Existing unrelated worktree changes were preserved. No commit, push, deployment, SQL execution, or production mutation was performed.

The [source inventory](2026-10-21-ticketing-inventory.json) enumerates 93 files / 40,865 lines: the ticket module, ticket/report/settings/Knowledge Base/duty/attendance/rating UI, relevant shared components and transport/auth/SSE boundaries, entrypoints, and container configuration. The [route inventory](2026-10-21-ticketing-routes.json) enumerates 130 controller handlers with guard/capability declarations. File hashes identify the reviewed inputs. Tests are excluded from source-line totals.

Enumeration is exhaustive for the listed paths; semantic review and behavioral checks are targeted/risk-based, not exhaustive for every rule, file, endpoint, or state combination. The inventories do not assert that every listed implementation passed. Inactive Laravel, Flutter, and desktop guidance was not applied.

## Implemented: corrected completion and consistent SLA counts

Observed inconsistency: ticket detail/list SLA helpers compare effective completion with `slaDeadline`; weekly scoring and other aggregates compared active hours with the current issue-type allowance. Correcting completion could therefore show Met on a ticket while its performance breakdown still showed Missed. This is a source-confirmed inconsistency, not proof of the exact production ticket's cause.

The patch centralizes completed-ticket classification in `hasMetResolvedTicketSla` in the [ticket service](../../backend/src/modules/tickets/services/ticket.service.ts):

- Effective completion is approved `resolutionTimeOverride`, otherwise original `resolvedAt`.
- With a usable saved deadline, completion at or before that deadline is Met; later is Missed.
- Legacy records without a usable deadline retain the former active-hours/allowance fallback.
- Weekly rankings, report global/type/assignee counts, resolved-breach counts, and monthly compliance use this same predicate. Existing frontend deadline-based badges need no change.
- Active business hours, credited pauses, efficiency, volume, 50/30/20 weights, authorization, and original completion/correction history are not changed.
- Corrected time already controlled weekly period membership and the resolution clock; regression checks now explicitly protect both. No data backfill is needed for this code-path fix.

Rules: CH-TICKET-003/005/006/007, DOMAIN-REPORT-001/003/004, ARCH-BE-005, QA-TEST-001/002. The domain overlay and canonical implementation map now document this distinction so later consistency work does not reintroduce the competing formula.

Local tests cover corrected-before/at/after-deadline, late recorded resolution, genuinely missed deadlines despite short active hours, no-correction fallback, unusable-deadline legacy fallback, weekly boundaries, report aggregate/ranking reconciliation, and denied capability. These are mocked-service/unit tests, not database or production acceptance tests. The week-membership check asserts the SQL predicate/parameters, not execution against MariaDB.

## Open findings — not changed by this request

Priorities indicate recommended remediation order, not evidence of exploitation. All examples use synthetic fixtures. The [probe results](2026-10-21-ticketing-probes.json) and [read-only reproducer](2026-10-21-ticketing-checks.cjs) preserve the observed behavior.

### AUD-03 — High: duty PATCH validation permits unexpected writable fields

Evidence: [duty controller](../../backend/src/modules/tickets/controllers/duty.controller.ts) lines 64, 72, 83 use `Partial<Dto>`; [duty service](../../backend/src/modules/tickets/services/duty.service.ts) line 773 merges raw body data over the loaded reservation. A runtime validation probe with the erased `Object` metatype accepts an unexpected `id` and invalid `status`; invoking the original save method with mocked authorized access saves those values instead of preserving the URL-selected ID.

Consequence: a caller who already has scheduling authority can supply properties outside the intended update contract. The saved target need not be the record loaded/checked by the URL. This is not an anonymous-access claim; a full HTTP/database exploit was not attempted.

Expected: concrete runtime update DTOs, explicit allowed-field mapping, immutable server-selected IDs, and service-side status/domain validation. Review the related log/exception PATCH paths, not only reservations. Validate unknown fields, invalid enums, alternate IDs, authorized/denied actors, and absence of unintended writes.

Rules: SEC-INPUT-001/002, TECH-NEST-DTO-001/002, ARCH-BE-002, APP-CH-002, SEC-AUTHZ-TEST-002/003. Type annotations/generics alone are not a runtime validation contract; see [Nest's validation guidance](https://docs.nestjs.com/techniques/validation).

### AUD-01 — Medium: long business-time intervals are silently truncated

Evidence: [ticket service](../../backend/src/modules/tickets/services/ticket.service.ts) line 7217 limits `calculateBusinessSeconds` to 365 loop iterations and returns the accumulated seconds without verifying it reached the end. Iterations are not days; several can be used per day.

Reproduction: January 1 to July 1, 2026, 08:00 Manila, with all dates designated office days and an 08:00–17:00 schedule excluding lunch, should total 1,448 hours; the original method returns 732. Active duration/efficiency and insight data can be understated for long tickets. The new saved-deadline classification does not repair these duration metrics. The separate deadline-calculation guard also warrants boundary testing; its failure was not independently reproduced here.

Expected: a provably progressing calculation over the complete supported interval, or an explicit failure instead of a partial total. Test long ranges, non-office days, lunch, CWW, and malformed/non-progressing schedules. Rules: DOMAIN-REPORT-001/003/004, CH-TICKET-003.

### AUD-02 — Medium: aggregate pause credit can extend past corrected completion

Evidence: [ticket service](../../backend/src/modules/tickets/services/ticket.service.ts) line 7277 subtracts all accumulated pause seconds from elapsed time through effective completion. It cannot identify which pause credits occurred after an earlier corrected completion.

Reproduction: verified work 09:00–11:00 is two active hours; a later one-hour pause before the late status update yields one reported active hour because all stored pause credit is subtracted. This is a demonstrated limitation for that fixture; no production occurrence was established. Efficiency/duration remain affected even after the SLA count patch.

Expected: establish an authoritative, historically reliable pause-interval/snapshot policy, clipping credits to effective completion. Do not invent missing historical intervals or silently alter saved deadlines. This needs a scoped design decision and tests for pause wholly before, across, and after corrected completion. Rules: CH-TICKET-003/006, DOMAIN-REPORT-001/004. No schema/history change was made.

### AUD-04 — Medium: Knowledge Base feedback accepts the wrong primitive type

Evidence: [Knowledge Base controller](../../backend/src/modules/tickets/controllers/knowledge-base.controller.ts) line 50 accepts a primitive `isHelpful` body member without a validated DTO; [service](../../backend/src/modules/tickets/services/knowledge-base.service.ts) line 545 uses its truthiness. Passing string `"false"` through the actual ValidationPipe primitive behavior and original method increments Helpful, not Unhelpful.

Expected: a concrete boolean DTO and validated article identifier; test true/false plus strings, numbers, null, missing values, and invalid identifiers through the route. Consider atomic feedback counters as a separate concurrency check. Rules: SEC-INPUT-001, TECH-NEST-DTO-001/002. The probe does not call the live route or database.

### AUD-05 — Medium: SSE transport bypasses the native API base

Evidence: [SSE client](../../frontend/src/lib/utils/useSse.ts) lines 76 and 94 uses relative `/api` token/stream URLs, unlike the native-aware [shared client](../../frontend/src/lib/api/client.ts). The checked Capacitor configuration has no remote `server.url`.

Consequence: bundled native builds can send SSE requests to their local WebView origin rather than the configured backend, preventing live ticket refresh. Source inconsistency confirmed; emulator/device behavior was not executed.

Expected: an approved shared transport/base-URL contract for SSE, preserving its short-lived connection tickets, cancellation, refresh, and cleanup. Test web same-origin and real native origin, logout, token renewal, and reconnect. Rules: APP-CH-001, API-CLIENT-001, API-SSE-001/002.

### AUD-06 — Medium: proxy total-body limit conflicts with attachment limits

Evidence: [frontend Dockerfile](../../frontend/Dockerfile) line 73 sets Nginx `client_max_body_size 10M`; [ticket controller](../../backend/src/modules/tickets/controllers/ticket.controller.ts) lines 65, 547, 625 and other upload routes accept up to five files, each up to 10 MiB. [Image selection](../../frontend/src/components/TicketImageDropzone.tsx) advertises equivalent per-file limits.

Consequence: requests allowed by the UI/API contract can be rejected at the proxy when their combined body exceeds 10 MiB. Even one exact-limit file needs multipart overhead. This is configuration-confirmed for the generated image; the deployed production proxy was not inspected.

Expected: choose explicit per-file, count, total-body, and overhead limits end to end; adjust bounded proxy limits or client/server totals together. Verify single/multiple images, correction proofs, replacement, and safe oversize errors through the actual proxy. Rules: SEC-INPUT-003, SEC-UPLOAD-001.

### AUD-07 — Medium: stale Knowledge Base search responses replace newer results

Evidence: [Knowledge Base page](../../frontend/src/app/%28app%29/operations/knowledge-base/page.tsx) line 79 publishes every completed request without an abort/current-generation check. The isolated original callback publishes an old query's results when it finishes after the newer query. The mount effect and debounced effect also both fetch the initial empty query.

Expected: one query owner keyed by current scope/query, stale-response protection, and explicit loading/error/empty states. Test responses arriving in reverse order, query clearing, failure/retry, unmount, and identity/scope changes. Rules: DS-LISTLOAD-001/002/003, QA-TEST-001. Callback race confirmed; browser-driven interaction remains untested.

## Adoption debt and follow-up checks, not additional proven exploits

- Dockerfiles use `npm install` rather than a strict frozen-lockfile install. The backend final image inherits compilers from its base and declares no non-root runtime user. Review reproducibility, image contents, volume ownership, and intended UID before hardening (CTR-DEPS-001/003, CTR-USER-001/002). No image/runtime privilege attack was tested.
- SSE reconnect/missed-event reconciliation needs an integration scenario across the gateway, ticketing emitter, and reconnecting client (API-SSE-005). A replay helper test is not proof that all cross-process disconnect gaps are recovered.
- Static hard-coded colors, `any`, and duplicated control usage are review signals, not automatically defects. No button/dropdown weighting was changed or declared inconsistent without verifying its intended variant (QA-AUDIT-004/005).
- Repository policy intentionally keeps tests local-only. New regression cases in `backend/src/modules/tickets/services/ticket-performance.spec.ts` therefore will not travel with an ordinary Git pull. Preserve/share the local verification evidence or explicitly revise that policy in a separate authorized change; it was not silently overridden here.

## Rule-family coverage and limits

| Area | Actual evidence | Not established |
| --- | --- | --- |
| Reporting and ticket SLA | Shared predicates/consumers reviewed; correction and reconciliation tests; duration probes | Production ticket values; complete historical calendar/pause correctness |
| Identity/capability/resource policy | Route/guard inventory; existing capability, ownership, cancellation, image, requester, assignment/escalation regression suites pass | Every route's live cross-unit/owner/status/disabled-user combination |
| Input validation and API contracts | DTO/pipe inspection and duty/feedback reproductions | Full HTTP fuzz/contract tests for all 130 handlers |
| Files/history/security | Content validation and attachment policy source inspection; existing replacement/privacy tests; proxy limit review | Real proxy rejection UX, scanning/isolation, orphan recovery, backup/restore |
| UI consistency/state/accessibility | Shared component/helper inventory; search race probe; lint/build | Every component/state, screenshots, keyboard/screen-reader and dark/mobile visual acceptance |
| Events/mobile/integrations | SSE/native base URL and reconnect source review; existing replay tests | Device execution, outages, end-to-end Redis/gateway recovery, live email/external AI |
| Data/containers/operations | Source/config inspection; no schema change required by patch | Clean container rebuild/start, production env, SQL repeatability, backups, load/security testing |
| Context integrity | Router/profile selection, rule IDs, local links/reachability validation | Truth of every baseline or network validation of every external reference |

These gaps are deliberately unverified, not approved exceptions or passes. This pass does not complete an exhaustive rule-by-rule conformance certification; the table defines the remaining runtime/manual acceptance work.

## Validation results

Local Windows / Node workspace, synthetic fixtures and mocked dependencies:

- Backend `npm.cmd run test -- --runInBand`: **51 suites / 554 tests passed**, including 40 tests in the expanded performance suite. The original baseline was 538 tests; this work added 16 regression cases. The sandbox first blocked Jest cache rename with EPERM and ran zero tests; the successful run used the approved outside-sandbox execution.
- Backend `npm.cmd run build`: passed.
- Frontend `npm.cmd run build`: passed. Existing Vite CJS-deprecation and large-chunk warnings remain.
- Non-fixing ESLint API scan of ticket backend glob: 64 files, 3,905 errors / 388 warnings, dominated by 3,904 formatting/line-ending reports; one other error is `no-var-requires`. The scan includes existing local test files. Lint is **not clean** and was not auto-fixed.
- Non-fixing ESLint API scan of ticket-facing UI/helpers: 19 files, zero errors / 218 warnings (174 `any`, 27 unused, 15 hook dependencies, 2 refresh-export). This is the specified scan scope, not a frontend-wide lint pass.
- `node context/audits/2026-10-21-ticketing-checks.cjs`: all seven local probes reproduced their recorded observations. These intentionally assert current defects and are not a passing-product acceptance suite.
- `node context/tools/validate-context.mjs`: final pass covers 326 Markdown documents, 1,047 rule declarations, and catalog reachability with zero errors. This checks documentation structure, not application correctness.
- Final focused rerun after readability-only edits: all 40 performance tests passed. `git diff --check` passed; Git's existing LF/CRLF conversion warnings are informational.

No production access, database migration/backfill, deployed-proxy test, browser E2E, native-device test, or release has been performed. Before a release, complete environment acceptance and the separate capability-targeted idempotent in-app changelog SQL required by AGENTS.md. Requester-visible changes additionally need their separately curated End User notes; this patch changes staff performance/report counts, not requester workflows.

## Suggested remediation sequence

1. Validate/deploy the narrowly tested SLA-count fix through the normal release process; compare the reported production ticket's effective completion, saved deadline, displayed badge, and weekly/report classification without changing its history.
2. Address duty PATCH DTO/mass-assignment protection first, with direct endpoint negatives.
3. Resolve duration guard and pause-history policy before treating efficiency as fully reconciled.
4. Align proxy upload limits and native SSE transport, then fix feedback validation and search races.
5. Complete the runtime, accessibility, and cross-scope matrices above before describing the entire ticketing implementation as compliant with its context library.
