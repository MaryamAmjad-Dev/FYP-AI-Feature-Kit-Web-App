/**
 * Session helpers.
 *
 * The JWT itself lives in an httpOnly cookie set by the server, so page
 * JavaScript can never read it (an XSS cannot steal the session the way it
 * could when the token sat in localStorage). These helpers only remember
 * what the UI should show — the server still rejects every request whose
 * cookie is missing, expired or revoked (401).
 *
 * "Remember me" decides where the UI flag lives: localStorage survives a
 * browser restart, sessionStorage does not — matching the session cookie the
 * server sets when the box is left unticked.
 */

const TOKEN_KEY = 'authToken'; // legacy key from when the JWT was stored here
const USER_KEY = 'userData';
const LOGGED_IN_KEY = 'loggedIn';

function safeGet(store, key) {
  try {
    return store.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(store, key, value) {
  try {
    store.setItem(key, value);
  } catch {
    /* private mode / quota */
  }
}

function safeRemove(store, key) {
  try {
    store.removeItem(key);
  } catch {
    /* private mode */
  }
}

/** The store that currently holds the session (localStorage wins). */
function activeStore() {
  if (safeGet(localStorage, LOGGED_IN_KEY) || safeGet(localStorage, USER_KEY)) return localStorage;
  if (safeGet(sessionStorage, LOGGED_IN_KEY) || safeGet(sessionStorage, USER_KEY)) {
    return sessionStorage;
  }
  return localStorage;
}

export function setSession(user, { remember = true } = {}) {
  const target = remember ? localStorage : sessionStorage;
  const other = remember ? sessionStorage : localStorage;
  safeRemove(other, USER_KEY);
  safeRemove(other, LOGGED_IN_KEY);
  // Drop the token that older builds kept in localStorage.
  safeRemove(localStorage, TOKEN_KEY);
  safeRemove(sessionStorage, TOKEN_KEY);
  safeSet(target, USER_KEY, JSON.stringify(user || {}));
  safeSet(target, LOGGED_IN_KEY, 'true');
}

export function clearSession() {
  for (const store of [localStorage, sessionStorage]) {
    safeRemove(store, TOKEN_KEY);
    safeRemove(store, USER_KEY);
    safeRemove(store, LOGGED_IN_KEY);
    safeRemove(store, 'rememberMe');
  }
}

/** True only while the UI still believes there is a session. */
export function isLoggedIn() {
  return (
    safeGet(activeStore(), LOGGED_IN_KEY) === 'true' && Boolean(safeGet(activeStore(), USER_KEY))
  );
}

export function getUser() {
  try {
    const raw = safeGet(activeStore(), USER_KEY);
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
  safeSet(activeStore(), USER_KEY, JSON.stringify(user));
  return user;
}
