import { apiClient } from '@/lib/api/client';

export interface Issuance {
  id: string;
  issuance_number: string;
  title: string;
  description?: string;
  issuance_type?: string;
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: string;
  last_review_date?: string;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: string;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority: string;
  issue_date: string;
  effectivity_date?: string;
  source_url?: string;
  attachment_file_name?: string;
  attachment_mime_type?: string;
  attachment_uploaded_at?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  documents?: Array<{ id: string }>;
}

export interface CreateIssuanceDto {
  issuance_number: string;
  title: string;
  description?: string;
  issuance_type?: string;
  applicability_scope?: string;
  relevance_notes?: string;
  binding_nature?: string;
  adoption_basis?: string;
  applicable_provisions?: string;
  compliance_obligations?: string;
  required_evidence?: string;
  evidence_location?: string;
  process_owner?: string;
  frequency_cadence?: string;
  compliance_status?: string;
  gap_summary?: string;
  action_required?: string;
  target_date?: string;
  last_review_date?: string;
  quarterly_readiness?: string;
  q1_compliance_status?: string;
  q2_compliance_status?: string;
  q3_compliance_status?: string;
  q4_compliance_status?: string;
  register_added_at?: string;
  is_amendment?: boolean;
  amended_issuance_number?: string;
  ict_amendment_notes?: string;
  issuing_authority: string;
  issue_date: string;
  effectivity_date?: string;
  source_url?: string;
  attachment_file_name?: string;
  attachment_mime_type?: string;
  attachment_uploaded_at?: string;
  is_active?: boolean;
}

export type TicketType = 'desktop_support' | 'it_support' | 'pantawid_ict_support';
export type TicketStatus =
  | 'open'
  | 'assigned'
  | 'in_progress'
  | 'resolved'
  | 'closed'
  | 'freeze'
  | 'pause'
  | 'duplicate';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent' | 'critical';

export interface TicketEvent {
  id: string;
  ticketId: string;
  actorId: number | null;
  actorName?: string | null;
  eventType: string;
  meta?: Record<string, string | number | boolean | null> | null;
  createdAt: string;
}

interface AttendanceTechnicianRecord {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  openCount: number;
  attendanceStatus?: AttendanceStatus | null;
  isUnavailable?: boolean;
}

interface StaffLoginRecord {
  userId?: number;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  lastLogin?: string | null;
  [key: string]: unknown;
}

const sanitizeKeywordValue = (value: unknown): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
};

const parseKeywordArrayFromUnknown = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  const parsed: string[] = [];
  value.forEach((entry) => {
    const sanitized = sanitizeKeywordValue(entry);
    if (sanitized) parsed.push(sanitized);
  });
  return parsed;
};

const parseKeywordListField = (rawKeywords: unknown, fallbackKeyword?: unknown): string[] => {
  if (Array.isArray(rawKeywords)) {
    const normalized = parseKeywordArrayFromUnknown(rawKeywords);
    if (normalized.length > 0) return normalized;
  }

  if (typeof rawKeywords === 'string') {
    try {
      const parsed = JSON.parse(rawKeywords) as unknown;
      const normalized = parseKeywordArrayFromUnknown(parsed);
      if (normalized.length > 0) return normalized;
    } catch {
      const single = sanitizeKeywordValue(rawKeywords);
      if (single) return [single];
    }
  }

  const fallback = sanitizeKeywordValue(fallbackKeyword);
  return fallback ? [fallback] : [];
};

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  ticketType: TicketType;
  status: TicketStatus;
  priority: TicketPriority | null;
  categoryId?: string | null;
  category?: TicketCategory | null;
  issueTypeId?: string | null;
  issueType?: TicketIssueType | null;
  requesterId: number;
  requester?: { id: number; email: string; firstName?: string; lastName?: string };
  createdById?: number | null;
  createdBy?: { id: number; email: string; firstName?: string; lastName?: string } | null;
  assignedToId?: number | null;
  assignedTo?: { id: number; email: string; firstName?: string; lastName?: string } | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  satisfactionRating?: number | null;
  satisfactionComment?: string | null;
  satisfactionSubmittedAt?: string | null;
  satisfactionFormData?: string | null;
  slaDeadline?: string | null;
  assignedTechAbsent?: boolean;
  /** UUID of the original ticket when status = 'duplicate' */
  duplicateOfId?: string | null;
  comments?: TicketComment[];
  isOverdue?: boolean;
  isNearingSLA?: boolean;
  isSlaWaiting?: boolean;
  hasUnreadUser?: boolean;
  hasUnreadTechnician?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketComment {
  id: string;
  ticketId: string;
  comment: string;
  userId: number;
  isInternal: boolean;
  createdAt: string;
  attachmentPath?: string | null;
  user?: { id: number; email: string; firstName?: string; lastName?: string; role?: string; ticketMainFocal?: boolean };
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  ticketType: TicketType;
  priority?: TicketPriority;
  categoryId?: string;
  issueTypeId?: string;
  issueType?: string;
  /** Staff only: override the requester (for walk-ins / phone calls) */
  requesterId?: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionNotes?: string;
  resolutionDate?: string;
  issueTypeId?: string | null;
  duplicateOfId?: string;
  ticketType?: TicketType;
  categoryId?: string;
  generateKb?: boolean;
  statusJustification?: string;
}

