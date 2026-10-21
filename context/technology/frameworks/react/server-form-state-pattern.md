---
id: TECH-REACT-DATA
status: baseline
scope: "React; applicable only when enabled by the application profile"
triggers:
  - "server cache"
  - "form reset"
  - "mutation"
---

# Server Cache and Form State

## Guidelines

Separate remote records from a user's editable draft and preserve the application's selected libraries.

## Why

Automatic refetches can overwrite unsaved edits when server and form ownership are mixed.

## Structure

```text
Pseudocode:
authorized query key -> server cache -> record/version
record loaded -> initialize draft once for that record
submit draft -> mutation -> validate authoritative response
success -> invalidate affected keys -> intentional draft reset
```

## Store Implementation

Query keys include record, filters, scope, and other identity dimensions used by the query. A change of authenticated identity must clear or partition sensitive cache. Define conflict handling, duplicate-submit prevention, retry semantics, and dirty-form behavior before automatic refresh.

## Rules

- `TECH-REACT-DATA-001` MUST define when a server refresh may replace an editable draft.
- `TECH-REACT-DATA-002` MUST partition or clear sensitive cached data when identity/scope changes.
- `TECH-REACT-DATA-003` MUST prevent duplicate non-idempotent submissions and invalidate all materially affected views.

## Validation

Exercise dirty drafts during refetch, slow overlapping queries, mutation rejection, identity switch, and successful list/detail refresh.

## Exceptions

Apply this baseline only to the enabled pack and affected behavior. A different implementation needs a recorded rationale and relevant validation; introducing this pattern does not authorize replacing the application's architecture.

## Related

- [Pack overview](INDEX.md)
- [Application profile](../../../application/PROFILE.md)
- [Security routing](../../../security/INDEX.md)
- [Official reference](https://react.dev/learn/choosing-the-state-structure)
