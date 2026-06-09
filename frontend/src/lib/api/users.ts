import { apiClient } from './client';
import { UserRole } from '@/lib/types/auth';

export interface UserRecord {
  id: number;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  staffId?: string;
  position?: string;
  positionFull?: string;
  designation?: string;
  ticketMainFocal?: boolean;
  ticketTechnician?: boolean;
  role: UserRole;
  roleCode?: string | null;
  active: boolean;
}

export interface CreateUserPayload {
  email: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  staffId?: string;
  role: UserRole;
  position?: string;
  positionFull?: string;
  designation?: string;
  ticketMainFocal?: boolean;
  ticketTechnician?: boolean;
  unitIds?: number[];
}

export interface RoleDefinition {
  value: string;
  label: string;
  description: string;
  assignable: boolean;
  isSystem?: boolean;
  is_system?: boolean;
  /** Technician type tag — includes members of this role in the attendance grid */
  technicianType?: string | null;
}

export interface UpdateUserPayload {
  email?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  position?: string;
  positionFull?: string;
  designation?: string;
  ticketMainFocal?: boolean;
  ticketTechnician?: boolean;
  role?: UserRole;
  active?: boolean;
  unitIds?: number[];
}

export interface CreateRolePayload {
  value: string;
  label: string;
  description: string;
  assignable?: boolean;
  technicianType?: string | null;
}

export interface UpdateRolePayload {
  value?: string;
  label?: string;
  description?: string;
  assignable?: boolean;
  technicianType?: string | null;
}

/** Mirrors the role_capabilities table. One row per role. */
export interface RoleCapabilityRecord {
  id: number;
  roleValue: string;
  isFocal: boolean;
  isDesktop: boolean;
  isItSupport: boolean;
  isPantawidIct: boolean;
  isIto: boolean;
  isEscalationFocal: boolean;
  isTicketSettingsFocal: boolean;
  isAllTickets: boolean;
  isTicketFocal: boolean;
  isKpiAccess: boolean;
  isKpiManage: boolean;
  isAttendanceAccess: boolean;
  isAttendanceManage: boolean;
  isReportsAccess: boolean;
  isReviewsAccess: boolean;
  isMovAccess: boolean;
  isDocumentsAccess: boolean;
  isRepositoryAccess: boolean;
  isIssuancesAccess: boolean;
  isMetricsAccess: boolean;
}

export interface UpdateRoleCapabilityPayload {
  isFocal?: boolean;
  isDesktop?: boolean;
  isItSupport?: boolean;
  isPantawidIct?: boolean;
  isIto?: boolean;
  isEscalationFocal?: boolean;
  isTicketSettingsFocal?: boolean;
  isAllTickets?: boolean;
  isTicketFocal?: boolean;
  isKpiAccess?: boolean;
  isKpiManage?: boolean;
  isAttendanceAccess?: boolean;
  isAttendanceManage?: boolean;
  isReportsAccess?: boolean;
  isReviewsAccess?: boolean;
  isMovAccess?: boolean;
  isDocumentsAccess?: boolean;
  isRepositoryAccess?: boolean;
  isIssuancesAccess?: boolean;
  isMetricsAccess?: boolean;
}

export const usersApi = {
  list: async (): Promise<UserRecord[]> => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  create: async (payload: CreateUserPayload): Promise<UserRecord> => {
    const response = await apiClient.post('/users', payload);
    return response.data;
  },

  updateRole: async (userId: number, role: string): Promise<UserRecord> => {
    const response = await apiClient.patch(`/users/${userId}`, { role });
    return response.data;
  },

  updateUser: async (userId: number, payload: UpdateUserPayload): Promise<UserRecord> => {
    const response = await apiClient.patch(`/users/${userId}`, payload);
    return response.data;
  },

  deactivate: async (userId: number): Promise<void> => {
    await apiClient.patch(`/users/${userId}`, { active: false });
  },

  activate: async (userId: number): Promise<void> => {
    await apiClient.patch(`/users/${userId}`, { active: true });
  },

  getRoles: async (): Promise<RoleDefinition[]> => {
    const response = await apiClient.get('/users/roles');
    return response.data;
  },

  createRoleDefinition: async (payload: CreateRolePayload): Promise<RoleDefinition> => {
    const response = await apiClient.post('/users/roles', payload);
    return response.data;
  },

  updateRoleDefinition: async (value: string, payload: UpdateRolePayload): Promise<RoleDefinition> => {
    const response = await apiClient.patch(`/users/roles/${value}`, payload);
    return response.data;
  },

  deleteRoleDefinition: async (value: string): Promise<void> => {
    await apiClient.delete(`/users/roles/${value}`);
  },

  searchEmails: async (q: string): Promise<{ id: number; email: string; firstName?: string; lastName?: string }[]> => {
    const response = await apiClient.get(`/users/search-email?q=${encodeURIComponent(q)}`);
    return response.data;
  },

  /** Fetch capability rows for all roles. Super admin / compliance officer only. */
  listCapabilities: async (): Promise<RoleCapabilityRecord[]> => {
    const response = await apiClient.get('/users/role-capabilities');
    return response.data;
  },

  /** Fetch capability row for the current user's role. Any authenticated user. */
  getMyCapabilities: async (): Promise<RoleCapabilityRecord | null> => {
    const response = await apiClient.get('/users/role-capabilities/me');
    return response.data;
  },

  /** Update capability flags for a specific role. Super admin only. */
  updateCapability: async (roleValue: string, payload: UpdateRoleCapabilityPayload): Promise<RoleCapabilityRecord> => {
    const response = await apiClient.patch(`/users/role-capabilities/${encodeURIComponent(roleValue)}`, payload);
    return response.data;
  },
};
