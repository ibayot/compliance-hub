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

For calculators, generators, checkers, and other configurators, make refresh semantics explicit during intake. For inexpensive local calculations, unless an explicit submit/apply workflow was selected, after the initial result, changing a valid parameter should produce the current result without requiring another Generate/Check click. For remote, costly, or externally disclosing operations, choose intentional submission or an agreed debounce model instead of automatically issuing a request on every keystroke. Random output should be regenerated once for the relevant input transition at its event/state owner, not on every unrelated render. Preserve secure randomness where required. Merely clearing the old output and re-enabling the same button does not satisfy live refresh. Never display a previous asynchronous result as if it belongs to the current input; use cancellation or stale-result guards and a clear pending state.

For submitted work, represent unresolved server prerequisites in the action's readiness state. A visible form is not evidence that its selected configuration, version or dependency has loaded. Disable or otherwise safely guard submission until the required authoritative data is available, explain unavailable/stale choices, and preserve editable inputs. A handler-only generic error is not a useful loading state. Bind asynchronous completion to the submitted value and originating record/session; later edits or navigation must not redirect that outcome to another record.

## Rules
ARCH-FE-002 MUST keep authorization authoritative on the backend.
ARCH-FE-003 MUST avoid adding framework/state libraries without a profile/decision update.
ARCH-FE-004 SHOULD extract a stable repeated contract rather than copy an entire page.
ARCH-FE-005 MUST preserve route/query/back-navigation behavior during layout changes.
ARCH-FE-006 MUST keep tool/configurator results consistent with current parameters using the accepted refresh model; default inexpensive local calculations to live refresh after the first result unless an explicit submit/apply workflow is selected, explicitly choose submission/debounce for remote or costly operations, and prevent stale asynchronous output from being attributed to new inputs.

## Validation
Check component consumers, state ownership, fetch cancellation/stale results, keyboard behavior, responsive layout, and API failure states.

Generate or calculate once, then change each relevant parameter without pressing the action again. Check the resulting value against an independent invariant (for example length, allowed characters, excluded characters, or a known arithmetic result). For an accepted submit workflow, verify the pending/stale state is explicit and the submit action produces the current result. Check rapid edits, invalid input, clear/reset, and another successful run. Delay prerequisite queries deliberately; verify submission readiness, unavailable copied versions, cross-record navigation, unmount and recovery of the original submitted payload. Inspect populated and long-content consumers using the reviewed component structure, including required wrappers and keyboard-accessible scroll regions.

For deployment/build discovery, use [client update discovery](../api-and-integrations/client-update-pattern.md). An update signal does not replace authentication or dependency readiness.
