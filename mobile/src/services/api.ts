import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

import Constants from 'expo-constants';

// We dynamically grab the URL of the Expo Dev Server (the Ngrok tunnel).
// The Metro bundler in metro.config.js will intercept /api requests and route them to port 4000!
const hostUri = Constants.expoConfig?.hostUri || '172.31.22.47:8081';
export const API_URL = `http://${hostUri}/api`;

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    const token = await SecureStore.getItemAsync('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch (error) {
    console.error('Error fetching token from SecureStore', error);
  }
  return config;
});

// Response interceptor to handle 401 (Unauthorized) usually due to token expiration
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    if (error.response && error.response.status === 401) {
      // Import here to avoid circular dependency
      const { useAuthStore } = require('../store/useAuthStore');
      await useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

export default api;
