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

Documentation research is contract discovery, not evidence that the application's request works. Check the actual endpoint, protocol, field selection, response shape, credentials, quota, and error semantics. Verify the intended execution boundary: browser CORS and CSP/connect policy; server runtime egress, timeout, and deployment-only headers; bundled SDK version and exports where used. Use deterministic success/failure fixtures, plus a minimal non-sensitive live request when authorized and feasible. Never silently switch to a paid tier, expose a secret, disable browser protections, or replace production results with mock success to pass a check. If a live check is unavailable, identify that boundary as unverified.

When a product offers more than one external provider, maintain an application-owned catalog with explicit provider identity and state. Catalog metadata is not a dynamic plugin loader: allowlisted endpoints, request versions, features, and execution boundaries remain controlled by the application.

Owner-facing setup forms must follow each provider's current official authentication documentation. Keep credential fields separate from non-secret project/account/workspace identifiers and managed request configuration. Clearly distinguish required, optional, and conditional fields. A candidate form is not evidence that a provider is selected, configured, eligible, approved, or enabled.

For features that depend on hosting-injected request metadata, define both hosted and local-development behavior. Missing proxy headers must lead to an explicit unavailable/manual path or another accepted source; an upstream service's observation of the server's own address must not be mislabeled as the visitor's address. Treat forwarding headers as trusted only within a documented trusted-proxy boundary.

## Rules
API-EXT-002 MUST validate callbacks and remote content before use.
API-EXT-003 MUST classify retryable versus permanent failures.
API-EXT-004 MUST keep secrets server-side and bound outbound requests.
API-EXT-005 MUST document data sharing/retention when sending sensitive content to external or AI providers.
API-EXT-006 MUST check the integration contract in its intended browser/server execution context, including transport policies and provider error/recovery states, and distinguish fixtures, documentation research, and observed live behavior in the evidence.
API-EXT-007 MUST define and verify local versus hosted behavior for deployment-provided headers or capabilities, with an honest fallback when they are absent and a documented trust boundary for their source.
API-EXT-008 MUST maintain an application-owned provider/integration catalog when an application supports multiple external providers. Each entry MUST identify its purpose and state (selected, configured, eligible, policy-approved, and enabled are separate states), contract/version and supported capability, permitted data/trust boundary, authentication type and required non-secret identifiers/scopes/permissions, quota/spend boundary, privacy/retention decisions, and failure/recovery owner. Catalog entries MUST NOT enable arbitrary endpoints, model IDs, or runtime-loaded code.
API-EXT-009 MUST define provider-specific setup fields from current official provider documentation, including required, optional, and conditional secrets, non-secret identifiers, permissions/scopes, and application-managed request configuration. A generic API-key field MUST NOT stand in for distinct provider requirements. Inactive candidates MUST be visibly inactive and MUST NOT receive provider calls.
API-EXT-010 MAY accept an owner-entered secret through a browser form only as transient client memory sent by an explicit action to a protected same-origin server command. The secret MUST NOT be stored in browser storage, URLs, logs, traces, analytics, caches, or build output; returned in responses; or hydrated back into the form. The server response MUST contain only non-secret status and safe validation/failure details. Prototype forms MUST tell users not to enter live secrets and MUST NOT send or save values. Rotation, revocation, direct-request protection, and unknown save outcomes MUST have explicit behavior.

## Validation
Invalid signature, duplicate callback, provider timeout, schema mismatch, revoked credential, rate limit, and recovery. For credential forms, also check required/conditional field mapping, candidate non-activation, secret non-reflection in responses/logs, no client persistence, rejected cross-origin commands, safe replacement/revocation, and that setup prototypes send no values.

Where relevant, exercise a browser-origin request under the delivered CSP, an allowed synthetic/public sample, HTTP errors and provider-level errors returned with HTTP 200, absent deployment headers, and a second request after recovery. Do not load-test a provider or use real confidential inputs merely to verify connectivity.

## Related Patterns

- [AI inference](ai-inference-pattern.md)
- [Cloudflare Workers AI](cloudflare-workers-ai-pattern.md)
- [Retry and idempotency](retry-idempotency-pattern.md)
- [Sensitive data](../security/data-protection/sensitive-data-pattern.md)
