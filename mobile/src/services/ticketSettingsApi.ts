import api from './api';

export const ticketSettingsApi = {
  getGlobalConfig: async () => {
    const res = await api.get('/ticket-settings/global-config');
    return res.data;
  },
  updateGlobalConfig: async (data: any) => {
    const res = await api.patch('/ticket-settings/global-config', data);
    return res.data;
  },
  getCategories: async (qs = '') => {
    const res = await api.get(`/ticket-settings/categories${qs}`);
    return res.data;
  },
  createCategory: async (data: any) => {
    const res = await api.post('/ticket-settings/categories', data);
    return res.data;
  },
  updateCategory: async (id: string, data: any) => {
    const res = await api.patch(`/ticket-settings/categories/${id}`, data);
    return res.data;
  },
  deleteCategory: async (id: string) => {
    await api.delete(`/ticket-settings/categories/${id}`);
  },
  getIssueTypes: async (params = '') => {
    const res = await api.get(`/ticket-settings/issue-types${params}`);
    return res.data;
  },
  createIssueType: async (data: any) => {
    const res = await api.post('/ticket-settings/issue-types', data);
    return res.data;
  },
  updateIssueType: async (id: string, data: any) => {
    const res = await api.patch(`/ticket-settings/issue-types/${id}`, data);
    return res.data;
  },
  deleteIssueType: async (id: string) => {
    await api.delete(`/ticket-settings/issue-types/${id}`);
  },
  getKeywordRules: async () => {
    const res = await api.get('/ticket-settings/keyword-rules');
    return res.data.map((rule: any) => ({
      ...rule,
      keywords: typeof rule.keywords === 'string' ? JSON.parse(rule.keywords) : rule.keywords
    }));
  },
  createKeywordRule: async (data: any) => {
    const res = await api.post('/ticket-settings/keyword-rules', data);
    return res.data;
  },
  updateKeywordRule: async (id: string, data: any) => {
    const res = await api.patch(`/ticket-settings/keyword-rules/${id}`, data);
    return res.data;
  },
  deleteKeywordRule: async (id: string) => {
    await api.delete(`/ticket-settings/keyword-rules/${id}`);
  },
  getEscalationFocals: async (params = '') => {
    const res = await api.get(`/ticket-settings/escalation-focals${params}`);
    return res.data;
  },
  createEscalationFocal: async (data: any) => {
    const res = await api.post('/ticket-settings/escalation-focals', data);
    return res.data;
  },
  deleteEscalationFocal: async (id: string) => {
    await api.delete(`/ticket-settings/escalation-focals/${id}`);
  },
  getAvailableUsers: async () => {
    const res = await api.get('/ticket-settings/escalation-available-users');
    return res.data;
  }
};
