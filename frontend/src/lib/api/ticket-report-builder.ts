import { apiClient } from './client';

export const REPORT_SUPPORT_TYPES: Record<string, string> = {
  desktop_support: 'Desktop Support', it_support: 'IT Support',
  pantawid_ict_support: 'Pantawid ICT Support', specialized_concerns: 'Specialized Concerns',
};
export const REPORT_COLUMNS = {
  subject: 'Subject', description: 'Description', requester: 'Requester', assignee: 'Assigned staff', category: 'Category', issue: 'Issue',
  status: 'Status', priority: 'Priority', createdAt: 'Filed', completedAt: 'Effective completion',
};
export const REPORT_SECTIONS = { categories: 'Categories', issues: 'Issues', staff: 'Staff', ratings: 'Ratings' };
export interface ReportConfiguration {
  title: string; sections: Array<keyof typeof REPORT_SECTIONS>; includeTicketList: boolean;
  listBasis: 'completed' | 'received' | 'interrupted'; columns: Array<keyof typeof REPORT_COLUMNS>;
  sortBy: 'ticketNumber' | 'createdAt' | 'completedAt'; sortOrder: 'asc' | 'desc'; ticketType: string | null; technicianId: number | null;
}
export const defaultReportConfiguration = (): ReportConfiguration => ({ title: 'Monthly Ticket Report', sections: [],
  includeTicketList: false, listBasis: 'completed', columns: ['subject', 'status', 'completedAt'],
  sortBy: 'ticketNumber', sortOrder: 'asc', ticketType: null, technicianId: null });
export interface TicketReportTemplate { id: string; name: string; revision: number; configuration: ReportConfiguration }
interface InterruptionSummary { tickets: number; occurrences: number; businessMinutes: number; averageFrequency: number | null; averageMinutes: number | null; averageEligibleTickets: number; averageEligibleOccurrences: number }
export interface BuiltTicketReport {
  configuration: ReportConfiguration; year: number; month: number; timeZone: string; generatedAt: string;
  startAt: string; endAtExclusive: string; cutoffAt: string; monthToDate: boolean; scope: string; scopeMode: 'individual' | 'all';
  summary: { received: number; completed: number; slaMet: number; slaMissed: number; slaUnavailable: number;
    slaCompliancePercent: number | null; pause: InterruptionSummary; freeze: InterruptionSummary; unknownHistoryTickets: number;
    estimatedTimingTickets: number; missingCompletionTickets: number };
  breakdowns: Partial<Record<keyof typeof REPORT_SECTIONS, Array<{ id?: string; label: string; category?: string; tickets: number; slaMet: number; slaMissed: number }>>>;
  ratings: { ratedTickets: number; average: number | null } | null;
  rows: Array<{ ticketId: string; ticketNumber: string; ticketType: string; pauseCount: number | null; freezeCount: number | null;
    pauseMinutes: number | null; freezeMinutes: number | null; historyQuality: string; sla: string | null } &
    Partial<Record<keyof typeof REPORT_COLUMNS, string | null>>>;
  listCount: number;
}
const base = '/tickets/report-builder';
export const ticketReportBuilderApi = {
  templates: async () => (await apiClient.get<TicketReportTemplate[]>(`${base}/templates`)).data,
  staff: async () => (await apiClient.get<Array<{ id: number; name: string }>>(`${base}/staff-options`)).data,
  create: async (name: string, configuration: ReportConfiguration) =>
    (await apiClient.post<TicketReportTemplate>(`${base}/templates`, { name, configuration })).data,
  update: async (template: TicketReportTemplate, name: string, configuration: ReportConfiguration) =>
    (await apiClient.patch<TicketReportTemplate>(`${base}/templates/${template.id}`, { name, configuration, revision: template.revision })).data,
  remove: async (template: TicketReportTemplate) => apiClient.delete(`${base}/templates/${template.id}`, { params: { revision: template.revision } }),
  preview: async (year: number, month: number, configuration: ReportConfiguration) =>
    (await apiClient.post<BuiltTicketReport>(`${base}/preview`, { year, month, configuration })).data,
};
