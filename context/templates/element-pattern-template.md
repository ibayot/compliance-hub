# Element Pattern Template

Metadata: unique ID, status, scope/triggers, owner, active framework/version, canonical component, review date, enforcement.

## Guidelines
Purpose, use when, do not use when, and expected hierarchy.

## Why
Usability, consistency, accessibility, security, and maintenance rationale.

## Structure
Illustrative pseudocode; replace with a verified sample before describing it as a real component:
~~~text
Element(
  controlledValue,
  allowedOptions,
  disabledReason,
  validation,
  onChange,
  accessibleLabel
)
~~~
Document anatomy, props/events, composition, and styling tokens.

## Store Implementation
Choose explicitly: local UI state, form state, shared client state, server/cache state. Describe derived values, initialization, reset, persistence, cleanup, scope change, and concurrency. A global store is optional, not mandatory.

## Rules
Declare stable rule IDs. Specify hierarchy, data flow, permitted variants, and behavioral invariants.

## Variants
Primary/supporting/destructive, single/multiple, searchable/static, read-only/disabled, and platform-specific variants only where meaningful.

## State Matrix
Initial/empty, focus/hover, editing/selected, loading/submitting, success, validation error, remote error, denied, disabled/read-only.

## Accessibility
Label, name/role/value, keyboard, focus order/restoration, announcements, contrast, target size, and zoom.

## Security and Permissions
Allowed data/options, backend enforcement, redaction, untrusted content, and ownership.

## Responsive Behavior
Width, wrapping, touch/keyboard differences, overflow, and preservation of action hierarchy.

## Errors and Recovery
What is retained, retried, cancelled, reset, or reconciled.

## Examples and Anti-Examples
Minimal valid usage and a concrete failure mode.

## Exceptions
Link approved scoped departures.

## Validation
Types, focused behavior, accessibility, visual/responsive variants, and representative consumers.

## Related Patterns
Link exact supporting patterns.