export interface AssignTicketDto {
  assignedToId: number;
}

export interface CsatFormData {
  consentGiven: boolean;
  unitSection: string;
  dateOfTransaction: string;
  clientFirstName: string;
  clientMiddleInitial?: string;
  clientLastName: string;
  suffix?: string;
  religion: string;
  age?: number;
  sex: string;
  contactNumber?: string;
  technicianName: string;
  /** 9 Likert responses indexed 0–8; items 3,5,8 are pre-set to 'NA' */
  likert: Array<number | 'NA'>;
  noIssueEncountered?: boolean;
}

export interface SubmitSatisfactionDto {
  rating?: number;
  comment?: string;
  formData?: CsatFormData;
}

export interface TechnicianOption {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  openCount: number;
  attendanceStatus?: AttendanceStatus | null;
  isUnavailable?: boolean;
}

export interface TicketDashboardStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  satisfactionFillRate: number;
  pendingSatisfactionTickets: Ticket[];
  myTicketsCount?: number;
  escalatedToMeCount?: number;
}

export interface TechAssignedStats {
  total: number;
  assigned: number;
  inProgress: number;
  resolved: number;
  closed: number;
  ratedCount: number;
  satisfactionAvg: number | null;
}

export interface TicketReportsData {
  totalTickets: number;
  totalWithRating: number;
  avgOverallRating: number | null;
  avgRatingByType: Array<{ type: string; avg: number; count: number; ratedCount?: number }>;
  avgRatingByTechnician: Array<{
    techId: number;
    techName: string;
    avg: number;
    count: number;
    ratedCount?: number;
  }>;
  totalEscalations: number;
  acceptedEscalations: number;
  returnedEscalations: number;
  slaStats: {
    met: number;
    missed: number;
    avgResolutionTimeHours: number;
  };
}

export interface TicketReportResult {
  totalTickets: number;
  totalWithRating: number;
  avgOverallRating: number | null;
  avgRatingByType: Array<{ type: string; avg: number; count: number; ratedCount?: number }>;
  avgRatingByTechnician: Array<{
    techId: number;
    techName: string;
    avg: number;
    count: number;
    ratedCount?: number;
    met?: number;
    missed?: number;
    avgResolutionTimeHours?: number;
  }>;
  issueCounts?: Array<{
    issueId: string;
    issueName: string;
    count: number;
    categoryId: string;
    categoryName: string;
  }>;

  totalEscalations: number;
  acceptedEscalations: number;
  returnedEscalations: number;
  slaStats: {
    met: number;
    missed: number;
    avgResolutionTimeHours: number;
  };
  slaByType: Array<{ type: string; met: number; missed: number; avgResolutionTimeHours: number; count: number }>;
  slaByTechnician: Array<{ techId: number; techName: string; met: number; missed: number; avgResolutionTimeHours: number; count: number }>;
}

export interface RatingsReportResult {
  overview: {
    totalRatings: number;
    avgOverallRating: number;
  };
  byTicket: Array<{
    ticketId: string;
    ticketNumber: string;
    subject: string;
    rating: number;
    comment: string | null;
    submittedAt: string;
    technicianId: number | null;
  }>;
  byTechnician: Array<{
    techId: number;
    techName: string;
    avgRating: number;
    count: number;
  }>;
  byDay: Array<{ date: string; avgRating: number; count: number }>;
  byWeek: Array<{ week: string; avgRating: number; count: number }>;
  byMonth: Array<{ month: string; avgRating: number; count: number }>;
  byQuarter: Array<{ quarter: string; avgRating: number; count: number }>;
}

