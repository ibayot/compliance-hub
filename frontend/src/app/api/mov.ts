import { apiClient } from '@/lib/api/client';

export interface MovArtifact {
  id: string;
  artifact_type: string;
  scope: string;
  title: string;
  period_year: number;
  quarter?: number | null;
  unit_id?: number | null;
  status: string;
  content_markdown: string;
  metadata_json?: Record<string, any> | null;
  created_by?: number | null;
  created_at: string;
  updated_at: string;
}

export interface CreateMovArtifactDto {
  artifact_type: string;
  scope?: string;
  title: string;
  period_year: number;
  quarter?: number;
  unit_id?: number;
  status?: string;
  content_markdown: string;
  metadata_json?: Record<string, any>;
}

export interface MovTemplateResponse {
  title: string;
  content_markdown: string;
}

export interface RegisterReportResponse {
  title: string;
  content_html: string;
  content_markdown: string;
  summary: {
    total: number;
    compliant: number;
    ready: number;
    addedEntries: number;
  };
}

export interface AssessmentReportResponse {
  title: string;
  report_html: string;
  report_markdown: string;
  checklist: Array<{ item: string; passed: boolean; evidence: string }>;
  summary: {
    plan_entries: number;
    schedule_entries: number;
    completed_schedule: number;
    kpi_rows: number;
    kpi_below_target: number;
  };
}

export interface MonitoringMatrixReportResponse {
  title: string;
  content_html: string;
  content_markdown: string;
  summary: { total: number };
}

export const movApi = {
  list: async (filters?: {
    artifact_type?: string;
    period_year?: number;
    quarter?: number;
    scope?: string;
    unit_id?: number;
  }): Promise<MovArtifact[]> => {
    const params = new URLSearchParams();
    if (filters?.artifact_type) params.append('artifact_type', filters.artifact_type);
    if (filters?.period_year) params.append('period_year', String(filters.period_year));
    if (filters?.quarter) params.append('quarter', String(filters.quarter));
    if (filters?.scope) params.append('scope', filters.scope);
    if (filters?.unit_id) params.append('unit_id', String(filters.unit_id));

    const response = await apiClient.get(`/mov/artifacts?${params.toString()}`);
    return response.data;
  },

  create: async (payload: CreateMovArtifactDto): Promise<MovArtifact> => {
    const response = await apiClient.post('/mov/artifacts', payload);
    return response.data;
  },

  update: async (id: string, payload: Partial<CreateMovArtifactDto>): Promise<MovArtifact> => {
    const response = await apiClient.put(`/mov/artifacts/${id}`, payload);
    return response.data;
  },

  remove: async (id: string): Promise<void> => {
    await apiClient.delete(`/mov/artifacts/${id}`);
  },

  getTemplate: async (query: {
    type: string;
    year?: number;
    quarter?: number;
    scope?: string;
    unitName?: string;
  }): Promise<MovTemplateResponse> => {
    const params = new URLSearchParams();
    params.append('type', query.type);
    if (query.year) params.append('year', String(query.year));
    if (query.quarter) params.append('quarter', String(query.quarter));
    if (query.scope) params.append('scope', query.scope);
    if (query.unitName) params.append('unitName', query.unitName);

    const response = await apiClient.get(`/mov/templates?${params.toString()}`);
    return response.data;
  },

  getRegisterColumns: async (): Promise<string[]> => {
    const response = await apiClient.get('/mov/register-columns');
    return response.data;
  },

  generateRegisterReport: async (query: {
    year: number;
    quarter: number;
    scope?: string;
    unit?: string;
    register_type?: 'legal' | 'standards' | 'internal' | 'all';
  }): Promise<RegisterReportResponse> => {
    const response = await apiClient.get('/mov/reports/register', { params: query });
    return response.data;
  },

  generateMonitoringMatrixReport: async (query: {
    year: number;
    quarter: number;
    scope?: string;
    unit?: string;
  }): Promise<MonitoringMatrixReportResponse> => {
    const response = await apiClient.get('/mov/reports/monitoring-matrix', { params: query });
    return response.data;
  },

  generateAssessmentReport: async (query: {
    year: number;
    quarter: number;
    unit_id?: number;
    manual_remarks?: Record<string, string>;
  }): Promise<AssessmentReportResponse> => {
    const response = await apiClient.post('/mov/reports/assessment', query);
    return response.data;
  },
};
