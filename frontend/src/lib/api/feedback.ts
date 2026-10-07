import { apiClient as api } from './client';
import { User } from '../types/auth';

export interface Feedback {
  id: number;
  suggestion: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  submitterId: number | null;
  submitter?: User;
  actedById: number | null;
  actedBy?: User;
  attachments?: Array<{
    id: string;
    originalFileName: string;
    mimeType: string;
    fileSize: number;
    createdAt: string;
  }>;
}

export const feedbackApi = {
  create: async (data: { suggestion: string }): Promise<Feedback> => {
    const res = await api.post('/feedback', data);
    return res.data;
  },

  uploadAttachments: async (feedbackId: number, files: File[]): Promise<void> => {
    const formData = new FormData();
    files.forEach((file) => formData.append('files', file));
    await api.post(`/feedback/${feedbackId}/attachments`, formData);
  },

  attachmentViewUrl: (attachmentId: string): string =>
    `/feedback/attachments/${attachmentId}/view`,

  list: async (
    status: 'all' | 'pending' | 'accepted' | 'rejected' = 'all',
    page = 1,
    limit = 10,
  ): Promise<{ data: Feedback[]; total: number }> => {
    const res = await api.get('/feedback', { params: { status, page, limit } });
    return res.data;
  },

  updateStatus: async (id: number, status: 'accepted' | 'rejected'): Promise<Feedback> => {
    const res = await api.patch(`/feedback/${id}/status`, { status });
    return res.data;
  },
};
