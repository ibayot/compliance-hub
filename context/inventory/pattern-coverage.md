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

## Scoped evidence

- [2026-10-21 ticketing audit](../audits/2026-10-21-ticketing.md): full owned-source inventory and route enumeration, targeted semantic review and isolated probes, local build/regression evidence, open defects and explicitly unverified boundaries. This is not a pass for every rule or every endpoint. Recheck hashes and affected rules before reusing its findings.
- [Prepared 1.0.25 re-audit](../audits/2026-10-21-ticketing-reaudit.md) supersedes affected source findings with 599 local backend tests, 10 mocked-browser scenarios, 22 targeted read-only checks, SQL repeatability, and native/web transport probes. Remaining concurrency/device/runtime/visual and formatting limits are explicit; broader application adoption remains partial.
- [Ticketing UI re-audit at 1.0.25](../audits/2026-10-21-ticketing-ui/REPORT.md): dedicated UI inventory and 85 exercised isolated browser probes across queues, detail actions, supporting ticketing screens, responsive/theme, keyboard, and failure states. Records 29 findings/adoption gaps, including the missing requester creation entry point and unreachable feedback pages; fixes remain unimplemented and runtime coverage is bounded by its ledger.
