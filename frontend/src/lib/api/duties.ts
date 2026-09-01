import { apiClient } from './client';

export type DutyType = 'OD' | 'ROC' | 'OPCEN' | 'CONFERENCE';
export type DutyAccess = { viewer: boolean; admin: boolean; canSchedule: boolean; currentOd: boolean };

export const dutiesApi = {
  access: async (): Promise<DutyAccess> => (await apiClient.get('/duties/access')).data,
  dashboard: async (date?: string) => (await apiClient.get('/duties/dashboard', { params: { date } })).data,
  rotation: async (date?: string) => (await apiClient.get('/duties/rotation', { params: { date } })).data,
  map: async (year: number, month: number) => (await apiClient.get('/duties/map', { params: { year, month } })).data,
  reconcile: async () => (await apiClient.post('/duties/reconcile')).data,
  logs: async (page = 1, limit = 10) => (await apiClient.get('/duties/logs', { params: { page, limit } })).data,
  saveLog: async (payload: any, id?: string) => (await (id ? apiClient.patch(`/duties/logs/${id}`, payload) : apiClient.post('/duties/logs', payload))).data,
  deleteLog: async (id: string) => apiClient.delete(`/duties/logs/${id}`),
  exceptions: async (page = 1, limit = 10) => (await apiClient.get('/duties/exceptions', { params: { page, limit } })).data,
  saveException: async (payload: any, id?: string) => (await (id ? apiClient.patch(`/duties/exceptions/${id}`, payload) : apiClient.post('/duties/exceptions', payload))).data,
  deleteException: async (id: string) => apiClient.delete(`/duties/exceptions/${id}`),
  roster: async () => (await apiClient.get('/duties/roster')).data,
  replaceRoster: async (userIds: number[]) => (await apiClient.post('/duties/roster', { userIds })).data,
  reservations: async (page = 1, limit = 10) => (await apiClient.get('/duties/reservations', { params: { page, limit } })).data,
  saveReservation: async (payload: any, id?: string) => (await (id ? apiClient.patch(`/duties/reservations/${id}`, payload) : apiClient.post('/duties/reservations', payload))).data,
  deleteReservation: async (id: string) => apiClient.delete(`/duties/reservations/${id}`),
  releaseCoverage: async (id: string) => (await apiClient.post(`/duties/coverages/${id}/release`)).data,
  activateCoverage: async (id: string, userId: number) => (await apiClient.post(`/duties/coverages/${id}/activate`, { userId })).data,
  skipCoverage: async (id: string, userId: number) => (await apiClient.post(`/duties/coverages/${id}/skip`, { userId })).data,
};
