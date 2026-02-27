import { apiClient } from './client';

export type KpiType = 'measurement' | 'yes_no';
export type KpiDirection = 'higher_is_better' | 'lower_is_better';
export type KpiFrequency = 'monthly' | 'quarterly' | 'semestral' | 'annual';
export type KpiMonitoringStatus = 'draft' | 'locked';

export interface KpiMasterRecord {
  code: string;
  name: string;
  description?: string;
  unitId: number;
  type: KpiType;
  unitOfMeasure?: string;
  direction: KpiDirection;
  targetValue: number;
  weight: number;
  frequency: KpiFrequency;
  active: boolean;
  unit?: { id: number; name: string };
}

export interface KpiMonitoringRecord {
  id: number;
  kpiMasterCode: string;
  unitId: number;
  periodYear: number;
  periodMonth: number;
  actualValue: number;
  remarks?: string;
  enteredByStaffId?: string;
  enteredByName?: string;
  status: KpiMonitoringStatus;
  kpiMaster?: KpiMasterRecord;
  unit?: { id: number; name: string };
}

export interface KpiThreshold {
  id: number;
  band: string;
  minScore: number;
  maxScore: number;
  color?: string;
}

export interface KpiScoringRule {
  id: number;
  name: string;
  active: boolean;
  capScore: number;
  floorScore: number;
  yesScore: number;
  noScore: number;
}

export interface DashboardSummaryResponse {
  summary: {
    overallScore: number;
    unitCount: number;
    rowCount: number;
    periodYear: number;
    periodMonth: number;
  };
  units: Array<{
    unitId: number;
    unitName: string;
    score: number;
    kpiCount: number;
    band: string;
  }>;
  thresholds: KpiThreshold[];
}

export interface UnitDashboardResponse {
  unitId: number;
  unitName: string;
  score: number;
  band: string;
  periodYear: number;
  periodMonth: number;
  details: Array<{
    id: number;
    code: string;
    name: string;
    type: KpiType;
    direction: KpiDirection;
    unitOfMeasure?: string;
    targetValue: number;
    actualValue: number;
    weight: number;
    normalizedScore: number;
    status: KpiMonitoringStatus;
    band: string;
    remarks?: string;
  }>;
}

export const kpiApi = {
  listMaster: async (): Promise<KpiMasterRecord[]> => {
    const response = await apiClient.get('/kpi/master');
    return response.data;
  },

  createMaster: async (payload: Partial<KpiMasterRecord> & { code: string; name: string; unitId: number; type: KpiType; direction: KpiDirection; targetValue: number; weight: number; }) => {
    const response = await apiClient.post('/kpi/master', payload);
    return response.data as KpiMasterRecord;
  },

  updateMaster: async (code: string, payload: Partial<KpiMasterRecord>) => {
    const response = await apiClient.patch(`/kpi/master/${code}`, payload);
    return response.data as KpiMasterRecord;
  },

  removeMaster: async (code: string) => {
    const response = await apiClient.delete(`/kpi/master/${code}`);
    return response.data;
  },

  listMonitoring: async (params: { periodYear?: number; periodMonth?: number; unitId?: number; kpiMasterCode?: string }) => {
    const response = await apiClient.get('/kpi/monitoring', { params });
    return response.data as KpiMonitoringRecord[];
  },

  upsertMonitoring: async (payload: {
    kpiMasterCode: string;
    unitId: number;
    periodYear: number;
    periodMonth: number;
    actualValue: number;
    remarks?: string;
    status?: KpiMonitoringStatus;
  }) => {
    const response = await apiClient.post('/kpi/monitoring', payload);
    return response.data as KpiMonitoringRecord;
  },

  updateMonitoring: async (id: number, payload: Partial<{ actualValue: number; remarks: string; status: KpiMonitoringStatus }>) => {
    const response = await apiClient.patch(`/kpi/monitoring/${id}`, payload);
    return response.data as KpiMonitoringRecord;
  },

  lockMonitoring: async (id: number) => {
    const response = await apiClient.patch(`/kpi/monitoring/${id}/lock`, {});
    return response.data as KpiMonitoringRecord;
  },

  dashboardSummary: async (periodYear: number, periodMonth: number) => {
    const response = await apiClient.get('/kpi/dashboard/summary', { params: { periodYear, periodMonth } });
    return response.data as DashboardSummaryResponse;
  },

  dashboardUnit: async (unitId: number, periodYear: number, periodMonth: number) => {
    const response = await apiClient.get(`/kpi/dashboard/unit/${unitId}`, { params: { periodYear, periodMonth } });
    return response.data as UnitDashboardResponse;
  },

  listThresholds: async () => {
    const response = await apiClient.get('/kpi/lookups/thresholds');
    return response.data as KpiThreshold[];
  },

  listScoringRules: async () => {
    const response = await apiClient.get('/kpi/lookups/scoring-rules');
    return response.data as KpiScoringRule[];
  },
};
