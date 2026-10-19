/**
 * OAuth 2.0 plumbing for "Continue with Google / GitHub".
 *
 * Standard authorization-code flow, implemented on top of the global `fetch`
 * that ships with Node 18+ so no extra dependency is needed:
 *
 *   1. GET  /api/auth/<provider>          → sets a signed `state` cookie,
 *                                            redirects to the provider.
 *   2. Provider redirects back to          /api/auth/<provider>/callback
 *      with ?code=&state=.
 *   3. We exchange the code for an access token (server-to-server, so the
 *      client secret never leaves this process) and read the account profile
 *      from the provider's own API — the profile is therefore trusted without
 *      having to verify an ID-token signature.
 *
 * The profile is normalised to one shape: { id, email, emailVerified, name,
 * avatar }. Everything here is provider-agnostic; database work lives in the
 * route so this module stays unit-testable.
 */
const crypto = require('crypto');

const { config } = require('../config/config');
const logger = require('./logger');

const REQUEST_TIMEOUT_MS = 15000;

const PROVIDERS = {
  google: {
    authorizeUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenUrl: 'https://oauth2.googleapis.com/token',
    userInfoUrl: 'https://openidconnect.googleapis.com/v1/userinfo',
    scope: 'openid email profile',
  },
  github: {
    authorizeUrl: 'https://github.com/login/oauth/authorize',
    tokenUrl: 'https://github.com/login/oauth/access_token',
    userInfoUrl: 'https://api.github.com/user',
    emailsUrl: 'https://api.github.com/user/emails',
    scope: 'read:user user:email',
  },
};

/** Failure with a stable, safe code the frontend turns into a message. */
class OAuthError extends Error {
  constructor(userCode, message) {
    super(message || userCode);
    this.userCode = userCode;
    this.isOAuthError = true;
  }
}

function isKnownProvider(provider) {
  return Object.prototype.hasOwnProperty.call(PROVIDERS, provider);
}

/** True when the client id + secret for this provider are present in .env. */
function isConfigured(provider) {
  return isKnownProvider(provider) && Boolean(config.oauth.enabled[provider]);
}

/** Configuredness of every provider (drives the buttons on Login/Signup). */
function configuredProviders() {
  return Object.keys(PROVIDERS).reduce((acc, name) => {
    acc[name] = isConfigured(name);
    return acc;
  }, {});
}

/** Exact redirect URI to register in the Google/GitHub console. */
function callbackUrl(provider) {
  return `${config.oauth.callbackBase}/auth/${provider}/callback`;
}

/**
 * CSRF token handed to the provider and echoed back. The value carries its
 * provider so a state minted for GitHub can never be replayed on Google.
 */
function generateState(provider) {
  return `${provider}.${crypto.randomBytes(24).toString('base64url')}`;
}

/**
 * Constant-time check that the `state` the provider sent back is the one we
 * stored in the cookie for this attempt — never a freshly generated value,
 * which would never match. The state also carries its provider name, so a code
 * minted for GitHub can never be replayed on the Google callback.
 */
function isValidState(provider, state, stored) {
  if (typeof state !== 'string' || typeof stored !== 'string') return false;
  if (!state || !stored) return false;
  if (!constantTimeEquals(state, stored)) return false;
  return hasProviderPrefix(state, provider) && hasProviderPrefix(stored, provider);
}

/** Constant-time string compare (hash first, so lengths never throw). */
function constantTimeEquals(a, b) {
  const ha = crypto.createHash('sha256').update(String(a)).digest();
  const hb = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(ha, hb);
}

function hasProviderPrefix(value, provider) {
  const prefix = `${provider}.`;
  return (
    value.length > prefix.length &&
    constantTimeEquals(value.slice(0, prefix.length), prefix)
  );
}

/** URL of the page the browser lands on after the round trip. */
function frontendUrl(pathname, params = {}) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value !== undefined && value !== null && value !== '')
  );
  const base = config.appUrl.replace(/\/+$/, '');
  const suffix = query.toString();
  return suffix ? `${base}${pathname}?${suffix}` : `${base}${pathname}`;
}

async function postForm(url, body, headers = {}) {
  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', ...headers },
      body: new URLSearchParams(body).toString(),
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('oauth: provider unreachable', { url: hostOf(url), message: error.message });
    throw new OAuthError('provider-unreachable', 'The sign-in provider could not be reached.');
  }

  const text = await response.text();
  // Google answers JSON, GitHub answers form-encoding unless asked otherwise;
  // accept both so a provider change never turns into a crash.
  if (text.startsWith('{')) {
    try {
      return { status: response.status, data: JSON.parse(text) };
    } catch {
      return { status: response.status, data: {} };
    }
  }
  return { status: response.status, data: Object.fromEntries(new URLSearchParams(text)) };
}

