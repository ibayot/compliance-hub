import { apiClient } from './client';

export interface Incident {
  id: number;
  title: string;
  description: string;
  category: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_by_id: number;
  assigned_to_id?: number;
  resolution_notes?: string;
  resolved_at?: string;
  created_at: string;
  updated_at: string;
  reported_by?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
  assigned_to?: {
    id: number;
    first_name: string;
    last_name: string;
    email: string;
  };
}

export interface IncidentStatistics {
  total: number;
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  criticalOpen: number;
}

export interface TodayStats {
  startCount: number;
  addedToday: number;
  currentCount: number;
  severityBreakdown: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
}

export interface IncidentDailySnapshot {
  id: number;
  snapshot_date: string;
  snapshot_time: string;
  snapshot_type: 'start' | 'end';
  low_count: number;
  medium_count: number;
  high_count: number;
  critical_count: number;
  total_count: number;
  low_added?: number;
  medium_added?: number;
  high_added?: number;
  critical_added?: number;
  total_added?: number;
  created_at: string;
}

export interface IncidentPeriodStatsItem {
  start: string;
  end: string;
  totalReported: number;
  bySeverity: {
    low: number;
    medium: number;
    high: number;
    critical: number;
  };
  byStatus: {
    open: number;
    in_progress: number;
    resolved: number;
    closed: number;
  };
  criticalOpen: number;
  resolvedWithinPeriod: number;
}

export interface IncidentPeriodStats {
  generatedAt: string;
  daily: IncidentPeriodStatsItem;
  weekly: IncidentPeriodStatsItem;
  monthly: IncidentPeriodStatsItem;
  quarterly: IncidentPeriodStatsItem;
  yearly: IncidentPeriodStatsItem;
}

export const incidentsApi = {
  /**
   * Get all incidents with optional filters
   */
  getAll: async (params?: {
    severity?: string;
    status?: string;
    category?: string;
  }): Promise<Incident[]> => {
    const response = await apiClient.get('/incidents', { params });
    return response.data;
  },

  /**
   * Get overall incident statistics
   */
  getStatistics: async (): Promise<IncidentStatistics> => {
    const response = await apiClient.get('/incidents/statistics');
    return response.data;
  },

  /**
   * Get today's incident tracking (8AM - 5PM)
   */
  getTodayStats: async (): Promise<TodayStats> => {
    const response = await apiClient.get('/incidents/today-stats');
    return response.data;
  },

  /**
   * Get period-based cybersecurity incident posture
   * (daily, weekly, monthly, quarterly, yearly)
   */
  getPeriodStats: async (): Promise<IncidentPeriodStats> => {
    const response = await apiClient.get('/incidents/period-stats');
    return response.data;
  },

  /**
   * Get latest daily snapshot
   */
  getLatestSnapshot: async (): Promise<IncidentDailySnapshot> => {
    const response = await apiClient.get('/incidents/snapshots/latest');
    return response.data;
  },

  /**
   * Get snapshots for a specific date (YYYY-MM-DD)
   */
  getSnapshotsByDate: async (date: string): Promise<IncidentDailySnapshot[]> => {
    const response = await apiClient.get(`/incidents/snapshots/${date}`);
    return response.data;
  },

  /**
   * Get a single incident by ID
   */
  getById: async (id: number): Promise<Incident> => {
    const response = await apiClient.get(`/incidents/${id}`);
    return response.data;
  },

  /**
   * Create a new incident
   */
  create: async (data: Partial<Incident>): Promise<Incident> => {
    const response = await apiClient.post('/incidents', data);
    return response.data;
  },

  /**
   * Update an incident
   */
  update: async (id: number, data: Partial<Incident>): Promise<Incident> => {
    const response = await apiClient.put(`/incidents/${id}`, data);
    return response.data;
  },

  /**
   * Delete an incident
   */
  delete: async (id: number): Promise<void> => {
    await apiClient.delete(`/incidents/${id}`);
  },
};
