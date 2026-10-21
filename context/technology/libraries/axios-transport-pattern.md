---
id: TECH-AXIOS
status: baseline
scope: "Profile-enabled Axios 1 and the established application transport"
triggers:
  - "HTTP request"
  - "Axios interceptor"
  - "session refresh or request cancellation"
---

# Axios Transport Ownership Pattern

## Guidelines

Send authenticated application requests through the canonical API client/adapter. Centralize base URL, session handling, public error normalization, and relevant request defaults.

## Why

Page-specific clients can bypass authentication cleanup, error contracts, timeouts, and network environment routing.

## Structure

```text
Pseudocode:
feature API function -> established transport adapter
-> configured Axios instance/interceptors -> authorized endpoint
response -> validated mapping -> typed feature result
failure -> canonical error category -> feature recovery
```

This structure does not create a second axios.create instance for an ordinary page.

## Store Implementation

The existing session/identity owner supplies approved credentials to the transport. The transport coordinates request lifecycle and error mapping; QueryClient owns remote cache and forms own drafts. Do not mirror authentication into feature-level stores or let every interceptor perform a competing refresh/navigation side effect.

## Rules

- `TECH-AXIOS-001` MUST reuse the established authenticated transport unless an explicitly different trust origin requires a scoped adapter.
- `TECH-AXIOS-002` MUST restrict credential attachment to approved destinations and keep sensitive request/response data out of diagnostics.
- `TECH-AXIOS-003` MUST observe failures and preserve cancellation versus actionable errors.
- `TECH-AXIOS-004` MUST assess duplicate-side-effect risk before retrying writes or replaying requests after authentication recovery.

## Validation

Exercise success, timeout/network error, canceled request, validation error, forbidden response, expired session, and concurrent authentication failures. Confirm feature requests reach the intended environment base URL and do not leak credentials to another origin.

## Exceptions

A third-party/public download request may need another adapter. Document its origin, credentials policy, timeout/cancellation, and error behavior.

## Related

[Library router](INDEX.md), [TanStack Query](tanstack-query-pattern.md), [React state ownership](../frameworks/react/component-state-pattern.md), [Axios official instance guide](https://github.com/axios/axios/blob/v1.x/docs/pages/advanced/create-an-instance.md).
