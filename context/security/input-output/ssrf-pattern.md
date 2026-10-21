---
id: SEC-SSRF
status: baseline
scope: security
owner: application-maintainer
triggers: ["URL import", "remote image", "webhook destination", "server fetch"]
---

# Server-side URL fetch and SSRF pattern

## Guidelines

Prefer preconfigured destinations or approved identifiers over arbitrary server-side URLs.

## Why

The server may have network reach and credentials that the submitting user does not.

## Structure

Illustrative contract; adapt identifiers to the active application.

```text
requested destination → scheme/host/port policy → resolved-address policy → bounded request without ambient secrets → validate every redirect/reconnect
```

## Implementation

Choose the application's allowed destinations and egress rules. Prevent access to disallowed internal, loopback, link-local, and metadata targets as appropriate; approved internal integrations use a separate explicit route. Disable redirects or revalidate each hop.

## Rules

- **SEC-SSRF-001** — MUST validate both destination identity and actual resolved network targets against the approved egress policy.
- **SEC-SSRF-002** — MUST bound redirects, timeouts, body size, and outbound concurrency.
- **SEC-SSRF-003** — MUST NOT forward caller-controlled credentials or internal authentication headers to arbitrary destinations.

## Validation

Use a controlled test resolver/server for redirects, mixed DNS results, blocked address classes, scheme changes, and oversized responses.

## Exceptions

Record the affected rule, scope, compensating control, owner, and review condition before deviating. A baseline does not assert that existing code is compliant.

## Related Patterns

- [trust-boundaries](../foundations/trust-boundaries.md)
- [input-validation-pattern](input-validation-pattern.md)

Reference: [OWASP Server Side Request Forgery Prevention](https://cheatsheetseries.owasp.org/cheatsheets/Server_Side_Request_Forgery_Prevention_Cheat_Sheet.html).
