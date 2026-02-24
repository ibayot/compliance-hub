import { apiClient } from './client';

export interface CybersecurityMetric {
  id: number;
  metric_type: string;
  name: string;
  description?: string;
  status: 'compliant' | 'warning' | 'non_compliant' | 'unknown';
  value?: string;
  details?: string;
  last_checked?: string;
  api_endpoint?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const cybersecurityApi = {
  /**
   * Get all active cybersecurity metrics
   */
  getAll: async (): Promise<CybersecurityMetric[]> => {
    const response = await apiClient.get('/cybersecurity/metrics');
    return response.data;
  },

  /**
   * Get a single metric by ID
   */
  getById: async (id: number): Promise<CybersecurityMetric> => {
    const response = await apiClient.get(`/cybersecurity/metrics/${id}`);
    return response.data;
  },

  /**
   * Create a new cybersecurity metric
   */
  create: async (data: Partial<CybersecurityMetric>): Promise<CybersecurityMetric> => {
    const response = await apiClient.post('/cybersecurity/metrics', data);
    return response.data;
  },

  /**
   * Update a metric
   */
  update: async (id: number, data: Partial<CybersecurityMetric>): Promise<CybersecurityMetric> => {
    const response = await apiClient.put(`/cybersecurity/metrics/${id}`, data);
    return response.data;
  },

  /**
   * Delete a metric
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/cybersecurity/metrics/${id}`);
  },
};