async function getJson(url, accessToken, headers = {}) {
  let response;
  try {
    response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${accessToken}`,
        // GitHub rejects requests without an identifying User-Agent.
        'User-Agent': 'AI-Feature-Kit',
        ...headers,
      },
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (error) {
    logger.warn('oauth: provider unreachable', { url: hostOf(url), message: error.message });
    throw new OAuthError('provider-unreachable', 'The sign-in provider could not be reached.');
  }

  if (!response.ok) {
    logger.warn('oauth: profile request failed', { url: hostOf(url), status: response.status });
    throw new OAuthError('provider-error', 'The sign-in provider rejected the request.');
  }

  try {
    return await response.json();
  } catch {
    throw new OAuthError('provider-error', 'The sign-in provider returned an unreadable response.');
  }
}

/** Builds the consent-screen URL the browser is sent to. */
function buildAuthorizeUrl(provider, state) {
  const spec = PROVIDERS[provider];
  const url = new URL(spec.authorizeUrl);
  url.searchParams.set('client_id', config.oauth[provider].clientId);
  url.searchParams.set('redirect_uri', callbackUrl(provider));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', spec.scope);
  url.searchParams.set('state', state);
  if (provider === 'google') {
    // Always show the account chooser — otherwise Google silently reuses the
    // session of whoever was logged in last in that browser.
    url.searchParams.set('prompt', 'select_account');
  }
  return url.toString();
}

/** Step 1: authorization code → access token (server-to-server). */
async function exchangeCode(provider, code) {
  const spec = PROVIDERS[provider];
  const credentials = config.oauth[provider];

  const { status, data } = await postForm(spec.tokenUrl, {
    client_id: credentials.clientId,
    client_secret: credentials.clientSecret,
    code,
    redirect_uri: callbackUrl(provider),
    grant_type: 'authorization_code',
  });

  if (!data.access_token) {
    logger.warn('oauth: code exchange failed', {
      provider,
      status,
      error: data.error || data.error_description || 'missing access_token',
    });
    throw new OAuthError('exchange-failed', 'The sign-in response could not be verified.');
  }
  return data.access_token;
}

/** Step 2: access token → the provider's account profile, normalised. */
async function fetchProfile(provider, accessToken) {
  if (provider === 'google') {
    const info = await getJson(PROVIDERS.google.userInfoUrl, accessToken);
    if (!info.sub || !info.email) {
      throw new OAuthError('incomplete-profile', 'Google did not return an email address.');
    }
    return {
      id: String(info.sub),
      email: String(info.email).toLowerCase(),
      // `email_verified` is false/absent on throwaway addresses; those must not
      // be able to take over an account that already uses that address.
      emailVerified: info.email_verified === true,
      name: String(info.name || info.given_name || info.email).slice(0, 255),
      avatar: typeof info.picture === 'string' ? info.picture : '',
    };
  }

  const user = await getJson(PROVIDERS.github.userInfoUrl, accessToken);
  if (!user.id) {
    throw new OAuthError('incomplete-profile', 'GitHub did not return an account.');
  }

  const emails = await getJson(PROVIDERS.github.emailsUrl, accessToken).catch(() => []);
  const verified = Array.isArray(emails)
    ? emails.filter((entry) => entry && entry.verified && entry.email)
    : [];
  const primary =
    verified.find((entry) => entry.primary) ||
    verified.find((entry) => entry.email && !/noreply/i.test(entry.email)) ||
    verified[0];

  if (!primary) {
    throw new OAuthError(
      'no-verified-email',
      'That GitHub account has no verified email address. Add one in GitHub first.'
    );
  }

  return {
    id: String(user.id),
    email: String(primary.email).toLowerCase(),
    emailVerified: true,
    name: String(user.name || user.login || primary.email).slice(0, 255),
    avatar: typeof user.avatar_url === 'string' ? user.avatar_url : '',
  };
}

function hostOf(url) {
  try {
    return new URL(url).host;
  } catch {
    return 'unknown';
  }
}

module.exports = {
  OAuthError,
  PROVIDERS,
  buildAuthorizeUrl,
  callbackUrl,
  configuredProviders,
  exchangeCode,
  fetchProfile,
  frontendUrl,
  generateState,
  isConfigured,
  isKnownProvider,
  isValidState,
};
