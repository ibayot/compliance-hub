/** Credits are saved with the ticket aggregate, not reconstructed from audit timestamps. */
export interface SlaPauseCredit {
  startAt: string;
  endAt: string;
  creditedSeconds: number;
}
export interface SlaPauseLedger {
  clockStartedAt: string | null;
  legacySeconds: number;
  intervals: SlaPauseCredit[];
}
export interface ResolutionTiming {
  elapsedCalendarHours: number;
  elapsedBusinessHours: number;
  creditedPauseHours: number;
  activeHours: number;
  pauseCount: number | null;
  estimated: boolean;
}
type PauseTicket = { slaStartedAt?: Date | null; accumulatedPauseSeconds: number; slaPauseLedger?: SlaPauseLedger | null };

export function usablePauseLedger(ticket: PauseTicket): SlaPauseLedger | null {
  const ledger = ticket.slaPauseLedger;
  const clock = ticket.slaStartedAt ? new Date(ticket.slaStartedAt).toISOString() : null;
  if (!ledger || ledger.clockStartedAt !== clock || !Array.isArray(ledger.intervals)) return null;
  if (!Number.isFinite(ledger.legacySeconds) || ledger.legacySeconds < 0 || ledger.intervals.some(interval =>
    !Number.isFinite(interval.creditedSeconds) || interval.creditedSeconds < 0 ||
    !Number.isFinite(Date.parse(interval.startAt)) || !Number.isFinite(Date.parse(interval.endAt)) ||
    Date.parse(interval.endAt) < Date.parse(interval.startAt))) return null;
  const total = ledger.legacySeconds + ledger.intervals.reduce((sum, interval) => sum + interval.creditedSeconds, 0);
  return Number.isFinite(total) && Math.abs(total - Number(ticket.accumulatedPauseSeconds || 0)) < 1 ? ledger : null;
}

export function creditTicketPause(ticket: PauseTicket, start: Date, end: Date, seconds: number): void {
  const ledger = usablePauseLedger(ticket) ?? {
    clockStartedAt: ticket.slaStartedAt ? new Date(ticket.slaStartedAt).toISOString() : null,
    legacySeconds: Math.max(0, Number(ticket.accumulatedPauseSeconds || 0)), intervals: [],
  };
  const startAt = new Date(start).toISOString(), endAt = new Date(end).toISOString();
  if (ledger.intervals.some(interval => interval.startAt === startAt && interval.endAt === endAt)) return;
  const creditedSeconds = Math.max(0, Math.round(seconds));
  ledger.intervals.push({ startAt, endAt, creditedSeconds });
  ticket.slaPauseLedger = ledger;
  ticket.accumulatedPauseSeconds = Number(ticket.accumulatedPauseSeconds || 0) + creditedSeconds;
}

export async function resolutionTiming(
  ticket: PauseTicket & { resolutionTimeOverride?: Date | null }, end: Date,
  businessSeconds: (start: Date, end: Date) => Promise<number>,
): Promise<ResolutionTiming | null> {
  if (!ticket.slaStartedAt) return null;
  const start = new Date(ticket.slaStartedAt);
  const elapsed = end > start ? await businessSeconds(start, end) : 0;
  const ledger = usablePauseLedger(ticket);
  const legacy = ledger?.legacySeconds ?? Math.max(0, Number(ticket.accumulatedPauseSeconds || 0));
  let paused = legacy, count = 0;
  for (const interval of ledger?.intervals ?? []) {
    const pauseStart = new Date(Math.max(start.getTime(), new Date(interval.startAt).getTime()));
    const pauseEnd = new Date(Math.min(end.getTime(), new Date(interval.endAt).getTime()));
    if (pauseEnd <= pauseStart) continue;
    count++;
    // A manual-pause allowance credits the first N business seconds only.
    paused += Math.min(interval.creditedSeconds, await businessSeconds(pauseStart, pauseEnd));
  }
  paused = Math.min(elapsed, Math.max(0, paused));
  return { elapsedCalendarHours: Math.max(0, end.getTime() - start.getTime()) / 3600000,
    elapsedBusinessHours: elapsed / 3600, creditedPauseHours: paused / 3600,
    activeHours: Math.max(0, elapsed - paused) / 3600,
    pauseCount: legacy > 0 ? null : count,
    estimated: Boolean(ticket.resolutionTimeOverride && legacy > 0) };
}