export type EscalationStatus = 'pending' | 'accepted' | 'returned';

export interface TicketEscalation {
  id: string;
  ticketId: string;
  escalatedById: number;
  escalatedToId: number;
  escalatedBy?: { id: number; firstName?: string; lastName?: string; email: string };
  escalatedTo?: { id: number; firstName?: string; lastName?: string; email: string };
  ticket?: Ticket;
  status: EscalationStatus;
  notes?: string | null;
  returnReason?: string | null;
  proofFiles?: string[] | null;
  createdAt: string;
  updatedAt: string;
}

export interface EscalationFocalConfig {
  id: number;
  ticketType: string;
  userId: number;
  label: string;
  createdAt: string;
}

// --- v0.6 Ticket Settings / Attendance types --------------------------------

export interface TicketCategory {
  id: string;
  key: string;
  name: string;
  isIt: boolean;
  isDesktop: boolean;
  isPantawid: boolean;
  slaHours?: number | null;
  isActive: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TicketIssueType {
  id: string;
  key: string;
  name: string;
  description: string | null;
  slaHours?: number | null;
  allowablePauseHours: number;
  maxFreezeHours?: number | null;
  isActive: boolean;
  isDeleted: boolean;
  categoryId: string | null;
  category_id?: string | null;
  category?: TicketCategory | null;
  createdAt: string;
  updatedAt: string;
}

export interface TicketKeywordRule {
  id: string;
  keyword: string;
  /** All keywords in the rule group — parsed from JSON */
  keywords?: string[];
  targetTicketType: string;
  targetCategoryId?: string | null;
  targetCategory?: TicketCategory | null;
  targetIssueTypeId?: string | null;
  targetIssueType?: TicketIssueType | null;
  /** Legacy alias kept for compatibility */
  category?: TicketCategory | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type AttendanceStatus = 'present' | 'absent' | 'half_day' | 'out_of_office';

export interface TechAttendance {
  id: string;
  userId: number;
  user?: { id: number; email: string; firstName?: string; lastName?: string; role?: string };
  date: string;
  status: AttendanceStatus;
  notes?: string;
  setById?: number;
  clockInTime?: string;
  createdAt: string;
}

export interface OfficeDay {
  id: string;
  date: string;
  isOfficeDay: boolean;
  notes?: string;
  setById?: number;
  createdAt: string;
}

// Issuances API
export const issuancesApi = {
  getAll: async (filters?: {
    authority?: string;
    category?: string;
    search?: string;
    is_active?: boolean;
  }): Promise<Issuance[]> => {
    const params = new URLSearchParams();
    if (filters?.authority) params.append('authority', filters.authority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined) params.append('is_active', String(filters.is_active));

    const response = await apiClient.get(`/issuances?${params}`);
    return response.data;
  },

  getById: async (id: string): Promise<Issuance> => {
    const response = await apiClient.get(`/issuances/${id}`);
    return response.data;
  },

  create: async (data: CreateIssuanceDto): Promise<Issuance> => {
    const response = await apiClient.post(`/issuances`, data);
    return response.data;
  },

  update: async (id: string, data: Partial<CreateIssuanceDto>): Promise<Issuance> => {
    const response = await apiClient.put(`/issuances/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issuances/${id}`);
  },

  linkDocument: async (issuanceId: string, documentId: string): Promise<void> => {
    await apiClient.post(`/issuances/${issuanceId}/documents/${documentId}`, {});
  },

  unlinkDocument: async (issuanceId: string, documentId: string): Promise<void> => {
    await apiClient.delete(`/issuances/${issuanceId}/documents/${documentId}`);
  },

  uploadAttachment: async (issuanceId: string, file: File): Promise<Issuance> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/issuances/${issuanceId}/attachment`, formData);
    return response.data;
  },

  deleteAttachment: async (issuanceId: string): Promise<void> => {
    await apiClient.delete(`/issuances/${issuanceId}/attachment`);
  },

  getAttachmentViewUrl: (issuanceId: string): string => `/issuances/${issuanceId}/attachment/view`,

  viewAttachment: async (issuanceId: string): Promise<Blob> => {
    const response = await apiClient.get(`/issuances/${issuanceId}/attachment/view`, {
      responseType: 'blob',
    });
    return response.data;
  },

  downloadAttachment: async (issuanceId: string): Promise<Blob> => {
    const response = await apiClient.get(`/issuances/${issuanceId}/attachment/download`, {
      responseType: 'blob',
    });
    return response.data;
  },
};

export interface PaginatedTickets {
  data: Ticket[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  statusCounts?: Record<string, number>;
  pendingSatisfactionCount?: number;
  myTicketsCount?: number;
  escalatedToMeCount?: number;
}

// Tickets API (IT Help Desk)
export const ticketsApi = {
  // Global/Technician Pause Methods
  globalPause: async (): Promise<{ success: boolean; count: number; message: string }> => {
    const res = await apiClient.post('/tickets/global-pause');
    return res.data;
  },
  globalResume: async (): Promise<{ success: boolean; count: number; message: string }> => {
    const res = await apiClient.post('/tickets/global-resume');
    return res.data;
  },
  technicianPause: async (): Promise<{ success: boolean; count: number; message: string }> => {
    const res = await apiClient.post('/tickets/technician-pause');
    return res.data;
  },

  getAll: async (filters?: {
    status?: TicketStatus;
    ticketType?: TicketType;
    priority?: string;
    requesterId?: number;
    createdById?: number;
    assignedToId?: number;
    escalatedToMe?: boolean;
    year?: string;
    month?: string;
    quarter?: string;
    semester?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<PaginatedTickets> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.requesterId) params.append('requesterId', String(filters.requesterId));
    if (filters?.assignedToId) params.append('assignedToId', String(filters.assignedToId));
    if (filters?.escalatedToMe) params.append('escalatedToMe', 'true');
    if (filters?.year) params.append('year', filters.year);
    if (filters?.month) params.append('month', filters.month);
    if (filters?.quarter) params.append('quarter', filters.quarter);
    if (filters?.semester) params.append('semester', filters.semester);
    if (filters?.search?.trim()) params.append('search', filters.search.trim());
    params.append('page', String(filters?.page ?? 1));
    params.append('limit', String(filters?.limit ?? 25));
    const response = await apiClient.get(`/tickets?${params}`);
    return response.data;
  },
  getById: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  },

  create: async (data: CreateTicketDto | FormData): Promise<Ticket> => {
    const isFormData = data instanceof FormData;
    const response = await apiClient.post('/tickets', isFormData ? data : (data as any));
    return response.data;
  },

  update: async (id: string, data: UpdateTicketDto): Promise<Ticket> => {
    const response = await apiClient.patch(`/tickets/${id}`, data);
    return response.data;
  },

  assign: async (id: string, assignedToId: number): Promise<Ticket> => {
    const response = await apiClient.patch(`/tickets/${id}/assign`, { assignedToId });
    return response.data;
  },

  addComment: async (
    ticketId: string,
    comment: string,
    isInternal = false,
    attachment?: File | null,
  ): Promise<TicketComment> => {
    const formData = new FormData();
    formData.append('comment', comment);
    formData.append('isInternal', String(isInternal));
    if (attachment) {
      formData.append('attachment', attachment);
    }
    const response = await apiClient.post(`/tickets/${ticketId}/comments`, formData);
    return response.data;
  },

  submitSatisfaction: async (id: string, data: SubmitSatisfactionDto): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets/${id}/satisfaction`, data);
    return response.data;
  },

