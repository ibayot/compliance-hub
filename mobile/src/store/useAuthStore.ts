import { create } from 'zustand';
import * as SecureStore from 'expo-secure-store';

interface User {
  id: string;
  email: string;
  role: string;
  roleCode?: string;
  firstName?: string;
  lastName?: string;
  ticketMainFocal?: boolean;
  ticketTechnician?: boolean;
}

interface AuthState {
  token: string | null;
  user: User | null;
  deviceToken: string | null;
  isLoading: boolean;
  login: (token: string, user: User, deviceToken?: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

export const useAuthStore = create<AuthState>((set) => ({
  token: null,
  user: null,
  deviceToken: null,
  isLoading: true,
  login: async (token: string, user: User, deviceToken?: string) => {
    await SecureStore.setItemAsync('token', token);
    await SecureStore.setItemAsync('user', JSON.stringify(user));
    if (deviceToken) {
      await SecureStore.setItemAsync('deviceToken', deviceToken);
    }
    set({ token, user, deviceToken: deviceToken || null, isLoading: false });
  },
  logout: async () => {
    await SecureStore.deleteItemAsync('token');
    await SecureStore.deleteItemAsync('user');
    // We intentionally keep deviceToken so returning users can still bypass MFA!
    set({ token: null, user: null, isLoading: false });
  },
  checkAuth: async () => {
    try {
      const token = await SecureStore.getItemAsync('token');
      const userStr = await SecureStore.getItemAsync('user');
      const deviceToken = await SecureStore.getItemAsync('deviceToken');
      if (token && userStr) {
        set({ token, user: JSON.parse(userStr), deviceToken, isLoading: false });
      } else {
        set({ token: null, user: null, deviceToken, isLoading: false });
      }
    } catch (e) {
      set({ token: null, user: null, deviceToken: null, isLoading: false });
    }
  },
}));
