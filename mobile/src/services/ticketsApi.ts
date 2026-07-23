import api from './api';

export const ticketsApi = {
  getTechnicians: async () => {
    const res = await api.get('/tickets/technicians');
    return res.data;
  },
  getDashboardStats: async () => {
    const res = await api.get('/tickets/dashboard');
    return res.data;
  },
  getAssignedStats: async (year: number, month: number) => {
    const res = await api.get(`/tickets/assigned-stats?year=${year}&month=${month}`);
    return res.data;
  },
  getAll: async (params?: any) => {
    const qs = params ? new URLSearchParams(params).toString() : '';
    const res = await api.get(`/tickets${qs ? '?' + qs : ''}`);
    return res.data;
  },
  getById: async (id: string) => {
    const res = await api.get(`/tickets/${id}`);
    return res.data;
  },
  create: async (data: any, isFormData = false) => {
    const res = await api.post('/tickets', data, {
      headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
    });
    return res.data;
  },
  assign: async (id: string, assignedToId: number | null) => {
    const res = await api.patch(`/tickets/${id}/assign`, { assignedToId });
    return res.data;
  },
  updateTicket: async (id: string, data: any) => {
    const res = await api.patch(`/tickets/${id}`, data);
    return res.data;
  },
  escalate: async (ticketId: string, data: any) => {
    const res = await api.post(`/tickets/${ticketId}/escalate`, data, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return res.data;
  },

  addComment: async (ticketId: string, comment: string, isInternal: boolean, isFormData = false) => {
    const res = await api.post(`/tickets/${ticketId}/comments`, 
      isFormData ? comment : { comment, isInternal }, 
      {
        headers: isFormData ? { 'Content-Type': 'multipart/form-data' } : undefined
      }
    );
    return res.data;
  },
  globalPause: async () => {
    const res = await api.post('/tickets/global-pause');
    return res.data;
  },
  getSlaSummary: async () => {
    const res = await api.get('/tickets/sla/summary');
    return res.data;
  }
};
