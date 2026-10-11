/**
 * Session helpers.
 *
 * The real authentication happens on the server (JWT verified by middleware);
 * these helpers only decide what the UI should show. Forging `loggedIn` in
 * DevTools can no longer unlock protected actions because every API call
 * carries the token and the backend rejects missing/invalid ones with a 401.
 */

const TOKEN_KEY = 'authToken';
const USER_KEY = 'userData';
const LOGGED_IN_KEY = 'loggedIn';

export function getToken() {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function setSession(token, user) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user || {}));
  localStorage.setItem(LOGGED_IN_KEY, 'true');
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(LOGGED_IN_KEY);
  localStorage.removeItem('rememberMe');
}

function decodeTokenPayload(token) {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return JSON.parse(atob(padded));
  } catch {
    return null;
  }
}

export function isTokenExpired(token) {
  const payload = decodeTokenPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  return payload.exp * 1000 <= Date.now();
}

/** True only when a non-expired JWT is present. */
export function isLoggedIn() {
  const token = getToken();
  if (!token) return false;
  if (isTokenExpired(token)) {
    clearSession();
    return false;
  }
  return true;
}

export function getUser() {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function getUserId() {
  const user = getUser();
  return user && user.id != null ? user.id : null;
}

export function updateUser(patch) {
  const user = { ...(getUser() || {}), ...patch };
  localStorage.setItem(USER_KEY, JSON.stringify(user));
  return user;
}
