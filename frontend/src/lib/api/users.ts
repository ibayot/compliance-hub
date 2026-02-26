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
  designation?: string;
  role: UserRole;
  active: boolean;
}

export interface CreateUserPayload {
  email: string;
  password: string;
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  staffId?: string;
  role: UserRole;
  position?: string;
  designation?: string;
  unitIds?: number[];
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
  firstName?: string;
  middleName?: string;
  lastName?: string;
  suffix?: string;
  position?: string;
  designation?: string;
  role?: UserRole;
  active?: boolean;
  unitIds?: number[];
}

export interface CreateRolePayload {
  value: UserRole;
  label: string;
  description: string;
  assignable?: boolean;
}

export interface UpdateRolePayload {
  label?: string;
  description?: string;
  assignable?: boolean;
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
};
