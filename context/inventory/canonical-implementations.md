# Canonical Implementation Starting Points

Source presence reviewed on 2026-10-20. Existing shared code is a starting point for reuse and assessment, not proof that every consumer is standardized or the implementation meets every new baseline.

| Concern | Existing shared implementation | Adoption/evidence status |
| --- | --- | --- |
| Theme/tokens | [theme](../../frontend/src/lib/theme.ts), [theme context](../../frontend/src/contexts/ThemeModeContext.tsx) | Existing theme; audit token usage and dark/mobile variants |
| Searchable selector | [SearchableSelect](../../frontend/src/components/SearchableSelect.tsx) | Controlled single/multi selector; review async/loading needs before reuse |
| Ticket images | [TicketImageDropzone](../../frontend/src/components/TicketImageDropzone.tsx) | Ticket-specific limits; not a universal document-upload component |
| Document upload | [DocumentUpload](../../frontend/src/components/documents/DocumentUpload.tsx) | Domain-specific workflow; verify permission/version behavior |
| Responsive table | [ResponsiveTable](../../frontend/src/components/layout/ResponsiveTable.tsx) | Shared overflow controls; audit semantics and consumers |
| Ticket action menus | [TicketActionsMenu](../../frontend/src/components/TicketActionsMenu.tsx), [action selector](../../frontend/src/lib/utils/ticket-detail-actions.ts) | Presentation only; backend policies remain authoritative |
| Authenticated transport | [API client](../../frontend/src/lib/api/client.ts) | Existing refresh/session owner; inspect native behavior before changes |
| Query cache | [ReactQueryProvider](../../frontend/src/components/providers/ReactQueryProvider.tsx) | Existing server-state provider; local fetches may still exist |
| Rich text | [SafeRichText](../../frontend/src/components/SafeRichText.tsx) | Review permitted content and sanitization before reuse |
| Capability declarations | [decorator](../../backend/src/common/decorators/require-capability.decorator.ts), [guard](../../backend/src/common/guards/capability.guard.ts) | Existing coarse capability mechanism; endpoint adoption unassessed |
| Completed-ticket SLA classification | `hasMetResolvedTicketSla` in [ticket service](../../backend/src/modules/tickets/services/ticket.service.ts); [score aggregation](../../backend/src/modules/tickets/services/ticket-performance.ts) | Weekly/report counts use effective completion against the saved deadline, with legacy duration fallback; CH-TICKET-006/007 and the [1.0.25 re-audit](../audits/2026-10-21-ticketing-reaudit.md) record actual verification and remaining limits. |
| Pause credits and timing explanation | [credit/calculation owner](../../backend/src/modules/tickets/services/ticket-sla-pause.ts), [shared explanation](../../frontend/src/components/ResolutionTimingSummary.tsx), [transport projection type](../../frontend/src/lib/types/ticket-timing.ts) | CH-TICKET-009 / ADR-001; detail and both ranking views share the explanation. Unknown historical credits remain explicitly estimated, not reconstructed. |
| Internal service trust | [InternalServiceGuard](../../backend/src/common/guards/internal-service.guard.ts) | Environment-dependent behavior; no blanket deployment assurance |
| File path containment | [security validators](../../backend/src/common/security/security-validators.ts) | Existing helper; consumer coverage unassessed |
| Request correlation | [middleware](../../backend/src/common/middleware/correlation-id.middleware.ts), [logger](../../backend/src/common/logger/context-logger.ts) | Existing primitives; logging adoption/redaction unassessed |
| Changelog presentation | [dialog](../../frontend/src/components/ChangelogDialog.tsx), [service](../../backend/src/modules/changelog/changelog.service.ts) | Existing capability/audience mechanism; release data must be curated |

## Updating the map
INV-CANON-001 MUST verify source paths and contracts before treating an entry as the canonical implementation for a new use. Add new shared components only after their contract and consumers are understood. Record whether migration is prospective, partial, or complete.
