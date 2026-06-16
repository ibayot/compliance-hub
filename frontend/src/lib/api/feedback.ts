import { apiClient as api } from './client';
import { User } from '../types/auth';

export interface Feedback {
  id: number;
  suggestion: string;
  status: 'pending' | 'accepted' | 'rejected';
  createdAt: string;
  submitterId: number | null;
  actedById: number | null;
  actedBy?: User;
}

export const feedbackApi = {
  create: async (data: { suggestion: string }): Promise<Feedback> => {
    const res = await api.post('/feedback', data);
    return res.data;
  },
  
  list: async (status: 'all' | 'pending' | 'accepted' | 'rejected' = 'all', page = 1, limit = 10): Promise<{ data: Feedback[]; total: number }> => {
    const res = await api.get('/feedback', { params: { status, page, limit } });
    return res.data;
  },

  updateStatus: async (id: number, status: 'accepted' | 'rejected'): Promise<Feedback> => {
    const res = await api.patch(`/feedback/${id}/status`, { status });
    return res.data;
  }
};
