import { BadRequestException } from '@nestjs/common';
export const REPORT_SECTIONS = ['categories', 'issues', 'staff', 'ratings'] as const;
export const REPORT_COLUMNS = ['subject', 'description', 'requester', 'assignee', 'category', 'issue', 'status', 'priority', 'createdAt', 'completedAt'] as const;
export interface ReportConfiguration {
  title: string;
  sections: Array<typeof REPORT_SECTIONS[number]>;
  includeTicketList: boolean;
  listBasis: 'completed' | 'received' | 'interrupted';
  columns: Array<typeof REPORT_COLUMNS[number]>;
  sortBy: 'ticketNumber' | 'createdAt' | 'completedAt';
  sortOrder: 'asc' | 'desc';
  ticketType: string | null;
  technicianId: number | null;
}
export function assertKeys(value: unknown, keys: readonly string[]): asserts value is Record<string, any> {
  if (!value || typeof value !== 'object' || Array.isArray(value) ||
    Object.keys(value).some(key => !keys.includes(key))) throw new BadRequestException('Invalid report fields.');
}
export function reportConfiguration(value: unknown): ReportConfiguration {
  assertKeys(value, ['title', 'sections', 'includeTicketList', 'listBasis', 'columns', 'sortBy', 'sortOrder', 'ticketType', 'technicianId']);
  const list = (input: unknown, allowed: readonly string[]) => Array.isArray(input) &&
    input.length <= allowed.length && new Set(input).size === input.length && input.every(item => allowed.includes(item));
  if (typeof value.title !== 'string' || !value.title.trim() || value.title.trim().length > 120 ||
    !list(value.sections, REPORT_SECTIONS) || !list(value.columns, REPORT_COLUMNS) ||
    typeof value.includeTicketList !== 'boolean' || !['completed', 'received', 'interrupted'].includes(value.listBasis) ||
    !['ticketNumber', 'createdAt', 'completedAt'].includes(value.sortBy) || !['asc', 'desc'].includes(value.sortOrder) ||
    (value.ticketType !== null && !['desktop_support', 'it_support', 'pantawid_ict_support', 'specialized_concerns'].includes(value.ticketType)) ||
    (value.technicianId !== null && (!Number.isSafeInteger(value.technicianId) || value.technicianId < 1))) {
    throw new BadRequestException('Invalid report configuration.');
  }
  return { ...value, title: value.title.trim() } as ReportConfiguration;
}
export function monthlyReportPeriod(year: unknown, month: unknown, now: Date) {
  if (!Number.isInteger(year) || Number(year) < 1900 || Number(year) > 9998 ||
    !Number.isInteger(month) || Number(month) < 1 || Number(month) > 12) throw new BadRequestException('Choose a valid month and year.');
  const start = new Date(Date.UTC(Number(year), Number(month) - 1, 1) - 8 * 3600000);
  const end = new Date(Date.UTC(Number(year), Number(month), 1) - 8 * 3600000);
  if (start > now) throw new BadRequestException('Future months cannot be reported yet.');
  return { start, end, cutoff: new Date(Math.min(end.getTime(), now.getTime())), monthToDate: now < end };
}
