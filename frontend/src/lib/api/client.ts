import axios, { AxiosError, AxiosInstance } from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000/api';

class ApiClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: API_URL,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor to add auth token
    this.client.interceptors.request.use(
      (config) => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('accessToken');
          if (token) {
            config.headers.Authorization = `Bearer ${token}`;
          }
        }
        return config;
      },
      (error) => Promise.reject(error),
    );

    // Response interceptor for token refresh
    this.client.interceptors.response.use(
      (response) => response,
      async (error: AxiosError) => {
        const originalRequest = error.config as any;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          if (typeof window !== 'undefined') {
            const refreshToken = localStorage.getItem('refreshToken');
            if (refreshToken) {
              try {
                const response = await axios.post(`${API_URL}/auth/refresh`, {
                  refreshToken,
                });
                const { accessToken } = response.data;
                localStorage.setItem('accessToken', accessToken);
                originalRequest.headers.Authorization = `Bearer ${accessToken}`;
                return this.client(originalRequest);
              } catch (refreshError) {
                // Refresh failed, redirect to login
                localStorage.removeItem('accessToken');
                localStorage.removeItem('refreshToken');
                if (typeof window !== 'undefined') {
                  window.location.href = '/login';
                }
                return Promise.reject(refreshError);
              }
            }
          }
        }

        return Promise.reject(error);
      },
    );
  }

  get instance() {
    return this.client;
  }
}

export const apiClient = new ApiClient().instance;
