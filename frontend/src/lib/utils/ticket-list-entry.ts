export type TicketFilterPeriodMode = 'day' | 'month' | 'quarter' | 'semester' | 'year';
export const TICKET_ENTRY_QUERY_KEYS = ['assignedToMe', 'scope', 'filter', 'status', 'period', 'date', 'year', 'month', 'quarter', 'semester', 'sla'] as const;

/** Each navigation starts clean. Only explicit link intent overrides today's default. */
export function resolveTicketListEntry(params: URLSearchParams, context: {
  today: string;
  defaultAssignedToMe: boolean;
  personalRequestedOnly: boolean;
}) {
  const state = {
    filterStatus: '', filterType: '', filterPriority: '',
    filterSla: '' as '' | 'overdue' | 'nearing_sla' | 'on_track',
    filterDate: context.today, filterYear: context.today.slice(0, 4),
    filterMonth: String(Number(context.today.slice(5, 7))), filterQuarter: '', filterSemester: '',
    filterPeriodMode: 'day' as TicketFilterPeriodMode,
    searchDraft: '', searchQuery: '', selectedTab: 'all',
    showMyTickets: context.defaultAssignedToMe, showEscalatedToMe: false, showEscalations: false,
    escalationSearch: '', page: 1,
  };
  if (!context.personalRequestedOnly && (params.get('assignedToMe') === '1' || params.get('scope') === 'assigned_to_me')) state.showMyTickets = true;
  const statuses = ['all', 'open', 'assigned', 'in_progress', 'pause', 'resolved', 'closed', 'freeze', 'duplicate', 'cancelled', ...(context.personalRequestedOnly ? ['to_rate', 'proxy'] : [])];
  const status = params.get('status');
  if (status && statuses.includes(status)) state.selectedTab = status;

  const year = params.get('year') || '', month = params.get('month') || '', date = params.get('date') || '';
  const quarter = params.get('quarter') || '', semester = params.get('semester') || '';
  const validYear = /^\d{4}$/.test(year) && Number(year) >= 1900;
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(`${date}T00:00:00Z`)) && new Date(`${date}T00:00:00Z`).toISOString().slice(0, 10) === date;
  if (params.get('period') === 'month' && validYear && /^(?:[1-9]|1[0-2])$/.test(month)) {
    state.filterPeriodMode = 'month'; state.filterDate = ''; state.filterYear = year; state.filterMonth = month;
  } else if (params.get('period') === 'quarter' && validYear && /^[1-4]$/.test(quarter)) {
    state.filterPeriodMode = 'quarter'; state.filterDate = ''; state.filterYear = year; state.filterMonth = ''; state.filterQuarter = quarter;
  } else if (params.get('period') === 'semester' && validYear && /^[12]$/.test(semester)) {
    state.filterPeriodMode = 'semester'; state.filterDate = ''; state.filterYear = year; state.filterMonth = ''; state.filterSemester = semester;
  } else if (params.get('period') === 'year' && validYear) {
    state.filterPeriodMode = 'year'; state.filterDate = ''; state.filterYear = year; state.filterMonth = '';
  } else if (params.get('period') === 'day' && validDate) {
    state.filterDate = date; state.filterYear = date.slice(0, 4); state.filterMonth = String(Number(date.slice(5, 7)));
  }
  const sla = params.get('sla');
  if (sla === 'overdue' || sla === 'nearing_sla' || sla === 'on_track') {
    state.filterSla = sla; state.filterYear = ''; state.filterMonth = ''; state.filterQuarter = ''; state.filterSemester = ''; state.filterPeriodMode = 'year'; state.filterDate = '';
  }
  if (context.personalRequestedOnly && params.get('filter') === 'pending_satisfaction') {
    state.selectedTab = 'to_rate'; state.filterSla = ''; state.filterYear = ''; state.filterMonth = ''; state.filterQuarter = ''; state.filterSemester = ''; state.filterPeriodMode = 'year'; state.filterDate = '';
  }
  return state;
}
