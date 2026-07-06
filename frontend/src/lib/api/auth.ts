import { apiClient } from './client';
import { LoginCredentials, AuthResponse, User } from '../types/auth';

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
    return response.data;
  },

  loginWithGoogle: async (payload: { idToken: string }): Promise<AuthResponse> => {
    const response = await apiClient.post<AuthResponse>('/auth/google-login', payload);
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post('/auth/logout');
  },

  sendMfaCode: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/mfa/send');
    return response.data;
  },

  verifyMfaCode: async (code: string): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/mfa/verify', { code });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    const response = await apiClient.get<User>('/auth/me');
    return response.data;
  },

  refresh: async (refreshToken: string): Promise<{ accessToken: string }> => {
    const response = await apiClient.post('/auth/refresh', { refreshToken });
    return response.data;
  },

  changePassword: async (payload: {
    currentPassword: string;
    newPassword: string;
  }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/change-password', payload);
    return response.data;
  },

  reauthenticate: async (payload: { password: string }): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/reauthenticate', payload);
    return response.data;
  },
};
