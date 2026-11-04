import { TicketInterruption, TicketInterruptionHistory, usableInterruptionHistory } from './ticket-interruptions';

export interface HistoricalInterruptionEvidence {
  id: string;
  source: 'event' | 'audit' | 'justification';
  type: 'created' | 'transition' | 'extension' | 'justification';
  at: Date | string;
  from?: string | null;
  to?: string | null;
  pausedAt?: Date | string | null;
}
export interface ReportInterruptionInterval extends TicketInterruption { estimated: boolean }
export interface ReportInterruptionHistory {
  intervals: ReportInterruptionInterval[];
  complete: boolean;
  reconstructed: boolean;
  unresolved: Array<{ kind: 'pause' | 'freeze'; startAt: string }>;
}
const statuses = new Set(['open', 'assigned', 'in_progress', 'pause', 'freeze', 'resolved', 'closed', 'cancelled', 'duplicate']);
const interruption = (value?: string | null): value is 'pause' | 'freeze' => value === 'pause' || value === 'freeze';
export function evidenceTime(value: Date | string | null | undefined): number {
  if (value instanceof Date) return value.getTime();
  if (!value) return NaN;
  // Raw DATETIME strings use this application's Manila database timezone.
  return Date.parse(/^\d{4}-\d{2}-\d{2} \d/.test(value) ? value.replace(' ', 'T') + '+08:00' : value);
}
export function hasRecordedMonthlyHistory(history: TicketInterruptionHistory | null | undefined, start: Date): boolean {
  const usable = usableInterruptionHistory(history);
  return !!usable && (usable.complete || evidenceTime(usable.capturedFrom) <= start.getTime());
}

