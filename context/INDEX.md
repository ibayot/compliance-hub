# Project Context Catalog

Start with [MASTER.md](MASTER.md), which selects context by request. This catalog lists available packs and records; it is not an instruction to load them all. [The profile](application/PROFILE.md) selects the application's active technologies and domain rules.

## Entry points and governance
- [Library guide and copying instructions](README.md)
- [Master router](MASTER.md)
- [Application profile, intake, and overlay](application/INDEX.md)
- [Governance: loading, authoring, precedence, exceptions](governance/INDEX.md)
- [Context change history](CONTEXT-CHANGELOG.md)

## UI and product behavior
- [Foundations: UI, accessibility, content, engineering](foundations/INDEX.md)
- [Design system: granular components, visual foundations, interactions, pages, content](design-system/INDEX.md)
- [Domain modeling: workflows, capabilities, notifications, reporting](domain/INDEX.md)

## Engineering and operations
- [Architecture](architecture/INDEX.md)
- [Security](security/INDEX.md)
- [Data](data/INDEX.md)
- [APIs and integrations](api-and-integrations/INDEX.md)
- [Languages, runtimes, frameworks, and libraries](technology/INDEX.md)
- [Web, mobile, desktop, API, worker, and CLI platforms](platforms/INDEX.md)
- [Docker, Compose, container operations and security](containers/INDEX.md)
- [Infrastructure](infrastructure/INDEX.md)
- [Operations and recovery](operations/INDEX.md)

## Evidence, delivery, and maintenance
- [Quality, validation, and consistency audits](quality/INDEX.md)
- [Delivery and release guidance](delivery/INDEX.md)
- [Workflows](workflows/INDEX.md)
- [Implementation and coverage inventories](inventory/INDEX.md)
- [Architecture decisions](decisions/INDEX.md) and [record guidance](decisions/README.md)
- [Exceptions](exceptions/INDEX.md) and [record guidance](exceptions/README.md)
- [Authoring templates](templates/INDEX.md)
- [Read-only validation tool](tools/README.md)

## Catalog conventions
Granular pattern documents carry rule IDs, scope, rationale, structure/examples, implementation/state guidance, and validation. Baseline means intended guidance for relevant future work, not verified legacy compliance. Local application facts and release policy stay in the profile overlay.

Use a pack index only when the precise pattern is unknown. Follow the smallest relevant branch; do not import inactive frameworks because their files exist.
