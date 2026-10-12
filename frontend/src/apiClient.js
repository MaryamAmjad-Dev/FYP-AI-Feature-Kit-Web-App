import axios from 'axios';
import { clearSession } from './auth';

/**
 * Single Axios instance for the whole app.
 * - Base URL comes from VITE_API_URL (or the dev proxy) — no hard-coded hosts.
 * - Credentials (the httpOnly session cookie) are always sent.
 * - Clears the session when the server says the session is no longer valid.
 *
 * There is no Authorization header any more: the JWT only ever travels as an
 * httpOnly cookie, which page JavaScript cannot read.
 */
// Accept either "https://host" or "https://host/api" — the API always lives
// under /api, so make sure the base URL points there.
const rawBase = import.meta.env.VITE_API_URL || '/api';
const baseURL = rawBase.endsWith('/api') ? rawBase : `${rawBase.replace(/\/+$/, '')}/api`;

const apiClient = axios.create({
  baseURL,
  timeout: 60000,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true,
});

const AUTH_ENDPOINTS = ['/login', '/signup', '/forgot-password', '/reset-password', '/logout'];

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // The request never reached the server (offline, DNS, VPN/proxy or a
      // blocked domain) — give the UI a message users can act on.
      error.response = {
        data: {
          message:
            'Could not reach the server. Check your internet connection (or VPN/proxy) and try again.',
        },
      };
    }

    const status = error.response?.status;
    const url = error.config?.url || '';
    const isAuthAttempt = AUTH_ENDPOINTS.some((endpoint) => url.includes(endpoint));

    if (status === 401 && !isAuthAttempt && !error.config?.skipAuthRedirect) {
      // Session expired, revoked or never existed — drop the UI flag and, if
      // the user is looking at a protected page, send them to login.
      clearSession();
      if (!window.location.pathname.startsWith('/login')) {
        window.location.assign('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
