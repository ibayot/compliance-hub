# Project Context Library

This folder is the reusable context organization owned by this application. Begin with [MASTER.md](MASTER.md); use [INDEX.md](INDEX.md) to browse the full library.

## What the files mean

- Governance defines how rules are authored, selected, revised, and checked.
- Foundations and patterns define intended standards with code structure and validation.
- Application context contains local facts, domain rules, and technology activation.
- Inventories distinguish canonical implementations from candidates and gaps.
- Decisions and exceptions explain deliberate departures.
- Templates support future patterns and application onboarding.

The baseline is prospective guidance adopted for future authorized work. It does not claim that all existing application code complies, grant permission to refactor, or prescribe an architecture migration.

## Reuse in another application

Start new projects from the separate neutral `application-development-context` repository and its reviewed adoption/export workflow, rather than copying this active application wholesale. If performing a deliberate manual guidance merge, preserve the destination's own profile, domain/implementation facts, instructions and evidence policy. Conduct [intake](application/intake.md) and [workflow discovery](application/workflow-completeness.md); never invent a managed-installation receipt or claim library-tool checks ran in a project where those tools are absent.

Recheck all source paths, commands, runtime versions, security assumptions, release policy, and domain terminology. Do not copy Compliance Hub database names, roles, workflow states, or deployment assumptions as universal requirements.

## Integration scope

On 2026-10-27 this project received a reviewed guidance-only merge from shared library 0.5.0, including its earlier discovery, debugging, UI-quality, data, dependency and provider improvements plus newly generalized report/runtime lessons. Local MASTER links select the relevant documents. The current application profile, domain overlays, ADRs, implementation inventory, history, read-only validator and no-committed-test/evidence policy are retained.

Pack manifests, machine routing receipts, integrity/export/adoption tools and their library test harness remain in the separate reusable repository. They are not part of this merge. This is not a complete managed library adoption; later updates still require reviewed comparison. Shared context validation is not evidence that the application was rebuilt, its database was migrated, a user signed in successfully, or every UI conforms. Context-only work does not run those application operations.

## Audit expectations

Selective routing and stable rule IDs reduce repeated discovery. An audit still needs implementation evidence. Historical reports become stale when their scoped inputs change; cached findings require a recorded revision, command, date, and invalidation condition.
