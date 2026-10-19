type SlaTicket = {
  status: string;
  slaDeadline?: string | null;
  resolvedAt?: string | null;
  effectiveResolvedAt?: string | null;
  resolutionTimeOverride?: string | null;
  slaPaused?: boolean;
  isSlaWaiting?: boolean;
  isOverdue?: boolean;
  isNearingSLA?: boolean;
};

export type TicketSlaStatus = 'met' | 'on_track' | 'nearing_sla' | 'overdue' | 'paused';

/** Duplicate tagging is not a resolution and must never count as SLA Met. */
export function getTicketSlaStatus(ticket: SlaTicket, now = Date.now()): TicketSlaStatus | null {
  if (['duplicate', 'cancelled'].includes(ticket.status) || !ticket.slaDeadline) return null;
  const deadline = new Date(ticket.slaDeadline).getTime();
  if (!Number.isFinite(deadline)) return null;
  if (['resolved', 'closed'].includes(ticket.status)) {
    const resolved = ticket.effectiveResolvedAt || ticket.resolutionTimeOverride || ticket.resolvedAt;
    if (!resolved) return null;
    const resolvedTime = new Date(resolved).getTime();
    if (!Number.isFinite(resolvedTime)) return null;
    return resolvedTime <= deadline ? 'met' : 'overdue';
  }
  if (ticket.slaPaused) return 'paused';
  if (ticket.isSlaWaiting && ticket.status !== 'in_progress') return null;
  if (now >= deadline || ticket.isOverdue) return 'overdue';
  return ticket.isNearingSLA ? 'nearing_sla' : 'on_track';
}
