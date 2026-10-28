# Project Context Master

Start here for substantive analysis, architecture, implementation, review, and QA. This router is reusable across applications. The local [application profile](application/PROFILE.md) determines which packs and domain overlays apply.

## Load context in this order

1. Read the profile and [context-loading rules](governance/context-loading.md).
2. Classify the request using the routes below.
3. Read the smallest relevant pattern set. Follow dependencies only when they affect the task.
4. Add security, accessibility, data, platform, or domain context when triggered.
5. Cite applicable rule IDs in a substantive plan, audit, or completion report.

Do not read every file or every index. The [catalog](INDEX.md) is for discovery when the route is insufficient. Inactive packs remain available reference material and do not govern this application.

## Routes

| Task | Start with | Add selectively |
| --- | --- | --- |
| Product definition or new application | [intake](application/intake.md), [workflow completeness](application/workflow-completeness.md), [application build](workflows/application-build-workflow.md), [profile template](templates/application-profile-template.md) | Goals, domain questions, field/consumer mapping, owner operations and essential entry-to-outcome evidence |
| UI component or consistency | [UI principles](foundations/ui-principles.md), [design catalog](design-system/INDEX.md) | Exact component, interaction, page, accessibility, active framework |
| Substantive UI readability, usability or performance | [UI quality](quality/ui-quality-pattern.md), [UI principles](foundations/ui-principles.md) | Populated/long-content states, supported devices, keyboard behavior and proportionate measurements |
| Configurable reports, saved templates or export | [reporting](domain/reporting-pattern.md), [report builder](domain/report-builder-pattern.md) | Application report contract, row/field scope, unknown-history coverage, all-options/detail/print layout and payload budgets |
| Client build manifest, polling or update refresh | [client update discovery](api-and-integrations/client-update-pattern.md), [session lifecycle](security/identity/session-pattern.md) | Application recovery/sign-out policy, cache/readiness and selected web/native platform |
| Frontend state or API use | [frontend architecture](architecture/frontend-pattern.md), [API client](api-and-integrations/api-client-pattern.md) | Active framework state pack; list/form/SSE patterns |
| Backend module, endpoint, or validation | [backend architecture](architecture/backend-pattern.md), [API contract](api-and-integrations/rest-contract-pattern.md) | Active language/framework, authorization, data |
| Authorization or identity | [security catalog](security/INDEX.md) | Exact identity/authorization control and application capability overlay |
| Files, previews, or attachment replacement | [file storage](infrastructure/file-storage-pattern.md), [file security](security/file-handling-pattern.md) | File picker, domain ownership, API limits, container storage |
| SQL, schema, seed, transaction | [data catalog](data/INDEX.md), [engine safeguards](data/engine-safeguards-pattern.md), [schema workflow](workflows/schema-change-workflow.md) | Selected engine, local runtime ownership under APP-CH-007, ignored-artifact handoff and authorized environment |
| Integration, worker, or events | [integration catalog](api-and-integrations/INDEX.md), [service boundaries](architecture/service-boundaries.md) | Contract, retry/idempotency, job/SSE, privacy |
| AI/LLM, extraction, summarization or generated output | [AI inference](api-and-integrations/ai-inference-pattern.md) | Actual selected provider, task authority, privacy/retention, setup state, quotas and evaluation; available provider guidance does not activate it |
| Docker or Compose | [container catalog](containers/INDEX.md) | Exact build/runtime/network/volume/health pattern, secrets |
| Environment, deployment, recovery | [configuration](infrastructure/configuration-pattern.md), [operations catalog](operations/INDEX.md) | Container pack, deployment, backup, rollback |
| Web/mobile/desktop behavior | [platform catalog](platforms/INDEX.md) | Profile-enabled platform and framework only |
| Audit or consistency review | [consistency audit](quality/consistency-audit-pattern.md), [implementation map](inventory/canonical-implementations.md) | Exact scoped patterns, coverage, evidence template |
| Feature or bug fix | [feature workflow](workflows/feature-change-workflow.md), [validation matrix](quality/validation-matrix.md) | Applicable routes above |
| Diagnose, reproduce or investigate a failure | [debugging](workflows/debugging-workflow.md), [testing](quality/testing-pattern.md) | Exact failing boundary, safe diagnostic fields and environment authority; diagnosis alone does not grant a fix |
| Application release | [release workflow](workflows/release-workflow.md), [release policy](delivery/release-pattern.md) | Application release/changelog overlay |
| Context or rule changes | [authoring](governance/rule-authoring.md), [change workflow](workflows/context-change-workflow.md) | Template, exceptions, adoption/migration |
| Architecture change | [architecture catalog](architecture/INDEX.md), [decision template](templates/decision-template.md) | Affected boundaries and consumers |

## Application and technology selection

The profile supplies exact application paths, enabled languages, frameworks, platforms, containers, validation commands, and domain routes. Use the [technology catalog](technology/INDEX.md) only to locate the enabled pack and relevant concern. Do not load Laravel rules for a React/NestJS task or mobile rules for an unrelated web-only task.

## Cross-cutting checks

Load the relevant security pattern for changes involving identity, permissions, untrusted input, files, secrets, network trust, queries, or sensitive logs. Load [accessibility](foundations/accessibility.md) for user-facing interactions. Add the profile's domain overlay for affected business behavior. Read [validation](quality/validation-matrix.md) when planning changes or reporting assurance.

## Conflicts and gaps

Project context cannot override platform/system instructions, tool permissions, or the current authorized task scope. Within local guidance, apply [rule precedence](governance/rule-precedence.md). Surface conflicts by rule ID; follow the rule, record an already-authorized bounded exception, or deliberately revise the rule with an impact review. Ask only when a material decision exceeds existing authority.

Existing code is evidence, not proof of the desired standard. Missing patterns are candidates; a single request does not silently become a global rule. Use [decisions](decisions/INDEX.md) and [exceptions](exceptions/INDEX.md) for material changes.

## Maintenance and verification

Update the nearest index when files move, the implementation map when canonical code changes, and coverage when enforcement changes. Run the read-only validator:

~~~text
node context/tools/validate-context.mjs
~~~

Context-only maintenance does not require an application version bump or release notes.

This project uses reviewed guidance from the separate `application-development-context` library, with its own preserved profile/overlays and read-only validator. See [local integration scope](README.md). It is a manual guidance merge, not a managed adoption receipt or a claim that all shared-library tooling is installed here.
