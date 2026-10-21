# Context Changelog

This log records changes to the context organization. It is separate from the application release changelog because documentation-only context changes do not change requester-visible behavior.

## 2026-10-21 — Ticketing SLA semantics and scoped audit evidence

- Added CH-TICKET-006/007 to distinguish effective completion, saved-deadline SLA classification, and active-time efficiency.
- Linked the shared completed-ticket classification from the canonical implementation map.
- Added a [dated ticketing audit](audits/2026-10-21-ticketing.md), source hashes, controller-handler inventory, isolated reproductions, open findings, and explicit coverage limits.
- Recorded actual enforcement/validation rather than claiming the context library certifies all existing code.
- Added the user-requested duty lifecycle, pause-estimate, filter-retention, and attachment-notification rules (CH-TICKET-008 through 011), with ADR-001 for the approved historical pause policy.
- Added the [1.0.25 implementation re-audit](audits/2026-10-21-ticketing-reaudit.md) and current source/check evidence, explicitly superseding the affected older snapshot without erasing its history.

## 2026-10-20 — Initial context organization

- Added the selective `MASTER.md` routing model.
- Added the active Compliance Hub application profile.
- Added a neutral profile template and copying/intake instructions for future applications; inactive stacks remain available as conditional reference packs.
- Added governance, UI, domain, architecture, security, data, API, technology, platform, container, infrastructure, quality, delivery, workflow, inventory, decision, exception, and template context.
- Added consistency-audit and canonical-implementation maps to reduce repeated discovery during audits.
- Added a read-only Node validator for local links, catalog reachability, rule/document IDs, rule strength, code fences, and AGENTS routing.
- Kept the context tree visible through narrow Git and Codex ignore exceptions.
- Recorded implementation adoption and enforcement as unverified where no scoped evidence exists; writing these standards does not claim application-wide conformance.