/** Read-only projection: historical estimates never become the authoritative stored ledger. */
export function reconstructReportInterruptions(
  ticket: { status: string; createdAt: Date; resolvedAt?: Date | null; interruptionHistory?: TicketInterruptionHistory | null; slaPausedAt?: Date | null; isSlaWaiting?: boolean },
  evidence: HistoricalInterruptionEvidence[], start: Date, now: Date,
): ReportInterruptionHistory {
  const direct = usableInterruptionHistory(ticket.interruptionHistory);
  const recorded = (direct?.intervals ?? []).map(interval => ({ ...interval, estimated: false }));
  if (hasRecordedMonthlyHistory(direct, start)) return { intervals: recorded, complete: true, reconstructed: false, unresolved: [] };
  const created = evidenceTime(ticket.createdAt), capture = direct ? evidenceTime(direct.capturedFrom) : now.getTime();
  const horizon = Math.min(capture, now.getTime());
  const valid = evidence.map(item => ({ ...item, time: evidenceTime(item.at) }))
    .filter(item => Number.isFinite(item.time) && item.time >= created && item.time <= now.getTime())
    .sort((a, b) => a.time - b.time || Number(b.source === 'audit') - Number(a.source === 'audit') || a.id.localeCompare(b.id, undefined, { numeric: true }));
  // Coalesce corroborating audit/event copies only; rapid same-source transitions remain distinct.
  const transitions: typeof valid = [];
  for (const item of valid.filter(item => item.type !== 'justification')) {
    const duplicate = item.type === 'transition' && transitions.slice(-8).some(previous => previous.type === item.type &&
      previous.source !== item.source && previous.from === item.from && previous.to === item.to && Math.abs(previous.time - item.time) <= 5000);
    if (!duplicate) transitions.push(item);
  }
  const justifications = valid.filter(item => item.type === 'justification' && interruption(item.to));
  const justified = { pause: justifications.filter(item => item.to === 'pause'), freeze: justifications.filter(item => item.to === 'freeze') };
  const intervals: ReportInterruptionInterval[] = [];
  const unresolved: ReportInterruptionHistory['unresolved'] = [];
  let state: string | undefined, open: { kind: 'pause' | 'freeze'; start: number } | null = null;
  let coveredFrom = Infinity, lastStateAt = created, sawEvidence = false;
  const emit = (entry: NonNullable<typeof open>, end: number) => {
    const clipped = Math.min(end, horizon);
    if (clipped > entry.start) intervals.push({ kind: entry.kind, startAt: new Date(entry.start).toISOString(), endAt: new Date(clipped).toISOString(), estimated: true });
  };
  const recoverStart = (kind: 'pause' | 'freeze', until: number, anchor?: Date | string | null) => {
    const saved = evidenceTime(anchor);
    if (Number.isFinite(saved) && saved >= Math.max(created, lastStateAt) && saved <= until) return saved;
    const candidates = justified[kind];
    let low = 0, high = candidates.length;
    while (low < high) { const middle = (low + high) >>> 1; if (candidates[middle].time < lastStateAt) low = middle + 1; else high = middle; }
    return candidates[low]?.time <= until ? candidates[low].time : undefined;
  };
  for (const item of transitions) {
    if (item.time > horizon) {
      // A later observed exit can establish an episode spanning a past report/capture boundary.
      if (open && item.type === 'transition' && item.from === open.kind && item.to !== open.kind) emit(open, item.time);
      else if (open && direct) { emit(open, horizon); coveredFrom = Infinity; }
      else if (open) unresolved.push({ kind: open.kind, startAt: new Date(open.start).toISOString() });
      if (open) open = null;
      break;
    }
    if (item.type === 'created') {
      if (!state && item.to && statuses.has(item.to)) { state = item.to; coveredFrom = created; sawEvidence = true; lastStateAt = created; }
      continue;
    }
    if (!item.to || !statuses.has(item.to)) {
      if (open) { unresolved.push({ kind: open.kind, startAt: new Date(open.start).toISOString() }); open = null; }
      state = undefined; coveredFrom = Infinity; lastStateAt = item.time;
      continue;
    }
    sawEvidence = true;
    if (item.type === 'extension' || item.from === item.to) continue;
    if (item.to === state && (!item.from || item.from === state)) continue;
    if (item.from && statuses.has(item.from)) {
      if (!state) { state = item.from; coveredFrom = item.time; }
      if (state !== item.from) {
        if (open) { unresolved.push({ kind: open.kind, startAt: new Date(open.start).toISOString() }); open = null; }
        coveredFrom = item.time; // A missing transition prevents claiming coverage before this observation.
        state = item.from;
      }
      if (interruption(item.from) && !open) {
        const recovered = recoverStart(item.from, item.time, item.pausedAt);
        if (recovered !== undefined) open = { kind: item.from, start: recovered };
        else coveredFrom = item.time;
      }
    } else if (state === undefined) coveredFrom = item.time;
    if (open) { emit(open, item.time); open = null; }
    state = item.to;
    if (interruption(state)) open = { kind: state, start: item.time };
    lastStateAt = item.time;
  }
  if (!open && interruption(ticket.status) && !direct &&
    (!ticket.isSlaWaiting || justified[ticket.status].length > 0)) {
    const anchor = recoverStart(ticket.status, now.getTime(), ticket.isSlaWaiting ? undefined : ticket.slaPausedAt);
    if (anchor !== undefined && !intervals.some(interval => evidenceTime(interval.startAt) === anchor)) {
      if (state !== ticket.status) coveredFrom = Infinity;
      open = { kind: ticket.status, start: anchor }; sawEvidence = true;
    }
  }
  if (open) {
    const completion = evidenceTime(ticket.resolvedAt);
    if (direct || ticket.status === open.kind) emit(open, horizon);
    else if (['resolved', 'closed'].includes(ticket.status) && Number.isFinite(completion) && completion >= open.start) {
      emit(open, completion); coveredFrom = Infinity; // Completion supplies an estimated end, not proof of an uninterrupted gap.
    } else unresolved.push({ kind: open.kind, startAt: new Date(open.start).toISOString() });
  }
  const terminalCompatible = state && ['resolved', 'closed'].includes(state) && ['resolved', 'closed'].includes(ticket.status);
  if (!direct && state !== ticket.status && !terminalCompatible) coveredFrom = Infinity;
  // Direct intervals win at the capture boundary; clip legacy intervals so they cannot overlap.
  const combined = [...intervals.filter(interval => evidenceTime(interval.startAt) < horizon), ...recorded]
    .sort((a, b) => evidenceTime(a.startAt) - evidenceTime(b.startAt));
  const reconstructed = intervals.length > 0 || unresolved.length > 0 || sawEvidence;
  return { intervals: combined, reconstructed,
    complete: reconstructed && coveredFrom <= Math.max(created, start.getTime()) && !unresolved.some(item => evidenceTime(item.startAt) < now.getTime()), unresolved };
}
