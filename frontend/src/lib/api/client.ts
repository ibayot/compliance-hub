import { Capacitor } from '@capacitor/core';
import axios, { AxiosError, AxiosInstance } from 'axios';
import { canRecoverSession, markSessionSignedOut, recoveryGeneration, isRejectedSession } from '../auth/session-recovery';

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

/** Shared HTTP/SSE origin contract, including bundled native applications. */
export function apiUrl(endpoint: string): string {
  return `${API_URL.replace(/\/+$/, '')}/${endpoint.replace(/^\/+/, '')}`;
}

export const tokenStore = {
  browserTokens: {} as Partial<Record<'accessToken' | 'refreshToken', string>>,
  get: (key: 'accessToken' | 'refreshToken'): string | null => {
    if (typeof window === 'undefined') return null;
    if (!Capacitor.isNativePlatform()) return tokenStore.browserTokens[key] || null;
    return window.sessionStorage.getItem(key);
  },
  set: (key: 'accessToken' | 'refreshToken', value: string) => {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform()) {
      tokenStore.browserTokens[key] = value;
      if (key === 'accessToken') window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: value }));
      return;
    }
    window.sessionStorage.setItem(key, value);
    if (key === 'accessToken') {
      window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: value }));
    }
  },
  remove: (key: 'accessToken' | 'refreshToken') => {
    if (typeof window === 'undefined') return;
    if (!Capacitor.isNativePlatform()) {
      delete tokenStore.browserTokens[key];
      if (key === 'accessToken') window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: null }));
      return;
    }
    window.sessionStorage.removeItem(key);
    if (key === 'accessToken') {
      window.dispatchEvent(new CustomEvent('auth:tokenChanged', { detail: null }));
    }
  },
};

class ApiClient {
  private client: AxiosInstance;
  private refreshFlight: Promise<{ accessToken?: string; refreshToken?: string }> | null = null;
  private refreshGeneration = -1;
  private refreshAbort: AbortController | null = null;

  cancelRenewal(): void { this.refreshAbort?.abort(); }

  private rejectSession(): void {
    if (!canRecoverSession()) return;
    markSessionSignedOut();
    tokenStore.remove('accessToken');
    tokenStore.remove('refreshToken');
    window.location.replace('/login?reason=session_expired');
  }

  refreshAuthentication(): Promise<{ accessToken?: string; refreshToken?: string }> {
    const generation = recoveryGeneration();
    if (this.refreshFlight && this.refreshGeneration === generation) return this.refreshFlight;
    const renew = async () => {
      if (!canRecoverSession() || generation !== recoveryGeneration()) throw new Error('Session recovery cancelled.');
      const native = Capacitor.isNativePlatform();
      const refreshToken = tokenStore.get('refreshToken');
      if (native && !refreshToken) {
        throw Object.assign(new Error('No refresh credential.'), { response: { status: 401 } });
      }
      const controller = new AbortController();
      this.refreshAbort = controller;
      let response;
      try {
        response = await axios.post(
          apiUrl('/auth/refresh'), native ? { refreshToken } : {},
          { withCredentials: true, timeout: 15_000, signal: controller.signal, headers: { 'X-Client-Platform': native ? 'mobile' : 'browser' } },
        );
      } finally { if (this.refreshAbort === controller) this.refreshAbort = null; }
      if (!canRecoverSession() || generation !== recoveryGeneration()) throw new Error('Session recovery cancelled.');
      const tokens = response.data || {};
      if (native && (!tokens.accessToken || !tokens.refreshToken)) throw new Error('Incomplete session renewal response.');
      if (tokens.accessToken) tokenStore.set('accessToken', tokens.accessToken);
      else if (!native) tokenStore.remove('accessToken');
      if (tokens.refreshToken) tokenStore.set('refreshToken', tokens.refreshToken);
      else if (!native) tokenStore.remove('refreshToken');
      return tokens;
    };
    // Serialize browser-cookie rotation across tabs when Web Locks are supported.
    const request = !Capacitor.isNativePlatform() && typeof navigator !== 'undefined' && navigator.locks
      ? navigator.locks.request('compliance-hub:session-refresh', renew) : renew();
    const flight = request.catch(error => {
      if (generation === recoveryGeneration() && isRejectedSession(error)) this.rejectSession();
      throw error;
    }).finally(() => { if (this.refreshFlight === flight) this.refreshFlight = null; });
    this.refreshGeneration = generation;
    this.refreshFlight = flight;
    return flight;
  }

  constructor() {
    this.client = axios.create({
      withCredentials: true,
      baseURL: API_URL,
      headers: { 'Content-Type': 'application/json' },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        config.headers['X-Client-Platform'] = Capacitor.isNativePlatform() ? 'mobile' : 'browser';
        if (typeof window !== 'undefined') {
          const token = tokenStore.get('accessToken');
          if (token) config.headers.Authorization = `Bearer ${token}`;
        }
        if (typeof FormData !== 'undefined' && config.data instanceof FormData) {
          const headers: any = config.headers ?? {};
          if (typeof headers.delete === 'function') {
            headers.delete('Content-Type');
            headers.delete('content-type');
          } else {
            delete headers['Content-Type'];
            delete headers['content-type'];
          }
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

        if (!originalRequest || error.response?.status !== 401) {
          return Promise.reject(error);
        }

        if (typeof window === 'undefined') return Promise.reject(error);
        const path = new URL(originalRequest.url || '', window.location.origin).pathname;
        // Password/MFA/login errors never renew a session. The profile probe may renew once.
        if ((path.includes('/auth/') && !path.endsWith('/auth/me')) || !canRecoverSession()) {
          return Promise.reject(error);
        }
        if (originalRequest._retry) {
          this.rejectSession();
          return Promise.reject(error);
        }
        originalRequest._retry = true;
        try {
          await this.refreshAuthentication();
          if (!canRecoverSession()) return Promise.reject(error);
          const token = tokenStore.get('accessToken');
          if (token) originalRequest.headers.Authorization = `Bearer ${token}`;
          else delete originalRequest.headers.Authorization;
          return this.client(originalRequest);
        } catch (refreshError) {
          // A timeout, network error or 5xx is an outage, not proof of revoked credentials.
          return Promise.reject(refreshError);
        }
      },
    );
  }

  get instance() {
    return this.client;
  }
}

const owner = new ApiClient();
export const apiClient = owner.instance;
export const refreshAuthentication = () => owner.refreshAuthentication();
export const cancelSessionRenewal = () => owner.cancelRenewal();
