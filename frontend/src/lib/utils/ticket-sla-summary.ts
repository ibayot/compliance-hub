type SummaryTicket = {
  status: string;
  slaDeadline?: string | null;
  slaPaused?: boolean;
  isSlaWaiting?: boolean;
  effectiveResolvedAt?: string | null;
  resolutionTimeOverride?: string | null;
  resolvedAt?: string | null;
};

/** Display-only summary; does not recalculate the server's SLA deadline. */
export function getTicketSlaSummary(ticket: SummaryTicket, now = Date.now()) {
  const deadline = ticket.slaDeadline ? new Date(ticket.slaDeadline).getTime() : NaN;
  if (!Number.isFinite(deadline) || ['duplicate', 'cancelled'].includes(ticket.status) ||
    (ticket.isSlaWaiting && ticket.status !== 'in_progress')) return null;
  const completed = ['resolved', 'closed'].includes(ticket.status);
  const resolved = ticket.effectiveResolvedAt || ticket.resolutionTimeOverride || ticket.resolvedAt;
  const resolvedTime = resolved ? new Date(resolved).getTime() : NaN;
  const paused = !completed && (ticket.slaPaused || ['pause', 'freeze'].includes(ticket.status));
  const state = completed
    ? Number.isFinite(resolvedTime) ? resolvedTime > deadline ? 'missed' : 'met' : 'completed'
    : paused ? 'paused' : now >= deadline ? 'overdue' : 'countdown';
  return {
    state,
    deadlineLabel: paused ? 'Projected SLA Deadline' : 'SLA Deadline',
    timerLabel: completed ? 'SLA Result' : paused ? 'Timer' : state === 'overdue' ? 'Overdue By' : 'Time Remaining',
    missedMilliseconds: state === 'missed' ? resolvedTime - deadline : 0,
  } as const;
}
