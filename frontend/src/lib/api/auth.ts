import { apiClient, cancelSessionRenewal, refreshAuthentication, tokenStore } from './client';
import { LoginCredentials, AuthResponse, User } from '../types/auth';

let pendingLogout: Promise<void> | null = null;

async function prepareInteractiveSignIn(): Promise<void> {
  await pendingLogout;
  cancelSessionRenewal();
}

export const authApi = {
  getPublicConfig: async (): Promise<{ googleSignInEnabled: boolean }> => {
    const response = await apiClient.get('/auth/public-config');
    return response.data;
  },

  login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
    await prepareInteractiveSignIn();
    let deviceToken = localStorage.getItem('deviceToken');
    if (!deviceToken) {
      deviceToken =
        'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceToken', deviceToken);
    }
    const response = await apiClient.post<AuthResponse>('/auth/login', credentials, {
      headers: { 'x-device-token': deviceToken },
    });
    return response.data;
  },

  loginWithGoogle: async (payload: { idToken: string }): Promise<AuthResponse> => {
    await prepareInteractiveSignIn();
    let deviceToken = localStorage.getItem('deviceToken');
    if (!deviceToken) {
      deviceToken =
        'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceToken', deviceToken);
    }
    const response = await apiClient.post<AuthResponse>('/auth/google-login', payload, {
      headers: { 'x-device-token': deviceToken },
    });
    return response.data;
  },

  logout: async (): Promise<void> => {
    cancelSessionRenewal();
    const token = tokenStore.get('accessToken');
    const request = apiClient.post('/auth/logout', {}, { timeout: 15_000, headers: token ? { Authorization: `Bearer ${token}` } : {} });
    const settled = request.then(() => undefined, () => undefined);
    pendingLogout = settled;
    try { await request; } finally { if (pendingLogout === settled) pendingLogout = null; }
  },

  sendMfaCode: async (): Promise<{ message: string }> => {
    const response = await apiClient.post('/auth/mfa/send');
    return response.data;
  },

  verifyMfaCode: async (tempToken: string, code: string, rememberDevice: boolean): Promise<any> => {
    await prepareInteractiveSignIn();
    let deviceToken = localStorage.getItem('deviceToken');
    if (!deviceToken) {
      deviceToken =
        'randomUUID' in crypto
          ? crypto.randomUUID()
          : Math.random().toString(36).substring(2, 15) +
          Math.random().toString(36).substring(2, 15);
      localStorage.setItem('deviceToken', deviceToken);
    }
    const response = await apiClient.post('/auth/mfa/verify', { tempToken, code, rememberDevice }, {
      headers: { 'x-device-token': deviceToken },
    });
    return response.data;
  },

  getProfile: async (): Promise<User> => {
    // AuthProvider calls this during application bootstrap, including when a
    // browser has no access token but may still have an HttpOnly session
    // cookie. Bound that probe so a stalled API cannot leave every route on a
    // permanent loading spinner.
    const response = await apiClient.get<User>('/auth/me', { timeout: 15_000 });
    return response.data;
  },

  refresh: async (_refreshToken: string): Promise<{ accessToken?: string; refreshToken?: string }> => {
    return refreshAuthentication();
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

  generateRandomPassword: async (): Promise<{ password: string }> => {
    const response = await apiClient.post('/auth/generate-random');
    return response.data;
  },

  generatePassphrase: async (): Promise<{ password: string }> => {
    const response = await apiClient.post('/auth/generate-passphrase');
    return response.data;
  },
};
