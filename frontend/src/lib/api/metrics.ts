import { apiClient } from './client';

export interface MetricApplicability {
  id: string;
  metric_id: string;
  unit_id?: number;
  document_type?: string;
  reportorial_doc_type_id?: number;
  unit?: {
    id: number;
    name: string;
    description?: string;
  };
}

export interface MetricTemplate {
  id: string;
  name: string;
  description?: string;
  metric_type: 'section_check' | 'keyword_check' | 'property_check' | 'date_check';
  rule_config: Record<string, any>;
  pass_criteria: Record<string, any>;
  weight: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  applicability?: MetricApplicability[];
}

export interface CreateMetricTemplateRequest {
  name: string;
  description?: string;
  metric_type: string;
  rule_config: Record<string, any>;
  pass_criteria: Record<string, any>;
  weight?: number;
  applicability?: Array<{
    unit_id?: number;
    document_type?: string;
    reportorial_doc_type_id?: number;
  }>;
}

export const metricsApi = {
  listTemplates: async (): Promise<MetricTemplate[]> => {
    const response = await apiClient.get('/metrics');
    return response.data;
  },

  getTemplate: async (id: string): Promise<MetricTemplate> => {
    const response = await apiClient.get(`/metrics/${id}`);
    return response.data;
  },

  createTemplate: async (
    data: CreateMetricTemplateRequest,
  ): Promise<MetricTemplate> => {
    const response = await apiClient.post('/metrics', data);
    return response.data;
  },

  updateTemplate: async (
    id: string,
    data: Partial<CreateMetricTemplateRequest> & { is_active?: boolean },
  ): Promise<MetricTemplate> => {
    const response = await apiClient.patch(`/metrics/${id}`, data);
    return response.data;
  },

  deleteTemplate: async (id: string): Promise<void> => {
    await apiClient.delete(`/metrics/${id}`);
  },
};
