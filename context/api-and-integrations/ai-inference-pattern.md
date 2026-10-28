---
id: CORE-API-AND-INTEGRATIONS-AI-INFERENCE
status: baseline
scope: api-and-integrations
owner: application-maintainers
triggers: [AI, LLM, inference, prompt, embeddings, extraction, summarization, agents]
---

# AI Inference

## Guidelines

Treat AI inference as an untrusted, probabilistic external integration. Define a bounded task and an application-owned contract before selecting a model or connecting model output to a workflow.

## Why

Models can produce plausible but incorrect content, follow hostile instructions embedded in source material, change behavior between versions, exhaust shared quotas, and expose data through provider or application logging. A provider SDK or free tier does not resolve those product, security, or reliability boundaries.

## Structure

~~~text
authorized user + bounded task + permitted data
  -> application AI service -> provider adapter -> allowlisted model
  -> runtime validation -> policy/permission check -> advisory result
  -> explicit confirmation for an approved side effect

quota/provider/schema/evaluation failure
  -> defined degraded state; no silent paid or unsafe fallback
~~~

## Implementation

Own prompts, schemas, task policy, provider selection, and failure mapping in an application service rather than UI components. Separate system instructions from untrusted user, document, retrieval, web, or tool content. Pass only the minimum data needed for the task and use server-controlled credentials.

Represent every task with an identifier and versioned contract: purpose, eligible actors, input classification, provider/model, prompt/template version, output schema, maximum input/output size, latency target, quota, timeout/retry policy, retention, evaluation set, and user-visible failure behavior.

Derive task budgets from representative accepted request shapes, including maximum applicable fan-out, structured artifacts, source material and selected variants. Keep input bytes, tokenizer/context fit, output tokens, response bytes and cost reservations distinct; a tiny successful fixture does not prove the largest contract fits. Reject known input-size violations before durable provider intent/send, retain the request and offer correction without silently truncating facts. Classify impossible or out-of-policy usage reports as uncertain instead of persisting overflowing or false zero charges. Material bound/prompt changes receive immutable task versions and evaluation; preserve historical pins and explicit owner selections rather than rewriting or reactivating them during seeding. This implements AI-INF-006/008/009 without authorizing a provider call or model change.

Model text and structured output remain untrusted input. Parse defensively, validate against an application-owned schema, constrain lengths and enumerations, and apply ordinary domain validation. Do not interpret a model's claim that an action is safe, authorized, or complete as evidence.

## Rules

- AI-INF-001 MUST define the task, eligible users, permitted inputs, provider/model policy, output contract, latency/quota boundary, and failure experience before enabling inference.
- AI-INF-002 MUST treat every model output as untrusted and MUST validate structured output at runtime before storage, display in a trusted rendering context, or downstream use.
- AI-INF-003 MUST NOT let a model authorize or directly execute a business side effect; every tool or action must independently authenticate, authorize, validate, and require human confirmation when the impact is consequential or irreversible.
- AI-INF-004 MUST minimize and classify prompt data and MUST document provider processing, retention, training, storage, regional, and model-license implications before sending sensitive or regulated content.
- AI-INF-005 MUST keep provider credentials and unrestricted inference endpoints server-side and MUST allowlist configurable task/model identifiers rather than accept arbitrary client-selected models.
- AI-INF-006 MUST bound usage by task and appropriate actor/workspace/system scopes, with timeouts, bounded retries, concurrency limits, and a hard spend policy.
- AI-INF-007 MUST define a visible safe degraded state for quota exhaustion, capacity loss, timeout, provider rejection, invalid output, and disabled AI; core non-AI workflows must not appear successful when AI work did not complete.
- AI-INF-008 MUST version prompts, schemas, task policy, and model selection and MUST retain enough non-sensitive provenance to reproduce or investigate a result without logging restricted prompt or completion bodies by default.
- AI-INF-009 MUST evaluate accuracy, unsafe behavior, prompt injection, representative languages/formats, refusal behavior, and regression on controlled fixtures before a task or material prompt/model change is accepted.
- AI-INF-010 SHOULD tell users when material content is AI-generated or transformed and SHOULD expose sources, uncertainty, or review status appropriate to the task.
- AI-INF-011 MUST NOT route to another provider or paid model unless its privacy, licensing, output, availability, and spend contracts are separately approved.
- AI-INF-012 MUST treat retrieved documents, web content, user uploads, and tool responses as untrusted data rather than higher-priority instructions; tools and data sources must be allowlisted and scoped to the current actor.

## Variants and Exceptions

Deterministic local algorithms remain preferable when they can meet the requirement without model uncertainty. Local models, hosted models, retrieval-augmented generation, embeddings, and agentic tool use may share this boundary but require task-specific performance, data, and action rules. Record any deviation through the context exception process.

## Security and Accessibility

Apply [external integration](external-integration-pattern.md), [sensitive data](../security/data-protection/sensitive-data-pattern.md), [secrets](../security/secrets-pattern.md), [authorization](../security/authorization-pattern.md), [input/output](../security/input-output-pattern.md), and [observability](../infrastructure/observability-pattern.md). AI-generated UI content must remain readable, keyboard-accessible, clearly attributed where relevant, and recoverable when inference is unavailable.

## Validation

Use synthetic or explicitly approved fixtures. Exercise prompt injection, cross-user/resource access, malformed and oversized output, hallucinated identifiers, unsafe content, timeout, cancellation, concurrency, quota exhaustion, provider/model removal, configuration errors, retry amplification, logging redaction, human confirmation, and fallback denial. Record evaluation thresholds and failed/blocked checks; do not describe a baseline pattern as proof of model quality or compliance.

## Related Patterns

- [Cloudflare Workers AI](cloudflare-workers-ai-pattern.md)
- [External integration](external-integration-pattern.md)
- [Retry and idempotency](retry-idempotency-pattern.md)
- [Testing](../quality/testing-pattern.md)
- [Workflow states](../domain/workflow-state-pattern.md)
