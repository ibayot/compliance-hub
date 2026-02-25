import { apiClient } from '@/lib/api/client';

export interface Issuance {
  id: string;
  issuance_number: string;
  title: string;
  description?: string;
  issuing_authority: string;
  issue_date: string;
  effectivity_date?: string;
  source_url?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  documents?: any[];
}

export interface CreateIssuanceDto {
  issuance_number: string;
  title: string;
  description?: string;
  issuing_authority: string;
  issue_date: string;
  effectivity_date?: string;
  source_url?: string;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  subject: string;
  description: string;
  issue_type: 'policy_gap' | 'missing_evidence' | 'data_inconsistency' | 'late_submission' | 'security_incident' | 'other';
  issue_type_id?: string;
  issue_type_config?: TicketConfigOption;
  category: 'document_related' | 'system_issue' | 'compliance_query' | 'training_request' | 'other';
  category_id?: string;
  category_config?: TicketConfigOption;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  reported_by_id: string;
  assigned_to_id?: string;
  unit_id?: string;
  resolved_at?: string;
  resolution_steps?: string;
  resolution_date?: string;
  created_at: string;
  updated_at: string;
  reported_by?: any;
  assigned_to?: any;
  unit?: any;
  comments?: TicketComment[];
}

export interface TicketComment {
  id: string;
  ticket_id: string;
  comment: string;
  user_id: string;
  created_at: string;
  user?: any;
}

export interface CreateTicketDto {
  subject: string;
  description: string;
  issue_type?: Ticket['issue_type'];
  issue_type_id?: string;
  category: Ticket['category'];
  category_id?: string;
  priority: Ticket['priority'];
  resolution_steps?: string;
  resolution_date?: string;
  unit_id?: string;
}

export interface TicketConfigOption {
  id: string;
  key: string;
  name: string;
  description?: string;
  is_active: boolean;
  is_deleted?: boolean;
}

export interface UpsertTicketConfigDto {
  key: string;
  name: string;
  description?: string;
  is_active?: boolean;
  category_id?: string;
}

// Issuances API
export const issuancesApi = {
  getAll: async (
    filters?: { authority?: string; search?: string; is_active?: boolean },
  ): Promise<Issuance[]> => {
    const params = new URLSearchParams();
    if (filters?.authority) params.append('authority', filters.authority);
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
};

// Tickets API
export const ticketsApi = {
  getAll: async (
    filters?: Partial<Pick<Ticket, 'status' | 'priority' | 'category' | 'unit_id'>>,
  ): Promise<Ticket[]> => {
    const params = new URLSearchParams();
    if (filters?.status) params.append('status', filters.status);
    if (filters?.priority) params.append('priority', filters.priority);
    if (filters?.category) params.append('category', filters.category);
    if (filters?.unit_id) params.append('unit_id', filters.unit_id);

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

  update: async (
    id: string,
    data: Partial<Ticket>,
  ): Promise<Ticket> => {
    const response = await apiClient.put(`/tickets/${id}`, data);
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/tickets/${id}`);
  },

  addComment: async (
    ticketId: string,
    comment: string,
  ): Promise<TicketComment> => {
    const response = await apiClient.post(
      `/tickets/${ticketId}/comments`,
      { comment },
    );
    return response.data;
  },

  getStatistics: async (): Promise<any> => {
    const response = await apiClient.get(`/tickets/statistics`);
    return response.data;
  },

  listIssueTypes: async (
    activeOnly = true,
    categoryId?: string,
  ): Promise<TicketConfigOption[]> => {
    const response = await apiClient.get(`/tickets/issue-types`, {
      params: { active_only: activeOnly, category_id: categoryId },
    });
    return response.data;
  },

  createIssueType: async (data: UpsertTicketConfigDto): Promise<TicketConfigOption> => {
    const response = await apiClient.post(`/tickets/issue-types`, data);
    return response.data;
  },

  updateIssueType: async (
    id: string,
    data: Partial<UpsertTicketConfigDto>,
  ): Promise<TicketConfigOption> => {
    const response = await apiClient.put(`/tickets/issue-types/${id}`, data);
    return response.data;
  },

  deleteIssueType: async (id: string): Promise<void> => {
    await apiClient.delete(`/tickets/issue-types/${id}`);
  },

  listCategories: async (activeOnly = true): Promise<TicketConfigOption[]> => {
    const response = await apiClient.get(`/tickets/categories`, {
      params: { active_only: activeOnly },
    });
    return response.data;
  },

  createCategory: async (data: UpsertTicketConfigDto): Promise<TicketConfigOption> => {
    const response = await apiClient.post(`/tickets/categories`, data);
    return response.data;
  },

  updateCategory: async (
    id: string,
    data: Partial<UpsertTicketConfigDto>,
  ): Promise<TicketConfigOption> => {
    const response = await apiClient.put(`/tickets/categories/${id}`, data);
    return response.data;
  },

  deleteCategory: async (id: string): Promise<void> => {
    await apiClient.delete(`/tickets/categories/${id}`);
  },
};
