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
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed' | 'freeze' | 'duplicate';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

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
  requesterId: number;
  requester?: { id: number; email: string; firstName?: string; lastName?: string };
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
  user?: { id: number; email: string; firstName?: string; lastName?: string };
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  ticketType: TicketType;
  priority?: TicketPriority;
  categoryId?: string;
  /** Staff only: override the requester (for walk-ins / phone calls) */
  requesterId?: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionNotes?: string;
  /** Required when status = 'duplicate' */
  duplicateOfId?: string;
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
}

export interface TechAssignedStats {
  total: number;
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  satisfactionAvg: number | null;
}

export interface TicketReportResult {
  totalTickets: number;
  totalWithRating: number;
  avgOverallRating: number | null;
  avgRatingByType: Array<{ type: string; avg: number; count: number }>;
  avgRatingByTechnician: Array<{ techId: number; techName: string; avg: number; count: number }>;
  totalEscalations: number;
  acceptedEscalations: number;
  returnedEscalations: number;
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
  roleValue: string;
  label: string;
  createdAt: string;
}

// --- v0.6 Ticket Settings / Attendance types --------------------------------

export interface TicketCategory {
  id: string;
  key: string;
  name: string;
  ticketType: string;
  slaHours?: number | null;
  isActive: boolean;
  isDeleted: boolean;
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
  /** Populated relation — backend serialises as targetCategory */
  targetCategory?: TicketCategory | null;
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
  getAll: async (
    filters?: { authority?: string; category?: string; search?: string; is_active?: boolean },
  ): Promise<Issuance[]> => {
    const params = new URLSearchParams();
    if (filters?.authority) params.append('authority', filters.authority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.search) params.append('search', filters.search);
    if (filters?.is_active !== undefined)
      params.append('is_active', String(filters.is_active));

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

  update: async (
    id: string,
    data: Partial<CreateIssuanceDto>,
  ): Promise<Issuance> => {
    const response = await apiClient.put(`/issuances/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/issuances/${id}`);
  },

  linkDocument: async (
    issuanceId: string,
    documentId: string,
  ): Promise<void> => {
    await apiClient.post(
      `/issuances/${issuanceId}/documents/${documentId}`,
      {},
    );
  },

  unlinkDocument: async (
    issuanceId: string,
    documentId: string,
  ): Promise<void> => {
    await apiClient.delete(
      `/issuances/${issuanceId}/documents/${documentId}`,
    );
  },

  uploadAttachment: async (issuanceId: string, file: File): Promise<Issuance> => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await apiClient.post(`/issuances/${issuanceId}/attachment`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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

// Tickets API (IT Help Desk)
export const ticketsApi = {
  getAll: async (filters?: {
    status?: TicketStatus;
    ticketType?: TicketType;
    requesterId?: number;
    assignedToId?: number;
    escalatedToMe?: boolean;
  }): Promise<Ticket[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    if (filters?.requesterId) params.append('requesterId', String(filters.requesterId));
    if (filters?.assignedToId) params.append('assignedToId', String(filters.assignedToId));
    if (filters?.escalatedToMe) params.append('escalatedToMe', 'true');
    const response = await apiClient.get(`/tickets?${params}`);
    return response.data;
  },

  getById: async (id: string): Promise<Ticket> => {
    const response = await apiClient.get(`/tickets/${id}`);
    return response.data;
  },

  create: async (data: CreateTicketDto): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets`, data);
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

  addComment: async (ticketId: string, comment: string, isInternal = false): Promise<TicketComment> => {
    const response = await apiClient.post(`/tickets/${ticketId}/comments`, { comment, isInternal });
    return response.data;
  },

  submitSatisfaction: async (id: string, data: SubmitSatisfactionDto): Promise<Ticket> => {
    const response = await apiClient.post(`/tickets/${id}/satisfaction`, data);
    return response.data;
  },

  getStatistics: async (): Promise<Record<string, unknown>> => {
    const response = await apiClient.get(`/tickets/statistics`);
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

  /** Get detailed ratings report (Tickets, Techs, Days/Weeks/Months/Quarters) */
  getRatingsReport: async (filters?: {
    year?: number;
    month?: number;
    quarter?: number;
    technicianId?: number;
  }): Promise<RatingsReportResult> => {
    const params = new URLSearchParams();
    if (filters?.year) params.append('year', String(filters.year));
    if (filters?.month) params.append('month', String(filters.month));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.technicianId) params.append('technicianId', String(filters.technicianId));
    const response = await apiClient.get(`/tickets/ratings-report?${params}`);
    return response.data;
  },

  /** Get technicians who had tickets in a given period (for reports dropdown) */
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

  // --- Escalation ---
  getEscalations: async (ticketId: string): Promise<TicketEscalation[]> => {
    const response = await apiClient.get(`/tickets/${ticketId}/escalations`);
    return response.data;
  },

  escalateTicket: async (ticketId: string, data: FormData): Promise<TicketEscalation> => {
    const response = await apiClient.post(`/tickets/${ticketId}/escalate`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  acceptEscalation: async (ticketId: string, escalationId: string): Promise<TicketEscalation> => {
    const response = await apiClient.patch(`/tickets/${ticketId}/escalation/${escalationId}/accept`);
    return response.data;
  },

  returnEscalation: async (ticketId: string, escalationId: string, returnReason: string): Promise<TicketEscalation> => {
    const response = await apiClient.patch(`/tickets/${ticketId}/escalation/${escalationId}/return`, { returnReason });
    return response.data;
  },

  updateEscalationProof: async (ticketId: string, escalationId: string, data: FormData): Promise<TicketEscalation> => {
    const response = await apiClient.patch(`/tickets/${ticketId}/escalation/${escalationId}/update-proof`, data, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
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
  createCategory: async (data: { name: string; ticketType: string; slaHours?: number | null; isActive?: boolean }): Promise<TicketCategory> => {
    const response = await apiClient.post(`/ticket-settings/categories`, data);
    return response.data;
  },
  updateCategory: async (id: string, data: Partial<{ name: string; ticketType: string; slaHours: number | null; isActive: boolean }>): Promise<TicketCategory> => {
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
    return (response.data as TicketKeywordRule[]).map(rule => ({
      ...rule,
      keywords: parseKeywordListField(rule.keywords, rule.keyword),
    }));
  },
  createKeywordRule: async (data: { keywords: string[]; targetTicketType: string; targetCategoryId?: string; isActive?: boolean }): Promise<TicketKeywordRule> => {
    const response = await apiClient.post(`/ticket-settings/keyword-rules`, data);
    return response.data;
  },
  updateKeywordRule: async (id: string, data: Partial<{ keywords: string[]; targetTicketType: string; targetCategoryId?: string; isActive: boolean }>): Promise<TicketKeywordRule> => {
    const response = await apiClient.patch(`/ticket-settings/keyword-rules/${id}`, data);
    return response.data;
  },
  deleteKeywordRule: async (id: string): Promise<void> => {
    await apiClient.delete(`/ticket-settings/keyword-rules/${id}`);
  },

  // Escalation Focals (QA #3, #13)
  getEscalationFocals: async (ticketType?: string): Promise<EscalationFocalConfig[]> => {
    const params = ticketType ? `?ticketType=${ticketType}` : '';
    const response = await apiClient.get(`/ticket-settings/escalation-focals${params}`);
    return response.data;
  },
  getAvailableEscalationRoles: async (): Promise<{ value: string; label: string }[]> => {
    const response = await apiClient.get(`/ticket-settings/escalation-available-roles`);
    return response.data;
  },
  addEscalationFocal: async (data: { ticketType: string; roleValue: string; label: string }): Promise<EscalationFocalConfig> => {
    const response = await apiClient.post(`/ticket-settings/escalation-focals`, data);
    return response.data;
  },
  removeEscalationFocal: async (id: number): Promise<void> => {
    await apiClient.delete(`/ticket-settings/escalation-focals/${id}`);
  },
};

// Attendance API
export const attendanceApi = {
  // Tech attendance
  getAttendance: async (startDate: string, endDate: string, ticketType?: string): Promise<TechAttendance[]> => {
    const params = new URLSearchParams({ startDate, endDate });
    if (ticketType) params.append('ticketType', ticketType);
    const response = await apiClient.get(`/attendance?${params}`);
    return response.data;
  },
  setAttendance: async (data: { userId: number; date: string; status: AttendanceStatus; notes?: string }): Promise<TechAttendance> => {
    const response = await apiClient.post(`/attendance`, data);
    return response.data;
  },
  bulkSetAttendance: async (data: { entries: { userId: number; date: string; status: AttendanceStatus; notes?: string }[] }): Promise<TechAttendance[]> => {
    const response = await apiClient.post(`/attendance/bulk`, data);
    return response.data;
  },
  getAvailableTechnicians: async (ticketType: string, date: string): Promise<AttendanceTechnicianRecord[]> => {
    const response = await apiClient.get(`/attendance/technicians?ticketType=${ticketType}&date=${date}`);
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
  getStaffLoginsMonthly: async (startDate: string, endDate: string): Promise<StaffLoginRecord[]> => {
    const response = await apiClient.get(`/attendance/staff-logins-monthly?startDate=${startDate}&endDate=${endDate}`);
    return response.data;
  },

  // Office days
  getOfficeDays: async (month?: string, year?: string): Promise<OfficeDay[]> => {
    const params = new URLSearchParams();
    if (month) params.append('month', month);
    if (year) params.append('year', year);
    const response = await apiClient.get(`/attendance/office-days?${params}`);
    return response.data;
  },
  setOfficeDay: async (data: { date: string; isOfficeDay: boolean; notes?: string }): Promise<OfficeDay> => {
    const response = await apiClient.post(`/attendance/office-days`, data);
    return response.data;
  },
  bulkSetOfficeDays: async (data: { days: { date: string; isOfficeDay: boolean; notes?: string }[] }): Promise<OfficeDay[]> => {
    const response = await apiClient.post(`/attendance/office-days/bulk`, data);
    return response.data;
  },
};
