# Pattern Coverage and Adoption

This bootstrap provides documented baseline coverage. Implementation compliance, automated enforcement, and migration completeness remain unverified unless evidence is linked.

| Area | Documentation | Existing implementation evidence | Adoption gap |
| --- | --- | --- | --- |
| Routing/governance/profile | MASTER, governance, application | AGENTS router | Validate route relevance as real tasks exercise it |
| UI elements/interactions/pages | Design-system granular patterns | Shared primitives in implementation map | Consumer inventory, visual/accessibility evidence |
| Security | Granular security library | Guards, policies, validators, auth client | Endpoint/control-by-control verification |
| Languages/frameworks/platforms | Conditional technology packs | Manifests and profile | Validate exact installed-version examples when used |
| Containers | Docker/Compose/runtime/security | Current Dockerfiles/Compose | Build/runtime/data/health review |
| Domain behavior | Generic modeling + local overlay | Domain services and helpers | Complete transition/capability matrices |
| Data/API/infrastructure | Owned patterns | Current services/contracts/config | Transaction, query, recovery, and contract evidence |
| Quality/delivery | Audit/test/release workflows | Package scripts and release mechanisms | Targeted enforcement linked to rule IDs |

## Enforcement states
Documented -> implementation identified -> review enforced -> automatically checked -> verified for scoped revision. These are independent of pattern approval status.

INV-COVER-001 MUST record actual enforcement and evidence rather than marking every baseline automatically checked. INV-COVER-002 MUST track remaining consumers for partial migrations. INV-COVER-003 SHOULD record repeated audit failures as candidates for component/API/type/test enforcement.

## Evidence storage

The 2026-10-27 guidance merge adds discovery/field-to-consumer/journey contracts, runtime/database readiness, measured UI quality, engine safeguards, optional report/export design, identity revalidation and client-update policy. The private overlay owns local timings, permissions, SQL targets and provenance. Implementation coverage remains partial and tied to the canonical map; library management tools/receipts are not adopted by this guidance-only merge.

Generated audit reports and test evidence are local-only, not versioned. This map does not certify implementation compliance; obtain current scoped evidence before reporting assurance.
