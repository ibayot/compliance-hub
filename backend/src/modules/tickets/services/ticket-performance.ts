import type { ResolutionTiming } from './ticket-sla-pause';
export interface PerformancePeriod { start: Date; end: Date }
export interface AssigneePerformanceRow {
  techId: number; techName: string; resolvedTickets: number; met: number; missed: number;
  slaRate: number; avgActiveResolutionHours: number; volumeScore: number; efficiencyScore: number; weightedScore: number;
  avgBusinessResolutionHours: number; avgCreditedPauseHours: number; pauseCount: number | null; estimatedTickets: number;
  avgCalendarResolutionHours: number;
}
export interface PerformanceSummary {
  startAt: string; endAt: string; timeZone: 'Asia/Manila';
  weights: { sla: number; volume: number; efficiency: number };
  excludedTickets: number; rows: AssigneePerformanceRow[];
}
const DAY = 86_400_000;
const OFFSET = 8 * 3_600_000;
export function manilaDate(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Manila' }).format(now);
}
export function weeklyPerformancePeriod(now = new Date()): PerformancePeriod {
  const calendar = new Date(`${manilaDate(now)}T00:00:00Z`);
  const daysSinceMonday = (calendar.getUTCDay() + 6) % 7;
  return { start: new Date(calendar.getTime() - daysSinceMonday * DAY - OFFSET), end: now };
}
export function reportPerformancePeriod(filters: { year?: number; month?: number; quarter?: number; semester?: number }, now = new Date()): PerformancePeriod {
  const year = filters.year ?? Number(manilaDate(now).slice(0, 4));
  if (!Number.isInteger(year) || year < 1900 || year > 9999) throw new Error('Invalid report year.');
  for (const [value, maximum] of [[filters.month, 12], [filters.quarter, 4], [filters.semester, 2]] as const) {
    if (value !== undefined && (!Number.isInteger(value) || value < 1 || value > maximum)) throw new Error('Invalid report period.');
  }
  const month = filters.month ? filters.month - 1 : filters.quarter ? (filters.quarter - 1) * 3 : filters.semester ? (filters.semester - 1) * 6 : 0;
  const months = filters.month ? 1 : filters.quarter ? 3 : filters.semester ? 6 : 12;
  return { start: new Date(Date.UTC(year, month, 1) - OFFSET), end: new Date(Date.UTC(year, month + months, 1) - OFFSET - 1) };
}
export function scoreAssignees(samples: Array<{ techId: number; techName: string; activeHours: number; slaHours: number; metSla?: boolean; timing?: ResolutionTiming | null }>): AssigneePerformanceRow[] {
  const stats = new Map<number, { name: string; count: number; met: number; hours: number; efficiency: number;
    elapsed: number; calendar: number; paused: number; pauses: number; unknownCount: boolean; estimates: number }>();
  for (const sample of samples) {
    if (!Number.isInteger(sample.techId) || sample.techId <= 0 || !Number.isFinite(sample.activeHours) || sample.activeHours < 0 || !Number.isFinite(sample.slaHours) || sample.slaHours <= 0) continue;
    const stat = stats.get(sample.techId) ?? { name: sample.techName, count: 0, met: 0, hours: 0, efficiency: 0,
      elapsed: 0, calendar: 0, paused: 0, pauses: 0, unknownCount: false, estimates: 0 };
    stat.count++; stat.met += (sample.metSla ?? (sample.activeHours <= sample.slaHours)) ? 1 : 0;
    stat.hours += sample.activeHours;
    stat.elapsed += sample.timing?.elapsedBusinessHours ?? sample.activeHours;
    stat.calendar += sample.timing?.elapsedCalendarHours ?? sample.activeHours;
    stat.paused += sample.timing?.creditedPauseHours ?? 0;
    stat.pauses += sample.timing?.pauseCount ?? 0;
    stat.unknownCount ||= sample.timing?.pauseCount == null;
    stat.estimates += sample.timing?.estimated ? 1 : 0;
    stat.efficiency += sample.activeHours === 0 ? 100 : Math.min(100, sample.slaHours / sample.activeHours * 100);
    stats.set(sample.techId, stat);
  }
  const maxVolume = Math.max(1, ...Array.from(stats.values()).map(s => s.count));
  const round = (value: number) => Math.round(value * 10) / 10;
  return Array.from(stats, ([techId, s]) => {
    const sla = s.met / s.count * 100, volume = s.count / maxVolume * 100, efficiency = s.efficiency / s.count;
    return { techId, techName: s.name, resolvedTickets: s.count, met: s.met, missed: s.count - s.met,
      slaRate: round(sla), volumeScore: round(volume), efficiencyScore: round(efficiency),
      avgActiveResolutionHours: Math.round(s.hours / s.count * 10000) / 10000,
      avgBusinessResolutionHours: Math.round(s.elapsed / s.count * 10000) / 10000,
      avgCalendarResolutionHours: Math.round(s.calendar / s.count * 10000) / 10000,
      avgCreditedPauseHours: Math.round(s.paused / s.count * 10000) / 10000,
      pauseCount: s.unknownCount ? null : s.pauses, estimatedTickets: s.estimates,
      weightedScore: round(sla * 0.5 + volume * 0.3 + efficiency * 0.2) };
  }).sort((a, b) => b.weightedScore - a.weightedScore || b.resolvedTickets - a.resolvedTickets || b.slaRate - a.slaRate || a.avgActiveResolutionHours - b.avgActiveResolutionHours || a.techId - b.techId);
}
