import { apiClient } from './client';

export type ChangelogCategory = 'feature' | 'enhancement' | 'bug_fix';
export type ChangelogAudience = 'capability' | 'end_user' | 'staff';

export interface ReleaseNote {
  id: string;
  category: ChangelogCategory;
  audience: ChangelogAudience;
  title: string;
  description: string;
  capabilityKeys: string[];
}

export interface AppRelease {
  id: string;
  version: string;
  title: string;
  endUserTitle?: string | null;
  displayDays: number;
  status: 'draft' | 'published';
  publishedAt?: string;
  automaticEndAt?: string;
  notes: ReleaseNote[];
}

export interface ReleaseDraftInput {
  version: string;
  title: string;
  endUserTitle?: string | null;
  displayDays: number;
  notes: Array<Omit<ReleaseNote, 'id'>>;
}

export const changelogApi = {
  prompt: async () => (await apiClient.get('/changelog/prompt')).data as AppRelease[],

  history: async () => (await apiClient.get('/changelog/history')).data as AppRelease[],

  displayed: (releaseIds: string[]) => apiClient.post('/changelog/displayed', { releaseIds }),

  acknowledge: (releaseIds: string[]) => apiClient.post('/changelog/acknowledge', { releaseIds }),

  adminList: async () => (await apiClient.get('/changelog/admin/releases')).data as AppRelease[],

  adminCapabilities: async () =>
    (await apiClient.get('/changelog/admin/capabilities')).data as string[],

  create: async (data: ReleaseDraftInput) =>
    (await apiClient.post('/changelog/admin/releases', data)).data as AppRelease,

  update: async (id: string, data: ReleaseDraftInput) =>
    (await apiClient.patch(`/changelog/admin/releases/${id}`, data)).data as AppRelease,

  publish: (id: string) => apiClient.post(`/changelog/admin/releases/${id}/publish`),

  remove: (id: string) => apiClient.delete(`/changelog/admin/releases/${id}`),
};
