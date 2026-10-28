---
id: CORE-API-AND-INTEGRATIONS-CLOUDFLARE-WORKERS-AI
status: baseline
scope: api-and-integrations
owner: application-maintainers
triggers: [Cloudflare Workers AI, Workers AI, AI Gateway]
last-reviewed: 2026-10-26
---

# Cloudflare Workers AI

## Guidelines

Use Cloudflare Workers AI behind the application-owned [AI inference boundary](ai-inference-pattern.md). A Workers binding is appropriate only when an application intentionally deploys a Cloudflare Worker; an existing backend can use the REST API through its server-side provider adapter.

For a free-tier-first application, treat zero spend as an enforceable product boundary. Provider allocations, limits, model availability, and terms can change and must be checked again for the selected model at deployment time.

## Why

Free allocation exhaustion, capacity limits, paid-only models, model removal, and optional logging/storage features can change cost, privacy, and reliability. Direct browser calls would expose credentials and bypass application authorization, quotas, validation, and audit controls.

## Structure

~~~text
application AI service
  -> Cloudflare adapter
     -> server-side account/model configuration
     -> least-privilege API token or intentional Worker binding
     -> Workers AI
  -> validated application result

free allocation/capacity/provider failure -> explicit application degraded state
~~~

## Current Provider Facts

Verified against Cloudflare documentation on 2026-10-21; recheck rather than treating these as permanent guarantees:

- Workers AI documents a daily free allocation and notes that some models require a paid billing method. Its pricing and model catalog are changeable provider facts.
- The REST API requires a Cloudflare Account ID and API token. Both belong in server-controlled configuration; the token is secret.
- Standard Workers AI inference is documented as zero-retention and not used to train models, while selected storage, logging, caching, batch, gateway, or third-party features can create separate storage/processing behavior.
- JSON Mode requests structured output but does not guarantee schema compliance; the application still validates every response.
- AI Gateway logging can include prompt and response bodies, so gateway and per-request payload logging settings are part of the data-retention decision.

## Rules

- CF-AI-001 MUST call Workers AI through a server-controlled adapter or an intentionally deployed Worker binding; clients MUST NOT call the provider directly or receive a stored/returned provider token or unrestricted provider access. An owner-entered token MAY pass transiently through a protected same-origin credential command under API-EXT-010.
- CF-AI-002 MUST store account and allowlisted model identifiers as validated configuration and MUST store the least-privilege API token as a secret.
- CF-AI-003 MUST enforce the application profile's spend boundary and MUST NOT silently activate billing, credits, a paid plan, a paid-only model, or a paid fallback.
- CF-AI-004 MUST map free-allocation exhaustion, rate/capacity limits, timeouts, unavailable/removed models, and authorization errors to bounded retry and the profile's defined degraded experience.
- CF-AI-005 MUST validate JSON Mode or other structured responses against an application-owned runtime schema before use.
- CF-AI-006 MUST recheck and record pricing, allocation, rate limits, model availability/license, data-use terms, and selected feature retention at deployment and material provider/model changes.
- CF-AI-007 MUST explicitly configure AI Gateway prompt/response logging and retention when AI Gateway is used; restricted payload logging remains off unless the profile records an approved purpose, audience, and retention period.
- CF-AI-008 MUST NOT claim zero retention for a path that enables provider/application storage, caching, logging, asynchronous processing, batch processing, Vectorize/R2/KV/Durable Objects, or a third-party route without reviewing that feature's lifecycle.

## Variants and Exceptions

Direct REST and Worker bindings are supported architectural variants, not automatic reasons to introduce an edge runtime. AI Gateway is optional and requires its own logging, caching, routing, billing, and third-party-provider review. A different provider or local model follows AI-INF-011 and the application profile.

## Security

Apply [secrets management](../security/infrastructure/secrets-management-pattern.md), [sensitive data](../security/data-protection/sensitive-data-pattern.md), [rate/error handling](../security/input-output/rate-limit-error-pattern.md), and [configuration](../infrastructure/configuration-pattern.md). Do not place tokens in frontend-bundled environment variables, source, logs, examples, or error responses.

If an application provides an owner-facing token setup form, apply the [external integration catalog and credential setup rules](external-integration-pattern.md), especially API-EXT-008..010. The browser form is a credential submission path only; it must not make Workers AI inference calls.

## Validation

Test the selected model in the intended account/plan, invalid and revoked tokens, disallowed model IDs, malformed output, privacy/logging settings, quota exhaustion, provider `429`/capacity responses, timeout/cancellation, bounded retry, disabled billing, and the user-visible degraded path. Confirm dashboard/provider usage against application-side accounting without logging restricted bodies.

## Provider References

- [Workers AI pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Workers AI limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
- [Workers AI errors](https://developers.cloudflare.com/workers-ai/platform/errors/)
- [Workers AI data usage](https://developers.cloudflare.com/workers-ai/platform/data-usage/)
- [Workers AI REST API](https://developers.cloudflare.com/workers-ai/get-started/rest-api/)
- [Workers AI JSON Mode](https://developers.cloudflare.com/workers-ai/features/json-mode/)
- [AI Gateway logging](https://developers.cloudflare.com/ai-gateway/observability/logging/)

## Related Patterns

- [AI inference](ai-inference-pattern.md)
- [External integration catalog and credential setup (API-EXT-008..010)](external-integration-pattern.md)
- [Environment configuration](../infrastructure/configuration-pattern.md)
- [Observability](../infrastructure/observability-pattern.md)
