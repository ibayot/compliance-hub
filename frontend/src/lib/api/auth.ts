import { apiClient } from './client';
import { LoginCredentials, AuthResponse, User } from '../types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },
};
