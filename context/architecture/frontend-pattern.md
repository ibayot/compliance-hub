---
id: CORE-ARCHITECTURE-FRONTEND
status: baseline
scope: architecture
owner: application-maintainers
---

# Frontend Architecture

## Guidelines
ARCH-FE-001 SHOULD keep route composition, reusable components, API contracts, state, and domain presentation rules separate by responsibility.

## Why
Repeated page-local logic causes visual and behavioral divergence.

## Structure
~~~text
route/page
  -> domain presentation helper
  -> shared component + theme
  -> query/form/local state
  -> shared API client
~~~

## Store Implementation
Use local state for ephemeral UI, form state for unsaved fields, server-state cache for remote records, and application context/store for truly shared client state. Derive values rather than synchronize duplicate copies.

## Rules
ARCH-FE-002 MUST keep authorization authoritative on the backend.
ARCH-FE-003 MUST avoid adding framework/state libraries without a profile/decision update.
ARCH-FE-004 SHOULD extract a stable repeated contract rather than copy an entire page.
ARCH-FE-005 MUST preserve route/query/back-navigation behavior during layout changes.

## Validation
Check component consumers, state ownership, fetch cancellation/stale results, keyboard behavior, responsive layout, and API failure states.