  getSlaSummary: async (): Promise<{ breached: number; nearing: number; onTrack: number }> => {
    const response = await apiClient.get(`/tickets/sla/summary`);
    const data = response.data;
    return {
      breached: data.overdueActive || 0,
      nearing: data.dueToday || 0,
      onTrack: Math.max(0, (data.activeWithSla || 0) - (data.overdueActive || 0) - (data.dueToday || 0))
    };
  },

  getStatistics: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
  }): Promise<Record<string, unknown>> => {
    const url = '/tickets/statistics?';
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.quarter) params.append('quarter', filters.quarter.toString());
    if (filters?.semester) params.append('semester', filters.semester.toString());
    const response = await apiClient.get(url + params.toString());
    return response.data;
  },

  getDashboardStats: async (): Promise<TicketDashboardStats> => {
    const response = await apiClient.get(`/tickets/dashboard`);
    return response.data;
  },

  getAssignedStats: async (year: number, month: number): Promise<TechAssignedStats> => {
    const response = await apiClient.get(`/tickets/assigned-stats?year=${year}&month=${month}`);
    return response.data;
  },

  getGeneralOverviewStats: async (year: number, month: number): Promise<TechAssignedStats & { open: number }> => {
    const response = await apiClient.get(`/tickets/general-overview-stats?year=${year}&month=${month}`);
    return response.data;
  },

  getTechnicians: async (): Promise<TechnicianOption[]> => {
    const response = await apiClient.get(`/tickets/technicians`);
    return response.data;
  },

  /** Get open (non-closed, non-duplicate) tickets for a specific requester — used for Duplicate picker */
  getOpenTicketsForRequester: async (requesterId: number): Promise<Ticket[]> => {
    const response = await apiClient.get(`/tickets/requester/${requesterId}/open`);
    return response.data;
  },

  /** Mark ticket as viewed by the assigned technician — auto-transitions assigned→in_progress */
  markViewed: async (id: string): Promise<Ticket | null> => {
    const response = await apiClient.patch(`/tickets/${id}/mark-viewed`);
    return response.data;
  },

  /** Get ticket timeline events */
  getEvents: async (id: string): Promise<TicketEvent[]> => {
    const response = await apiClient.get(`/tickets/${id}/events`);
    return response.data;
  },

  /** Get distinct unit section values from past CSAT form submissions */
  getUnitSuggestions: async (): Promise<string[]> => {
    const response = await apiClient.get(`/tickets/satisfaction/unit-suggestions`);
    return response.data;
  },

  /** Get SLA calibration insights (QA #11 extension) */
  getSlaInsights: async (filters?: { year?: number; month?: number; quarter?: number; semester?: number }): Promise<any[]> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.quarter) params.append('quarter', filters.quarter.toString());
    if (filters?.semester) params.append('semester', filters.semester.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get(`/ticket-settings/sla-insights${qs}`);
    return response.data;
  },

  /** Get ticket satisfaction reports with optional filters (QA #11) */
  getReports: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<TicketReportResult> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.semester) params.append('semester', String(filters.semester));
    if (filters?.technicianId) params.append('technicianId', String(filters.technicianId));
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    const response = await apiClient.get(`/tickets/reports?${params}`);
    return response.data;
  },

  /** Get performance metrics (Resolution time, SLA compliance, Escalation rates) */
  getPerformanceMetrics: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<any> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.semester) params.append('semester', String(filters.semester));
    if (filters?.technicianId) params.append('technicianId', String(filters.technicianId));
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    const response = await apiClient.get(`/tickets/performance-metrics?${params}`);
    return response.data;
  },

  /** Get detailed ratings report (Tickets, Techs, Days/Weeks/Months/Quarters) */
  getRatingsReport: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<RatingsReportResult> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.semester) params.append('semester', String(filters.semester));
    if (filters?.technicianId) params.append('technicianId', String(filters.technicianId));
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    const response = await apiClient.get(`/tickets/ratings-report?${params}`);
    return response.data;
  },

  getReportTechnicians: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    ticketType?: string;
  }): Promise<Array<{ id: number; firstName: string; lastName: string; role: string }>> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.semester) params.append('semester', String(filters.semester));
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    const response = await apiClient.get(`/tickets/report-technicians?${params}`);
    return response.data;
  },

  /** Get specific issues breakdown */
  getIssueCountsReport: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    semester?: number;
    technicianId?: number;
    ticketType?: string;
  }): Promise<Array<{ categoryName: string; issueName: string; count: number; status: string }>> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.semester) params.append('semester', String(filters.semester));
    if (filters?.technicianId) params.append('technicianId', String(filters.technicianId));
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    const response = await apiClient.get(`/tickets/reports/issue-counts?${params}`);
    return response.data;
  },


  // --- Escalation ---
  getAllEscalations: async (): Promise<TicketEscalation[]> => {
    const response = await apiClient.get(`/tickets/escalations/all`);
    return response.data;
  },

  getEscalations: async (ticketId: string): Promise<TicketEscalation[]> => {
    const response = await apiClient.get(`/tickets/${ticketId}/escalations`);
    return response.data;
  },

  escalateTicket: async (ticketId: string, data: FormData): Promise<TicketEscalation> => {
    // ADD THE HEADERS OVERRIDE HERE
    const response = await apiClient.post(`/tickets/${ticketId}/escalate`, data);
    return response.data;
  },

  acceptEscalation: async (ticketId: string, escalationId: string): Promise<TicketEscalation> => {
    const response = await apiClient.patch(
      `/tickets/${ticketId}/escalation/${escalationId}/accept`,
    );
    return response.data;
  },

  returnEscalation: async (
    ticketId: string,
    escalationId: string,
    returnReason: string,
  ): Promise<TicketEscalation> => {
    const response = await apiClient.patch(
      `/tickets/${ticketId}/escalation/${escalationId}/return`,
      { returnReason },
    );
    return response.data;
  },

  updateEscalationProof: async (
    ticketId: string,
    escalationId: string,
    data: FormData,
  ): Promise<TicketEscalation> => {
    const response = await apiClient.patch(
      `/tickets/${ticketId}/escalation/${escalationId}/update-proof`,
      data
    );
    return response.data;
  },
};

