import axios from 'axios';
import { clearSession, getToken } from './auth';

/**
 * Single Axios instance for the whole app.
 * - Base URL comes from VITE_API_URL (or the dev proxy) — no hard-coded hosts.
 * - Attaches the auth token to every request.
 * - Clears the session when the server says the token is no longer valid.
 */
// Accept either "https://host" or "https://host/api" — the API always lives
// under /api, so make sure the base URL points there.
const rawBase = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`;

const apiClient = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
});

apiClient.interceptors.request.use((config) => {
  const token = getToken();
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

const AUTH_ENDPOINTS = ['/login', '/signup', '/forgot-password', '/reset-password'];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    if (status === 401 && !isAuthAttempt) {
      // Session expired or token revoked — drop it and send the user to login.
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
