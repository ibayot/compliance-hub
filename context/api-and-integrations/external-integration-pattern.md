---
id: CORE-API-AND-INTEGRATIONS-EXTERNAL-INTEGRATION
status: baseline
scope: api-and-integrations
owner: application-maintainers
---

# External Integration

## Guidelines
API-EXT-001 MUST document provider, permitted data, trust, credentials, quota, contract/version, and failure ownership.

## Why
A provider's failure or schema change should not silently corrupt local workflows.

## Structure
~~~text
domain -> adapter -> allowlisted provider
       -> validated projection -> controlled local effect
failure -> safe degraded state or explicit rejection
~~~

## Implementation
Use sandbox/test accounts when available. Separate verified provider facts from local assumptions. For email/webhooks, define verification, duplicate handling, delivery status, and reconciliation.

## Rules
API-EXT-002 MUST validate callbacks and remote content before use.
API-EXT-003 MUST classify retryable versus permanent failures.
API-EXT-004 MUST keep secrets server-side and bound outbound requests.
API-EXT-005 MUST document data sharing/retention when sending sensitive content to external or AI providers.

## Validation
Invalid signature, duplicate callback, provider timeout, schema mismatch, revoked credential, rate limit, and recovery.
