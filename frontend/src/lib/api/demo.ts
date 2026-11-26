import { apiClient } from './client';
import { boundedGet } from './bounded-read';

export const demoSupportTypes = ['IT Support', 'Desktop Support', 'Pantawid ICT Support', 'Specialized Concerns'] as const;
export const demoStatuses = { assigned: 'Assigned', in_progress: 'In Progress', resolved: 'Resolved', closed: 'Closed' };
export const demoUserPaths = {
  dashboard: '/dashboard',
  tickets: '/operations/my-tickets',
  knowledge: '/operations/knowledge-base',
  settings: '/admin/settings',
  manual: '/admin/user-manual',
} as const;

export interface DemoTicketSummary {
  id: string;
  runId: string;
  ticketNumber: string;
  subject: string;
  supportType: typeof demoSupportTypes[number];
  status: keyof typeof demoStatuses;
  createdAt: string;
}

export interface DemoTicket extends DemoTicketSummary {
  requesterId: number;
  technicianId: number;
  filedBy: number;
  description: string;
  categoryKey: string | null;
  categoryName: string | null;
  resolutionNotes: string | null;
  comments: Array<{ id: number; authorId: number; body: string; createdAt: string }>;
  events: Array<{ id: number; actorId: number; action: keyof typeof demoStatuses; createdAt: string }>;
  attachments: Array<{ id: string; fileName: string; mimeType: string; commentId?: number | null;
    replacesId?: string | null; uploadedBy?: number | null; createdAt?: string }>;
  rating: { rating: number; createdAt: string } | null;
}

export interface DemoDashboard {
  open: number;
  inProgress: number;
  resolved: number;
  closed: number;
  pendingCount: number;
  satisfactionFillRate: number;
}

export interface DemoState {
  active: { id: string; requesterId: number; technicianId: number; requesterApproved: boolean; technicianApproved: boolean } | null;
  retained: Array<{ id: string; purgeAfter: string }>;
  candidates: Array<{ id: number; email: string; demoRole: 'user' | 'technician'; approved: boolean }>;
}

const path = '/demo-tickets';
export const demoApi = {
  state: () => apiClient.get<DemoState>('/demo-mode').then(res => res.data),
  ready: () => apiClient.get<{ ready: boolean }>(`${path}/admin/readiness`).then(res => res.data.ready),
  enable: (requesterId: number, technicianId: number) =>
    apiClient.post<DemoState>('/demo-mode', { requesterId, technicianId }).then(res => res.data),
  disable: () => apiClient.delete<DemoState>('/demo-mode').then(res => res.data),
  list: (page: number, filters?: { status?: string; search?: string }) =>
    apiClient.get<{ items: DemoTicketSummary[]; hasMore: boolean }>(path, { params: { page, ...filters } }).then(res => res.data),
  dashboard: () => apiClient.get<DemoDashboard>(`${path}/dashboard`).then(res => res.data),
  requesterQueue: (params: URLSearchParams, signal?: AbortSignal) => boundedGet<{
    items?: Array<Omit<DemoTicket, 'comments' | 'attachments' | 'events' | 'rating'> & { satisfactionSubmittedAt: string | null }>;
    total?: number; statusCounts?: Record<string, number>; page?: number; limit?: number; totalPages?: number;
    neighbors?: { olderId: string | null; newerId: string | null };
  }>(`${path}/requester-queue?${params}`, { signal, timeoutMs: 30_000 }),
  categories: () => boundedGet<Array<{ id: string; name: string; supportType: DemoTicketSummary['supportType'] }>>(`${path}/requester-categories`),
  detail: (id: string) => apiClient.get<DemoTicket>(`${path}/${id}`).then(res => res.data),
  create: (subject: string, description: string, supportType: DemoTicketSummary['supportType']) =>
    apiClient.post<DemoTicket>(path, { subject, description, supportType }).then(res => res.data),
  createRequest: (data: FormData) => apiClient.post<DemoTicket>(path, data).then(res => res.data),
  createProxy: (runId: string, subject: string, description: string, supportType: DemoTicketSummary['supportType']) =>
    apiClient.post<DemoTicket>(`${path}/admin/proxy`, { runId, subject, description, supportType }).then(res => res.data),
  comment: (id: string, body: string) => apiClient.post<DemoTicket>(`${path}/${id}/comments`, { body }).then(res => res.data),
  commentWithImages: (id: string, data: FormData) => apiClient.post<DemoTicket & { addedCommentId: number }>(`${path}/${id}/comments`, data).then(res => res.data),
  close: (id: string) => apiClient.post<DemoTicket>(`${path}/${id}/requester-close`).then(res => res.data),
  status: (id: string, status: 'in_progress' | 'resolved', notes?: string) =>
    apiClient.patch<DemoTicket>(`${path}/${id}/status`, { status, notes }).then(res => res.data),
  rate: (id: string, likert: Array<number | 'NA'>) =>
    apiClient.post<DemoTicket>(`${path}/${id}/rating`, { consentGiven: true, likert }).then(res => res.data),
  upload: (id: string, file: File) => {
    const data = new FormData();
    data.append('file', file);
    return apiClient.post<DemoTicket>(`${path}/${id}/attachments`, data).then(res => res.data);
  },
  download: (id: string, attachmentId: string) => apiClient.get<Blob>(`${path}/${id}/attachments/${attachmentId}`, { responseType: 'blob' }).then(res => res.data),
  replaceImage: (id: string, attachmentId: string, file: File) => {
    const data = new FormData();
    data.append('file', file);
    return apiClient.post<DemoTicket>(`${path}/${id}/attachments/${attachmentId}/replacement`, data).then(res => res.data);
  },
  remove: (id: string) => apiClient.delete<{ deleted: boolean; filesPending: boolean }>(`${path}/${id}`).then(res => res.data),
};

export function demoDate(value: string) {
  const utc = value.endsWith('Z') ? value : value.replace(' ', 'T') + 'Z';
  return new Date(utc).toLocaleString('en-PH', { timeZone: 'Asia/Manila', dateStyle: 'medium', timeStyle: 'short' });
}
