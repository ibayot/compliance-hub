import { Capacitor } from '@capacitor/core';
import axios, { AxiosError, AxiosInstance } from 'axios';

// Use Vite proxy in dev (/api is proxied to localhost:4000/api by vite.config.ts).
// VITE_API_URL can override for production deployments if necessary, but we force '/api' 
// if it's accidentally set to localhost in a staging build via a lingering .env file.
const rawApiUrl = import.meta.env.VITE_API_URL;
let API_URL = import.meta.env.PROD 
  ? (rawApiUrl && !rawApiUrl.includes('localhost') ? rawApiUrl : '/api')
  : (rawApiUrl || '/api');

// If running natively on a Mobile App, relative paths (e.g. '/api') or 'localhost' will break
// because 'localhost' resolves to the phone itself, and relative paths resolve to `http://localhost`.
if (Capacitor.isNativePlatform()) {
  if (API_URL.startsWith('/') || API_URL.includes('localhost')) {
    // 10.0.2.2 is the special alias for your host machine's loopback interface in Android emulators.
    // We route through Nginx (port 80) instead of Gateway directly (4000) to bypass potential Windows Firewall blocks.
    API_URL = 'http://10.0.2.2/api';
  }
}

export const tokenStore = {
  get: (key: 'accessToken' | 'refreshToken'): string | null => {
    if (typeof window === 'undefined') return null;
    return window.sessionStorage.getItem(key);
  },
  set: (key: 'accessToken' | 'refreshToken', value: string) => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.setItem(key, value);
  },
  remove: (key: 'accessToken' | 'refreshToken') => {
    if (typeof window === 'undefined') return;
    window.sessionStorage.removeItem(key);
  },
};

class ApiClient {
  private client: AxiosInstance;
  /** Guard: only one token-refresh attempt runs at a time */
  private isRefreshing = false;
  /** Queue of request callbacks waiting for the refresh to complete */
  private failedQueue: Array<{ resolve: (token: string) => void; reject: (err: unknown) => void }> =
    [];

  private processQueue(error: unknown, token: string | null) {
    this.failedQueue.forEach((prom) => {
      if (error) prom.reject(error);
      else prom.resolve(token!);
    });
    this.failedQueue = [];
  }

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = tokenStore.get('accessToken');
          if (token) config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for 401 → token refresh → redirect on failure
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status !== 401 || originalRequest._retry) {
          return Promise.reject(error);
        }

        // Skip interceptor for authentication endpoints
        const url = originalRequest.url || '';
        if (url.includes('/auth/login') || url.includes('/auth/google') || url.includes('/auth/refresh')) {
          return Promise.reject(error);
        }

        originalRequest._retry = true;

        if (typeof window === 'undefined') return Promise.reject(error);

        const refreshToken = tokenStore.get('refreshToken');
        // No refresh token at all — clear access token and redirect immediately
        if (!refreshToken) {
          tokenStore.remove('accessToken');
          window.location.href = '/login?reason=session_expired';
          return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request
        if (this.isRefreshing) {
          return new Promise<string>((resolve, reject) => {
            this.failedQueue.push({ resolve, reject });
          })
            .then((token) => {
              originalRequest.headers.Authorization = `Bearer ${token}`;
              return this.client(originalRequest);
            })
            .catch(() => Promise.reject(error));
        }

        this.isRefreshing = true;

        try {
          const response = await axios.post(`${API_URL}/auth/refresh`, { refreshToken });
          const { accessToken } = response.data;
          tokenStore.set('accessToken', accessToken);
          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          this.processQueue(null, accessToken);
          return this.client(originalRequest);
        } catch (refreshError) {
          // Refresh failed (e.g. user deactivated) — log out and notify
          this.processQueue(refreshError, null);
          tokenStore.remove('accessToken');
          tokenStore.remove('refreshToken');
          const errorMessage = (refreshError as any)?.response?.data?.message || '';
          const reason = errorMessage.includes('deactivated') ? 'deactivated' : 'session_expired';
          window.location.href = `/login?reason=${reason}`;
          return Promise.reject(refreshError);
        } finally {
          this.isRefreshing = false;
        }
      },
    );
  }

  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;
