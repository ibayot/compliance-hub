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
  documents?: any[];
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

export type TicketType = 'desktop_support' | 'it_support';
export type TicketStatus = 'open' | 'assigned' | 'in_progress' | 'resolved' | 'closed';
export type TicketPriority = 'low' | 'medium' | 'high' | 'urgent';

export interface Ticket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  ticketType: TicketType;
  status: TicketStatus;
  priority: TicketPriority;
  requesterId: number;
  requester?: { id: number; email: string; firstName?: string; lastName?: string };
  assignedToId?: number | null;
  assignedTo?: { id: number; email: string; firstName?: string; lastName?: string } | null;
  resolutionNotes?: string | null;
  resolvedAt?: string | null;
  satisfactionRating?: number | null;
  satisfactionComment?: string | null;
  satisfactionSubmittedAt?: string | null;
  comments?: TicketComment[];
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
  /** Staff only: override the requester (for walk-ins / phone calls) */
  requesterId?: number;
}

export interface UpdateTicketDto {
  subject?: string;
  description?: string;
  status?: TicketStatus;
  priority?: TicketPriority;
  resolutionNotes?: string;
}

export interface AssignTicketDto {
  assignedToId: number;
}

export interface SubmitSatisfactionDto {
  rating: number;
  comment?: string;
}

export interface TechnicianOption {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  openCount: number;
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
  }): Promise<Ticket[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.ticketType) params.append('ticketType', filters.ticketType);
    if (filters?.requesterId) params.append('requesterId', String(filters.requesterId));
    if (filters?.assignedToId) params.append('assignedToId', String(filters.assignedToId));
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

  getStatistics: async (): Promise<any> => {
    const response = await apiClient.get(`/tickets/statistics`);
    return response.data;
  },

  getDashboardStats: async (): Promise<TicketDashboardStats> => {
    const response = await apiClient.get(`/tickets/dashboard`);
    return response.data;
  },

  getTechnicians: async (): Promise<TechnicianOption[]> => {
    const response = await apiClient.get(`/tickets/technicians`);
    return response.data;
  },
};

