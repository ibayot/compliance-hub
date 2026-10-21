---
id: DS-UNSAVED
status: baseline
scope: design-system
triggers:
  - "dirty form"
  - "leave page"
  - "draft retention"
---

# Unsaved Changes Pattern

Baseline for scoped new or touched work after profile activation. Verify existing code before claiming conformity; documentation alone does not migrate it.

## Guidelines

Define what constitutes meaningful unsaved work and what happens on cancel, navigation, close, refresh, and record change.

## Why

Predictable draft handling avoids accidental data loss and surprising stale values.

## Structure

Illustrative framework-neutral pseudocode; verify the application implementation map before reusing or creating a component.

```text
dirty = compareNormalizedDraftToBaseline(draft, savedSnapshot)
leave -> dirty ? confirmDiscardOrContinue : proceed
```

## Store Implementation

The form owns the baseline and draft; a route guard coordinates navigation. Persist drafts only with an explicit privacy/lifecycle policy.

## Rules

- **DS-UNSAVED-001** — Dirty state MUST represent meaningful edits rather than every focus or formatting event.
- **DS-UNSAVED-002** — Successful save MUST update the baseline before subsequent navigation decisions.
- **DS-UNSAVED-003** — Discard MUST reset the intended draft without erasing unrelated work.
- **DS-UNSAVED-004** — Draft persistence MUST define identity/scope separation, expiry, sensitive-data handling, and recovery.
- **DS-UNSAVED-005** — Browser/platform unload limitations MUST be reflected in the supported workflow rather than promised away.

## Accessibility

Confirmation choices must be clear and keyboard-operable, with predictable focus return.

## Security and Permissions

Do not retain confidential drafts across users, devices, or scopes without an approved storage policy.

## Validation

Test cancel, internal navigation, close/reopen, record switch, successful/failed save, refresh behavior, and session change.

## Related Patterns

- [dialog-pattern ](../components/overlays/dialog-pattern.md)
- [confirmation-dialog-pattern ](../components/overlays/confirmation-dialog-pattern.md)
- [Active application profile](../../application/PROFILE.md)
- [Security context](../../security/INDEX.md)
