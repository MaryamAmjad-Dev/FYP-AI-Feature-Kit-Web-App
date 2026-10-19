const crypto = require('crypto');
const express = require('express');

const { config } = require('../config/config');
const { db } = require('../db/db');
const logger = require('../lib/logger');
const oauth = require('../lib/oauth');
const { hashPassword } = require('../lib/passwords');
const { parseCookies, setSessionCookie, signToken } = require('../middleware/auth');

const router = express.Router();

// The CSRF token for one attempt lives in an httpOnly cookie: the provider
// echoes it back in the query string, and only a browser that actually started
// the flow here can present the matching cookie.
const STATE_COOKIE = 'afk_oauth_state';

function isDuplicateEntry(error) {
  return Boolean(error) && error.code === '23505';
}

function stateCookieOptions() {
  return {
    httpOnly: true,
    secure: config.cookie.secure,
    // The provider comes back with a top-level GET navigation, which
    // SameSite=Lax always allows (and which the session cookie then inherits).
    sameSite: 'lax',
    path: '/',
    maxAge: config.oauth.stateTtlMs,
  };
}

function clearStateCookie(res) {
  const { maxAge, ...rest } = stateCookieOptions();
  res.clearCookie(STATE_COOKIE, rest);
}

/**
 * Returns the users row for this provider account, creating/linking as needed.
 *
 * Order matters:
 *   1. same provider account → update the profile from the provider (name,
 *      avatar, current email) and sign in.
 *   2. same email as an existing account → link the provider to it (the person
 *      proved control of the mailbox through the provider) so one account keeps
 *      working with both methods.
 *   3. brand new account → create it with a random 256-bit password nobody
 *      knows, so the password login can never be used for it.
 */
async function provisionUser(provider, profile) {
  const providerId = profile.id;
  const identity = JSON.stringify({
    avatar: profile.avatar || '',
    oauth_provider: provider,
    oauth_id: providerId,
  });

  const existing = await db.query(
    'SELECT * FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1',
    [provider, providerId]
  );

  if (existing.rows[0]) {
    const user = existing.rows[0];
    // Nothing to do on a repeat sign-in unless the provider knows a newer
    // name/mailbox/avatar — avoids one UPDATE per login.
    const stale =
      user.name !== profile.name ||
      user.email !== profile.email ||
      (user.profile && user.profile.avatar) !== profile.avatar;
    if (!stale) return user;

    try {
      const updated = await db.query(
        // `$3::jsonb`: without the cast `jsonb || $3` is an ambiguous operator
        // match (the parameter type is unknown until PostgreSQL resolves it).
        `UPDATE users SET name = $1, email = $2, profile = profile || $3::jsonb
         WHERE id = $4 RETURNING *`,
        [profile.name, profile.email, identity, user.id]
      );
      return updated.rows[0];
    } catch (error) {
      if (!isDuplicateEntry(error)) throw error;
      // Another account already owns that mailbox: keep the stored email and
      // only refresh the parts that cannot collide.
      const updated = await db.query(
        'UPDATE users SET name = $1, profile = profile || $2::jsonb WHERE id = $3 RETURNING *',
        [profile.name, identity, user.id]
      );
      return updated.rows[0];
    }
  }

  if (!profile.emailVerified) {
    // Never mint or link an account from an address the provider does not vouch
    // for — that is exactly how an account takeover would look.
    throw Object.assign(new Error('provider email is not verified'), {
      isOAuthError: true,
      userCode: 'unverified-email',
    });
  }

  const linked = await db.query('SELECT * FROM users WHERE email = $1 LIMIT 1', [profile.email]);
  if (linked.rows[0]) {
    const updated = await db.query(
      `UPDATE users
       SET provider = $1, provider_id = $2, profile = profile || $3::jsonb
       WHERE id = $4 RETURNING *`,
      [provider, providerId, identity, linked.rows[0].id]
    );
    return updated.rows[0];
  }

  // Unusable by construction: 32 random bytes, never shown to anyone, only its
  // bcrypt hash is stored (so the row keeps the NOT NULL password contract).
  const placeholderPassword = await hashPassword(crypto.randomBytes(32).toString('hex'));
  try {
    const created = await db.query(
      `INSERT INTO users (name, email, password, provider, provider_id, profile)
       VALUES ($1, $2, $3, $4, $5, $6::jsonb)
       RETURNING *`,
      [profile.name, profile.email, placeholderPassword, provider, providerId, identity]
    );
    return created.rows[0];
  } catch (error) {
    if (!isDuplicateEntry(error)) throw error;
    // Lost a race with a parallel first sign-in — reuse the row that won.
    const raced = await db.query(
      'SELECT * FROM users WHERE provider = $1 AND provider_id = $2 LIMIT 1',
      [provider, providerId]
    );
    if (raced.rows[0]) return raced.rows[0];
    throw error;
  }
}

/** GET /api/auth/providers — which buttons the UI should offer (and how to set them up). */
router.get('/providers', (req, res) => {
  res.json({
    success: true,
    providers: oauth.configuredProviders(),
    redirectUris: {
      google: oauth.callbackUrl('google'),
      github: oauth.callbackUrl('github'),
    },
  });
});

/** Step 0: remember the attempt, then send the browser to the consent screen. */
function startAuth(provider) {
  return (req, res) => {
    if (!oauth.isConfigured(provider)) {
      return res.redirect(
        oauth.frontendUrl('/auth/callback', { status: 'error', provider, code: 'not-configured' })
      );
    }
    const state = oauth.generateState(provider);
    res.cookie(STATE_COOKIE, state, stateCookieOptions());
    res.redirect(oauth.buildAuthorizeUrl(provider, state));
  };
}

/** Step 3: validate the round trip, create/find the user, set the session. */
function handleCallback(provider) {
  return async (req, res) => {
    const query = req.query || {};
    const stored = parseCookies(req.headers && req.headers.cookie)[STATE_COOKIE];
    // One attempt, one state: consume it before doing anything else.
    clearStateCookie(res);

    const fail = (code) =>
      res.redirect(oauth.frontendUrl('/auth/callback', { status: 'error', provider, code }));

    if (query.error) {
      // The person pressed "Cancel" (access_denied) or the provider refused.
      logger.info('oauth login cancelled', { provider, error: query.error });
      return fail('provider-denied');
    }
    if (!stored || !query.code || !oauth.isValidState(provider, query.state, stored)) {
      return fail('state-mismatch');
    }
    if (!oauth.isConfigured(provider)) {
      return fail('not-configured');
    }

    try {
      const accessToken = await oauth.exchangeCode(provider, String(query.code));
      const profile = await oauth.fetchProfile(provider, accessToken);
      const user = await provisionUser(provider, profile);

      setSessionCookie(res, signToken(user), { remember: true });
      logger.info('oauth login succeeded', { provider, userId: user.id });
      return res.redirect(oauth.frontendUrl('/auth/callback', { status: 'success', provider }));
    } catch (error) {
      if (error && error.isOAuthError) {
        logger.warn('oauth login failed', { provider, code: error.userCode });
        return fail(error.userCode);
      }
      logger.error('oauth callback failed', { provider, message: error.message });
      return fail('server-error');
    }
  };
}

router.get('/google', startAuth('google'));
router.get('/google/callback', handleCallback('google'));
router.get('/github', startAuth('github'));
router.get('/github/callback', handleCallback('github'));

module.exports = router;
