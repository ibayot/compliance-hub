import { apiClient } from './client';
import { UserRole } from '@/lib/types/auth';

export interface UserRecord {
  id: number;
  email: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  phoneNumber?: string;
  sex?: string;
  staffId?: string;
  position?: string;
  positionFull?: string;
  designation?: string;

  role: string;
  active: boolean;
  attendanceEligible?: boolean;
  technicianEligible?: boolean;
  autoAssignmentEligible?: boolean;
  isIssuancesManage?: boolean;
  isDocumentsDelete?: boolean;
  isUserManagementAdmin?: boolean;
  units?: any[];
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

  unitIds?: number[];
  autoAssignmentEligible?: boolean;
}

export interface RoleDefinition {
  value: string;
  label: string;
  description: string;
  assignable: boolean;
  isSystem?: boolean;
  is_system?: boolean;

}

export interface UpdateUserPayload {
  email?: string;
  staffId?: string;
  password?: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  phoneNumber?: string | null;
  sex?: string | null;
  position?: string | null;
  positionFull?: string | null;
  designation?: string | null;

  role?: UserRole;
  active?: boolean;
  unitIds?: number[];
  autoAssignmentEligible?: boolean;
}

export interface CreateRolePayload {
  value: string;
  label: string;
  description: string;
  assignable?: boolean;
}

export interface UpdateRolePayload {
  value?: string;
  label?: string;
  description?: string;
  assignable?: boolean;
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
  isTicketModuleAccess: boolean;
  isTicketReportsAccess: boolean;
  isTicketReportsManage: boolean;
  isUserManagementAdmin?: boolean;
  isUserManagementView?: boolean;
  isSmtpSettingsAccess: boolean;
  isGlobalSettingsAccess: boolean;
  isKpiAccess: boolean;
  isKpiManage: boolean;
  isAttendanceAccess: boolean;
  isAttendanceManage: boolean;
  isReportsAccess: boolean;
  isReviewsAccess: boolean;
  isMovAccess: boolean;
  isDocumentsAccess: boolean;
  isRepositoryAccess: boolean;
  isMetricsAccess: boolean;
  isRoleCapabilitiesAccess: boolean;
  isSystemRolesAccess: boolean;
  isIssuancesAccess: boolean;
  isSecuritySettingsAccess: boolean;
  isDutyViewerAccess: boolean;
  isDutyAdminAccess: boolean;
  isAuditAccess: boolean;
  isUnitsAccess: boolean;
  isUnitsManage: boolean;
  isDocumentTypesManage: boolean;
  isMetricsManage: boolean;
  isUserManagementRolesManage: boolean;
  isAttendanceEligible: boolean;
  isDocumentsManage: boolean;
  isDocumentsDelete: boolean;
  isIssuancesManage: boolean;
  isMetricsDelete: boolean;
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
  isTicketModuleAccess?: boolean;
  isTicketReportsAccess?: boolean;
  isTicketReportsManage?: boolean;
  isSmtpSettingsAccess?: boolean;
  isGlobalSettingsAccess?: boolean;
  isKpiAccess?: boolean;
  isKpiManage?: boolean;
  isAttendanceAccess?: boolean;
  isAttendanceManage?: boolean;
  isReportsAccess?: boolean;
  isReviewsAccess?: boolean;
  isMovAccess?: boolean;
  isDocumentsAccess?: boolean;
  isRepositoryAccess?: boolean;
  isMetricsAccess?: boolean;
  isRoleCapabilitiesAccess?: boolean;
  isSystemRolesAccess?: boolean;
  isIssuancesAccess?: boolean;
  isSecuritySettingsAccess?: boolean;
  isDutyViewerAccess?: boolean;
  isDutyAdminAccess?: boolean;
  isAuditAccess?: boolean;
  isUnitsAccess?: boolean;
  isUnitsManage?: boolean;
  isDocumentTypesManage?: boolean;
  isMetricsManage?: boolean;
  isUserManagementRolesManage?: boolean;
  isAttendanceEligible?: boolean;
  isDocumentsManage?: boolean;
  isDocumentsDelete?: boolean;
  isIssuancesManage?: boolean;
  isMetricsDelete?: boolean;
}

export const usersApi = {
  getSecurityConfig: async () => {
    const response = await apiClient.get('/users/security-config');
    return response.data;
  },

  getAppMode: async () => {
    const response = await apiClient.get('/users/security-config/app-mode');
    return response.data;
  },

  updateSecurityConfig: async (payload: { defaultPassword?: string }) => {
    const response = await apiClient.put('/users/security-config', payload);
    return response.data;
  },

  list: async (): Promise<UserRecord[]> => {
    const response = await apiClient.get('/users');
    return response.data;
  },

  getUserById: async (id: number): Promise<UserRecord> => {
    const response = await apiClient.get(`/users/${id}`);
    return response.data;
  },

  getProfileUnits: async (): Promise<Array<{ id: number; name: string; hasReportorialRequirements?: boolean }>> => {
    const response = await apiClient.get('/users/profile-units');
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

  updateRoleDefinition: async (
    value: string,
    payload: UpdateRolePayload,
  ): Promise<RoleDefinition> => {
    const response = await apiClient.patch(`/users/roles/${value}`, payload);
    return response.data;
  },

  deleteRoleDefinition: async (value: string): Promise<void> => {
    await apiClient.delete(`/users/roles/${value}`);
  },

  searchEmails: async (
    q: string,
  ): Promise<{ id: number; email: string; firstName?: string; lastName?: string }[]> => {
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
  updateCapability: async (
    roleValue: string,
    payload: UpdateRoleCapabilityPayload,
  ): Promise<RoleCapabilityRecord> => {
    const response = await apiClient.patch(
      `/users/role-capabilities/${encodeURIComponent(roleValue)}`,
      payload,
    );
    return response.data;
  },

  /** Reset a user's password to default */
  resetPassword: async (id: number): Promise<void> => {
    await apiClient.post(`/users/${id}/reset-password`);
  },
};
