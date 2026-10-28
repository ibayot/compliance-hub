/** Operational interruptions are separate from capped SLA credits and schedule suspension. */
export type InterruptionKind = 'pause' | 'freeze';
export interface TicketInterruption { kind: InterruptionKind; startAt: string; endAt: string | null }
export interface TicketInterruptionHistory {
  version: 1;
  capturedFrom: string;
  complete: boolean;
  intervals: TicketInterruption[];
}
export function newInterruptionHistory(now = new Date()): TicketInterruptionHistory {
  return { version: 1, capturedFrom: now.toISOString(), complete: true, intervals: [] };
}
export function usableInterruptionHistory(value: TicketInterruptionHistory | null | undefined): TicketInterruptionHistory | null {
  if (!value || value.version !== 1 || typeof value.complete !== 'boolean' ||
    !Number.isFinite(Date.parse(value.capturedFrom)) || !Array.isArray(value.intervals)) return null;
  let lastEnd = Date.parse(value.capturedFrom);
  for (const [index, interval] of value.intervals.entries()) {
    if (!interval || typeof interval !== 'object' || typeof interval.startAt !== 'string' ||
      (interval.endAt !== null && typeof interval.endAt !== 'string')) return null;
    const start = Date.parse(interval.startAt), end = interval.endAt === null ? Infinity : Date.parse(interval.endAt);
    if (!['pause', 'freeze'].includes(interval.kind) || !Number.isFinite(start) ||
      Number.isNaN(end) || end < start || start < lastEnd ||
      (end === Infinity && index !== value.intervals.length - 1)) return null;
    lastEnd = end;
  }
  return value;
}
export function recordInterruptionTransition(
  ticket: { interruptionHistory?: TicketInterruptionHistory | null }, from: string, to: string, now = new Date(),
): void {
  if (from === to) return;
  const kind = (status: string): status is InterruptionKind => status === 'pause' || status === 'freeze';
  if (!kind(from) && !kind(to)) return;
  const history = usableInterruptionHistory(ticket.interruptionHistory) ??
    { version: 1 as const, capturedFrom: now.toISOString(), complete: false, intervals: [] };
  const open = history.intervals[history.intervals.length - 1];
  if (open?.endAt === null) open.endAt = new Date(Math.max(now.getTime(), Date.parse(open.startAt))).toISOString();
  if (kind(to)) history.intervals.push({ kind: to, startAt: now.toISOString(), endAt: null });
  ticket.interruptionHistory = history;
}
