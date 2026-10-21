---
id: TECH-ROUTER
status: baseline
scope: "Profile-enabled React Router 6 and the existing route configuration"
triggers:
  - "route or navigation"
  - "URL parameters or search state"
  - "route guard or return location"
---

# React Router Navigation Pattern

## Guidelines

Use the existing router and route hierarchy. Keep durable shareable navigation state in the URL when the workflow requires linking or browser restoration.

## Why

Ad hoc location changes and hidden navigation state can break deep links, history, filters, and return paths.

## Structure

```tsx
import { Link } from 'react-router-dom';

export function ItemLink({ id }: { id: string }) {
  return <Link to={`/items/${encodeURIComponent(id)}`}>View item</Link>;
}
```

The route is illustrative; use the application's actual route constants and canonical navigation component. Encoding a route segment does not authorize access to the record.

## Store Implementation

The router owns location/history and declared URL parameters. Components/forms own transient drafts; the server cache owns loaded records. Parse and validate route/search values before using them. Define whether page/filter state should survive back navigation and keep a safe same-application return location after login.

## Rules

- `TECH-ROUTER-001` MUST preserve direct navigation, reload, and back/forward behavior for changed routes.
- `TECH-ROUTER-002` MUST validate route/search values and enforce record authorization on the backend.
- `TECH-ROUTER-003` MUST NOT introduce a competing router or assume data-router APIs exist in a BrowserRouter application.
- `TECH-ROUTER-004` SHOULD preserve intended focus, unsaved-change behavior, and safe return navigation when routes change.

## Validation

Test direct URL entry, refresh, back/forward with filters, malformed IDs, unauthorized records, expired-session return, and dirty-form navigation. Use APIs supported by the installed React Router 6 minor.

## Exceptions

Embedding a separately owned sub-application needs an explicit routing/base-path/history contract.

## Related

[Library router](INDEX.md), [web semantics/navigation](../../platforms/web/semantic-navigation-pattern.md), [React Router 6 concepts](https://reactrouter.com/6.30.1/start/concepts).
