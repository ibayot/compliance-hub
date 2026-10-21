---
id: TECH-QUERY
status: baseline
scope: "Profile-enabled TanStack Query 5 server state"
triggers:
  - "useQuery or useMutation"
  - "query key or invalidation"
  - "remote cache or user-scope transition"
---

# TanStack Query Pattern

## Guidelines

Keep remote data in the established QueryClient and make query identity reflect every input that changes the result. Use the application's shared transport for requests.

## Why

Incomplete cache keys can mix records across filters or scopes; incomplete invalidation leaves views stale after a successful mutation.

## Structure

```typescript
// Query-key factory only; it performs no request or authorization.
export const itemKeys = {
  list: (scopeId: string, page: number, search: string) =>
    ['items', 'list', { scopeId, page, search }] as const,
  detail: (scopeId: string, id: string) =>
    ['items', 'detail', { scopeId, id }] as const,
};
```

Include additional filters/sort dimensions used by the actual query. A scope dimension partitions cache; the backend still authorizes that scope.

## Store Implementation

The shared QueryClient owns cached records, freshness, and query errors. Components own transient selection, while forms own editable drafts. Use TanStack Query 5 object-form APIs compatible with the installed version. Clear or partition private cache on identity transitions, and document whether refresh can replace dirty drafts. Mutations identify affected detail/list/aggregate keys and use targeted invalidation or verified cache updates.

## Rules

- `TECH-QUERY-001` MUST include all result-changing inputs in query identity and isolate sensitive data across identities/scopes.
- `TECH-QUERY-002` MUST define affected cache refresh/update behavior for successful mutations.
- `TECH-QUERY-003` MUST NOT use a query key or frontend query enablement as authorization.
- `TECH-QUERY-004` SHOULD preserve established retry, stale-time, pagination, and cancellation behavior unless a change explicitly assesses its impact.

## Validation

Exercise filter/page changes, overlapping responses, failed requests, mutation success/failure, and account/scope changes. Verify appropriate loading versus background-refresh behavior and list/detail consistency. Check that a mutation retry cannot duplicate an unsafe side effect.

## Exceptions

A separate QueryClient needs an explicit isolation requirement and lifecycle/cleanup contract. Broad invalidation needs a concrete reason and cost assessment.

## Related

[Library router](INDEX.md), [server/form state](../frameworks/react/server-form-state-pattern.md), [Query keys](https://tanstack.com/query/v5/docs/framework/react/guides/query-keys), [query invalidation](https://tanstack.com/query/v5/docs/framework/react/guides/query-invalidation).