// Ticket Settings API (Categories + Keyword Rules)
export const ticketSettingsApi = {
  // Categories
  getCategories: async (ticketType?: string, activeOnly?: boolean): Promise<TicketCategory[]> => {
    const params = new URLSearchParams();
    if (ticketType) params.append('ticketType', ticketType);
    if (activeOnly === true) params.append('activeOnly', 'true');
    if (activeOnly === false) params.append('activeOnly', 'false');
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get(`/ticket-settings/categories${qs}`);
    return response.data;
  },
  getCategoryById: async (id: string): Promise<TicketCategory> => {
    const response = await apiClient.get(`/ticket-settings/categories/${id}`);
    return response.data;
  },
  createCategory: async (data: {
    name: string;
    isIt?: boolean;
    isDesktop?: boolean;
    isPantawid?: boolean;
    slaHours?: number | null;
    isActive?: boolean;
  }): Promise<TicketCategory> => {
    const response = await apiClient.post(`/ticket-settings/categories`, data);
    return response.data;
  },
  updateCategory: async (
    id: string,
    data: Partial<{ name: string; isIt: boolean; isDesktop: boolean; isPantawid: boolean; slaHours: number | null; isActive: boolean }>,
  ): Promise<TicketCategory> => {
    const response = await apiClient.patch(`/ticket-settings/categories/${id}`, data);
    return response.data;
  },
  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/ticket-settings/categories/${id}`);
  },

  // Keyword Rules
  getKeywordRules: async (): Promise<TicketKeywordRule[]> => {
    const response = await apiClient.get(`/ticket-settings/keyword-rules`);
    // The backend stores keywords as JSON string in some rows; validate before accepting.
    return (response.data as TicketKeywordRule[]).map((rule) => ({
      ...rule,
      keywords: parseKeywordListField(rule.keywords, rule.keyword),
    }));
  },
  createKeywordRule: async (data: {
    keywords: string[];
    targetTicketType: string;
    targetCategoryId?: string | null;
    targetIssueTypeId?: string | null;
    isActive?: boolean;
  }): Promise<TicketKeywordRule> => {
    const response = await apiClient.post(`/ticket-settings/keyword-rules`, data);
    return response.data;
  },
  updateKeywordRule: async (
    id: string,
    data: Partial<{
      keywords: string[];
      targetTicketType: string;
      targetCategoryId?: string | null;
      targetIssueTypeId?: string | null;
      isActive: boolean;
    }>,
  ): Promise<TicketKeywordRule> => {
    const response = await apiClient.patch(`/ticket-settings/keyword-rules/${id}`, data);
    return response.data;
  },
  deleteKeywordRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/ticket-settings/keyword-rules/${id}`);
  },

  // Issue Types
  getIssueTypes: async (categoryId?: string): Promise<TicketIssueType[]> => {
    const params = categoryId ? `?categoryId=${categoryId}` : '';
    const response = await apiClient.get(`/ticket-settings/issue-types${params}`);
    return response.data;
  },
  createIssueType: async (data: {
    name: string;
    description?: string;
    categoryId?: string;
    slaHours?: number | null;
    allowablePauseHours?: number;
    isActive?: boolean;
  }): Promise<TicketIssueType> => {
    const response = await apiClient.post(`/ticket-settings/issue-types`, data);
    return response.data;
  },
  updateIssueType: async (
    id: string,
    data: Partial<{
      name: string;
      description: string;
      categoryId: string;
      slaHours: number | null;
      allowablePauseHours: number;
      isActive: boolean;
    }>,
  ): Promise<TicketIssueType> => {
    const response = await apiClient.patch(`/ticket-settings/issue-types/${id}`, data);
    return response.data;
  },
  deleteIssueType: async (id: string): Promise<void> => {
    await apiClient.delete(`/ticket-settings/issue-types/${id}`);
  },

  // Escalation Focals (QA #3, #13)
  getEscalationFocals: async (ticketType?: string): Promise<EscalationFocalConfig[]> => {
    const params = ticketType ? `?ticketType=${ticketType}` : '';
    const response = await apiClient.get(`/ticket-settings/escalation-focals${params}`);
    return response.data;
  },
  getAvailableEscalationUsers: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get(`/ticket-settings/escalation-available-users`);
    return response.data;
  },
  addEscalationFocal: async (data: {
    ticketType: string;
    userId: number;
    label: string;
  }): Promise<EscalationFocalConfig> => {
    const response = await apiClient.post(`/ticket-settings/escalation-focals`, data);
    return response.data;
  },
  removeEscalationFocal: async (id: number): Promise<void> => {
    await apiClient.delete(`/ticket-settings/escalation-focals/${id}`);
  },

  // Global Config
  getGlobalConfig: async (): Promise<{
    assignmentStrategy: string;
    roundRobinCapHours: number;
    autoCloseDays: number;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    smtpFromName?: string | null;
    primarySmtpDailyLimit?: number;
    scheduleMode?: string;
    officeClockin?: string;
    officeClockout?: string;
    cwwClockinStart?: string;
    cwwClockinEnd?: string;
    cwwClockoutStart?: string;
    cwwClockoutEnd?: string;
    isFlagCeremonyPaused?: boolean;
  }> => {
    const response = await apiClient.get(`/ticket-settings/global-config`);
    return response.data;
  },
  updateGlobalConfig: async (data: {
    assignmentStrategy?: string;
    roundRobinCapHours?: number;
    autoCloseDays?: number;
    smtpHost?: string | null;
    smtpPort?: number | null;
    smtpUser?: string | null;
    smtpPass?: string | null;
    smtpFrom?: string | null;
    smtpFromName?: string | null;
    primarySmtpDailyLimit?: number;
    scheduleMode?: string;
    officeClockin?: string;
    officeClockout?: string;
    cwwClockinStart?: string;
    cwwClockinEnd?: string;
    cwwClockoutStart?: string;
    cwwClockoutEnd?: string;
    isFlagCeremonyPaused?: boolean;
  }): Promise<void> => {
    const response = await apiClient.patch(`/ticket-settings/global-config`, data);
    return response.data;
  },

  // SLA Insights
  getSlaInsights: async (filters?: { year?: number; month?: number; quarter?: number; semester?: number }): Promise<
    Array<{
      categoryName: string;
      configuredSlaHours: number;
      resolvedTicketsCount: number;
      avgResolutionHours: number;
      isFailingSla: boolean;
    }>
  > => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', filters.year.toString());
    if (filters?.month) params.append('month', filters.month.toString());
    if (filters?.quarter) params.append('quarter', filters.quarter.toString());
    if (filters?.semester) params.append('semester', filters.semester.toString());
    const qs = params.toString() ? `?${params.toString()}` : '';
    const response = await apiClient.get(`/ticket-settings/sla-insights${qs}`);
    return response.data;
  },

  testEmail: async (to: string): Promise<{ sent: boolean; message: string }> => {
    const response = await apiClient.post(`/ticket-settings/email-test`, { to });
    return response.data;
  },
};

