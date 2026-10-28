# Context Changelog

This log records changes to the context organization. It is separate from the application release changelog because documentation-only context changes do not change requester-visible behavior.

## 2026-10-27 — Shared guidance and runtime/reporting lessons

- Compared the earlier application context against the separate library 0.4.1; brought forward selected discovery, runnable-handoff, debugging/testing, UI-quality, engine, dependency and integration guidance, preserving local activation and history.
- Promoted reusable lessons into library 0.5.0: real application/database readiness versus disposable tests; explicit operator/artifact handoff; evidence boundaries; effective event/cohort and missing-history metrics; configurable report scope/readability/export; established identifiers; safe pre-capture diagnostics; and bounded session-aware client updates.
- Added focused report-builder and client-update patterns and local MASTER routes. Kept Compliance Hub business rules, schema names, account formats, exact timers, role/capability choices and implementation bindings local.
- Retained the existing validator and local no-committed-test/audit/evidence policy (APP-CH-008). Library-managed routing, manifests, tools and test harness are intentionally not adopted here; no receipt or complete-library-synchronization claim is made.
- Scoped the local validator to exclude its known ignored `audits/` evidence root, while retaining failures for unlinked normative guidance and leaving historical audit files untouched.
- This maintenance changed context/instructions only; it did not modify application code, schema, release version or running services. Context validation is separate from application acceptance.

## 2026-10-21 — Ticketing SLA semantics and context maintenance

- Made generated audit records, test runners, and diagnostic outputs local-only; retained reusable context guidance and runtime audit functionality.
- Added CH-TICKET-006/007 to distinguish effective completion, saved-deadline SLA classification, and active-time efficiency.
- Linked the shared completed-ticket classification from the canonical implementation map.
- Recorded actual enforcement/validation rather than claiming the context library certifies all existing code.
- Added the user-requested duty lifecycle, pause-estimate, filter-retention, and attachment-notification rules (CH-TICKET-008 through 011), with ADR-001 for the approved historical pause policy.

## 2026-10-20 — Initial context organization

- Added the selective `MASTER.md` routing model.
- Added the active Compliance Hub application profile.
- Added a neutral profile template and copying/intake instructions for future applications; inactive stacks remain available as conditional reference packs.
- Added governance, UI, domain, architecture, security, data, API, technology, platform, container, infrastructure, quality, delivery, workflow, inventory, decision, exception, and template context.
- Added consistency-audit and canonical-implementation maps to reduce repeated discovery during audits.
- Added a read-only Node validator for local links, catalog reachability, rule/document IDs, rule strength, code fences, and AGENTS routing.
- Kept the context tree visible through narrow Git and Codex ignore exceptions.
- Recorded implementation adoption and enforcement as unverified where no scoped evidence exists; writing these standards does not claim application-wide conformance.
