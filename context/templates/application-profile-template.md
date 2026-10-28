# Application Profile Template

Status: draft until populated and reviewed. Replace every placeholder. Unknown requirements remain unresolved.

## Purpose, outcomes, and non-goals

Application name, users, critical workflows, success criteria, boundaries, and non-goals.

## Enabled technology packs

| Language/framework/platform/container/data concern | Installed version/source | Pack path | Scope |
| --- | --- | --- | --- |
| Populate from actual manifests | Manifest/lock/runtime file | Exact existing pack | Applicable modules |

## Product and domain rules

Capabilities, state transitions, ownership, data sensitivity, notifications, accessibility, terminology, and workflow overlays. Link one authoritative document per rule.

## Architecture and environments

Module/data ownership, integrations, trust boundaries, local/staging/production topology, native targets, online/offline behavior. Include secret variable names only.

## Routing overrides

Task signal -> exact active pack and application overlay. A monorepo profile identifies its application root and inherited repository constraints.

## Validation and delivery

Record each applicable environment's actual engine/context and service-selected connection/schema, preparer, authorized migration/configuration applier, verifier, prerequisites and artifact-delivery channel. Keep prepared, delivered, disposable-tested, application-applied and workflow-verified states separate. State whether local runtime updates are delegated and which remote steps remain owner-managed; ignored SQL/configuration is not delivered by a Git pull. No secret values belong in the profile.

Exact commands, known mutating scripts, environment/data prerequisites, release/version policy, changelog audience rules, backup/rollback expectations.

## Unresolved inputs

Legal requirements, retention, recovery targets, performance budgets, security acceptance, or other decisions needing accountable input.

## Adoption

Record baseline version/revision and deliberate deviations. Review after a framework upgrade, new domain, platform, integration, permission model, or deployment topology.