export const knowledgeBaseApi = {
  search: async (query: string) => {
    const res = await apiClient.get('/knowledge-base', { params: { q: query } });
    return res.data;
  },
  rateArticle: async (id: number, isHelpful: boolean) => {
    const res = await apiClient.post(`/knowledge-base/${id}/rate`, { isHelpful });
    return res.data;
  },
  getInsights: async (): Promise<any[]> => {
    const res = await apiClient.get('/knowledge-base');
    return res.data;
  },
  update: async (id: number, data: { title: string; tags: string; content: string }): Promise<any> => {
    const res = await apiClient.put(`/knowledge-base/${id}`, data);
    return res.data;
  },
};

export const auditLogsApi = {
  getLogs: async (params?: { page?: number; limit?: number; action?: string; tableName?: string; startDate?: string; endDate?: string }) => {
    const res = await apiClient.get('/audit-logs', { params });
    return res.data;
  },
  getTables: async () => {
    const res = await apiClient.get('/audit-logs/tables');
    return res.data;
  },
};


// Attendance API
export const attendanceApi = {
  // System Status
  getSystemStatus: async (): Promise<{ isOnline: boolean }> => {
    const response = await apiClient.get('/attendance/system-status');
    return response.data;
  },
  // Tech attendance
  getMyShift: async (): Promise<{ clockIn: Date | null; clockOut: Date | null; attendanceStatus?: AttendanceStatus | null }> => {
    const response = await apiClient.get('/attendance/my-shift');
    return {
      clockIn: response.data.clockIn ? new Date(response.data.clockIn) : null,
      clockOut: response.data.clockOut ? new Date(response.data.clockOut) : null,
      attendanceStatus: response.data.attendanceStatus ?? null,
    };
  },
  getAttendance: async (
    startDate: string,
    endDate: string,
    ticketType?: string,
  ): Promise<TechAttendance[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (ticketType) params.append('ticketType', ticketType);
    const response = await apiClient.get(`/attendance?${params}`);
    return response.data;
  },
    deleteAttendance: async (userId: number, date: string): Promise<any> => {
      const response = await apiClient.delete(`/attendance/${userId}/${date}`);
      return response.data;
    },
  setAttendance: async (data: {
    userId: number;
    date: string;
    status: AttendanceStatus;
    notes?: string;
    clockInTime?: string;
  }): Promise<TechAttendance> => {
    const response = await apiClient.post(`/attendance`, data);
    return response.data;
  },
  bulkSetAttendance: async (data: {
    entries: { userId: number; date: string; status: AttendanceStatus; notes?: string }[];
  }): Promise<TechAttendance[]> => {
    const response = await apiClient.post(`/attendance/bulk`, data);
    return response.data;
  },
  getAvailableTechnicians: async (
    ticketType: string,
    date: string,
  ): Promise<AttendanceTechnicianRecord[]> => {
    const response = await apiClient.get(
      `/attendance/technicians?ticketType=${ticketType}&date=${date}`,
    );
    return response.data;
  },
  getTechnicians: async (ticketType?: string): Promise<AttendanceTechnicianRecord[]> => {
    const params = ticketType ? `?ticketType=${ticketType}` : '';
    const response = await apiClient.get(`/attendance/technicians${params}`);
    return response.data;
  },
  getStaffLogins: async (date?: string): Promise<StaffLoginRecord[]> => {
    const params = date ? `?date=${date}` : '';
    const response = await apiClient.get(`/attendance/staff-logins${params}`);
    return response.data;
  },
  getStaffLoginsMonthly: async (
    startDate: string,
    endDate: string,
  ): Promise<StaffLoginRecord[]> => {
    const response = await apiClient.get(
      `/attendance/staff-logins-monthly?startDate=${startDate}&endDate=${endDate}`,
    );
    return response.data;
  },

  // Office days
  getOfficeDays: async (startDate: string, endDate: string): Promise<OfficeDay[]> => {
    const params = new URLSearchParams();
    if (startDate) params.append('startDate', startDate);
    if (endDate) params.append('endDate', endDate);
    const response = await apiClient.get(`/attendance/office-days?${params}`);
    return response.data;
  },
  setOfficeDay: async (data: {
    date: string;
    isOfficeDay: boolean;
    notes?: string;
  }): Promise<OfficeDay> => {
    const response = await apiClient.post(`/attendance/office-days`, data);
    return response.data;
  },
  bulkSetOfficeDays: async (data: {
    days: { date: string; isOfficeDay: boolean; notes?: string }[];
  }): Promise<OfficeDay[]> => {
    const response = await apiClient.post(`/attendance/office-days/bulk`, data);
    return response.data;
  },
};

export const notificationsApi = {
  getUnreadCount: async (): Promise<{ count: number }> => {
    const response = await apiClient.get('/notifications/unread-count');
    return response.data;
  },
  getMyNotifications: async (): Promise<any[]> => {
    const response = await apiClient.get('/notifications/mine');
    return response.data;
  },
  markAllRead: async (): Promise<{ success: boolean }> => {
    const response = await apiClient.post('/notifications/mark-read');
    return response.data;
  },
};
