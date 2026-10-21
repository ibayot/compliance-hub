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

Copy this folder, replace the profile using [the profile template](templates/application-profile-template.md), conduct [the intake](application/intake.md), and replace the local application overlay and implementation inventory. Retain only relevant packs or leave unused packs inactive. Preserve rule IDs for unchanged shared standards; scope or record changes when a project diverges. Copy the routing paragraph from [AGENTS integration](governance/agents-integration.md) into that application's own guidance.

Recheck all source paths, commands, runtime versions, security assumptions, release policy, and domain terminology. Do not copy Compliance Hub database names, roles, workflow states, or deployment assumptions as universal requirements.

## Audit expectations

Selective routing and stable rule IDs reduce repeated discovery. An audit still needs implementation evidence. Historical reports become stale when their scoped inputs change; cached findings require a recorded revision, command, date, and invalidation condition.
