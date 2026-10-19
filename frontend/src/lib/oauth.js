import apiClient from './apiClient';

/**
 * Social sign-in helpers.
 *
 * The round trip is a full-page redirect (never a popup): the API sets an
 * httpOnly session cookie on the way back, which a cross-origin popup could
 * not do reliably. The start URL is taken from the axios base URL, so it is
 * correct behind the Vite proxy ("/api") and when the API lives on its own
 * domain (VITE_API_URL).
 */
export const OAUTH_PROVIDERS = [
  { id: 'google', label: 'Google' },
  { id: 'github', label: 'GitHub' },
];

export function startOAuthLogin(provider) {
  window.location.assign(`${apiClient.defaults.baseURL}/auth/${provider}`);
}

/**
 * Which providers the server has credentials for (plus the exact redirect URIs
 * that must be registered in the Google/GitHub console).
 * Returns null when the API cannot be reached, so the buttons stay clickable
 * instead of being disabled by a transient hiccup.
 */
export async function fetchOAuthProviders() {
  try {
    const { data } = await apiClient.get('/auth/providers', { skipAuthRedirect: true });
    return data && typeof data === 'object' ? data : null;
  } catch {
    return null;
  }
}

const MESSAGES = {
  'not-configured': (label) =>
    `${label} sign-in is not configured on the server yet. Add the ${label} OAuth credentials to backend/.env to enable it.`,
  'state-mismatch': () => 'That sign-in attempt expired or was interrupted. Please try again.',
  'provider-denied': () => 'Sign-in was cancelled before it finished.',
  'provider-unreachable': (label) =>
    `Could not reach ${label}. Check your internet connection and try again.`,
  'provider-error': () => 'The sign-in provider rejected the request. Please try again.',
  'exchange-failed': () => 'The sign-in response could not be verified. Please try again.',
  'incomplete-profile': () => 'That account is missing the details we need to sign you in.',
  'no-verified-email': () =>
    'That GitHub account has no verified email address. Add and verify one in GitHub, then try again.',
  'unverified-email': () =>
    'The provider did not verify that account’s email address, so it cannot be used to sign in.',
  'server-error': () => 'Something went wrong while signing you in. Please try again.',
};

/** Turns the ?code= the API redirects back with into a sentence users can act on. */
export function oauthErrorMessage(code, provider) {
  const label = OAUTH_PROVIDERS.find((item) => item.id === provider)?.label || 'This';
  const build = MESSAGES[code];
  return build ? build(label) : MESSAGES['server-error']();
}
