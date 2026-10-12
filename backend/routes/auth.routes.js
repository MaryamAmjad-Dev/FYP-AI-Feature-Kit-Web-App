const express = require('express');
const { rateLimit } = require('express-rate-limit');

const { db } = require('../db');
const { config } = require('../config');
const logger = require('../logger');
const {
  clearSessionCookie,
  generateResetToken,
  hashResetToken,
  isValidResetTokenFormat,
  requireAuth,
  setSessionCookie,
  signToken,
} = require('../auth');
const { compareAgainstDummy, hashPassword, verifyPassword } = require('../passwords');
const { sendPasswordResetEmail } = require('../mailer');
const {
  asString,
  isValidEmail,
  normalizeEmail,
  sanitizeProfilePatch,
  validateLogin,
  validatePassword,
  validateSignup,
} = require('../validators');

const router = express.Router();

// Brute-force protection for login/signup/password-reset.
// The counter is in-memory (or shared via Upstash when configured), so keep
// the limit forgiving — a classroom/viva network shares one public IP.
const credentialLimiter = rateLimit({
  windowMs: config.rateLimits.windowMs,
  limit: config.rateLimits.credentials,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res
      .status(options.statusCode)
      .json({ success: false, message: 'Too many attempts. Please try again later.' }),
});

function isDuplicateEntry(error) {
  // 23505 = unique_violation (users_email_key)
  return error && error.code === '23505';
}

/** Shape a users row (with profile JSONB) for API responses. */
function publicUser(row) {
  const profile = (row && row.profile && typeof row.profile === 'object') ? row.profile : {};
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    role: profile.role || '',
    phone: profile.phone || '',
    location: profile.location || '',
    bio: profile.bio || '',
    skills: Array.isArray(profile.skills) ? profile.skills : [],
    linkedin: profile.linkedin || '',
    github: profile.github || '',
  };
}

// POST /api/signup
router.post('/signup', credentialLimiter, async (req, res) => {
  const body = req.body || {};
  const name = asString(body.name).trim();
  const email = normalizeEmail(body.email);
  const password = asString(body.password);

  const validationError = validateSignup({ name, email, password });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const hashedPassword = await hashPassword(password);
    // The UNIQUE index is the real guard against duplicate accounts (race safe).
    const result = await db.query(
      'INSERT INTO users (name, email, password) VALUES ($1, $2, $3) RETURNING id',
      [name, email, hashedPassword]
    );

    return res.status(201).json({
      success: true,
      message: 'User created successfully',
      userId: result.rows[0].id,
    });
  } catch (error) {
    if (isDuplicateEntry(error)) {
      return res
        .status(409)
        .json({ success: false, message: 'An account with this email already exists.' });
    }
    logger.error('signup failed', { code: error.code, message: error.message });
    return res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// POST /api/login — the JWT travels back as an httpOnly cookie, never in the
// response body, so page JavaScript cannot read it.
router.post('/login', credentialLimiter, async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = asString(body.password);
  const remember = body.rememberMe === true || body.rememberMe === 'true';

  const validationError = validateLogin({ email, password });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, password, profile, token_version FROM users WHERE email = $1 LIMIT 1',
      [email]
    );
    const user = rows[0];

    if (!user) {
      await compareAgainstDummy(password);
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    const { valid, rehash } = await verifyPassword(password, user.password);
    if (rehash) {
      // Legacy plain-text row: the password was correct, upgrade it to bcrypt.
      const upgraded = await hashPassword(password);
      await db.query('UPDATE users SET password = $1 WHERE id = $2', [upgraded, user.id]);
    }

    if (!valid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password.' });
    }

    setSessionCookie(res, signToken(user), { remember });
    return res.json({
      success: true,
      message: 'Login successful',
      user: publicUser(user),
    });
  } catch (error) {
    logger.error('login failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error during login' });
  }
});

// POST /api/logout — drops the session cookie on this device.
router.post('/logout', (req, res) => {
  clearSessionCookie(res);
  return res.json({ success: true, message: 'Logged out.' });
});

// GET /api/me — lets the client verify a stored session.
router.get('/me', requireAuth, async (req, res) => {
  const { rows } = await db.query('SELECT id, name, email, profile FROM users WHERE id = $1 LIMIT 1', [
    req.user.id,
  ]);
  if (!rows[0]) {
    return res.status(401).json({ success: false, message: 'Session is invalid or has expired.' });
  }
  return res.json({ success: true, user: publicUser(rows[0]) });
});

// PATCH /api/profile — persists the profile editor (role, contact, bio, skills).
router.patch('/profile', requireAuth, async (req, res) => {
  const patch = sanitizeProfilePatch(req.body || {});
  if (patch.error) {
    return res.status(400).json({ success: false, message: patch.error });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, profile FROM users WHERE id = $1 LIMIT 1',
      [req.user.id]
    );
    if (!rows[0]) {
      return res.status(401).json({ success: false, message: 'Session is invalid or has expired.' });
    }

    const profile = { ...(rows[0].profile || {}), ...patch.fields };
    const name = patch.name !== undefined ? patch.name : rows[0].name;

    const updated = await db.query(
      'UPDATE users SET name = $1, profile = $2 WHERE id = $3 RETURNING id, name, email, profile',
      [name, profile, req.user.id]
    );
    return res.json({ success: true, user: publicUser(updated.rows[0]) });
  } catch (error) {
    logger.error('profile update failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error updating profile.' });
  }
});

// POST /api/forgot-password — step 1: issue a one-time code (never a raw reset).
router.post('/forgot-password', credentialLimiter, async (req, res) => {
  const email = normalizeEmail((req.body || {}).email);
  if (!isValidEmail(email)) {
    return res.status(400).json({ success: false, message: 'Please enter a valid email address.' });
  }

  try {
    const { rows } = await db.query('SELECT id FROM users WHERE email = $1 LIMIT 1', [email]);

    if (rows.length > 0) {
      const userId = rows[0].id;
      const token = generateResetToken();
      const expiresAt = new Date(Date.now() + config.resetTokenTtlMs);

      // Invalidate every previous code for this account (one live code max).
      await db.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
      await db.query(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
        [userId, hashResetToken(token), expiresAt]
      );

      const delivered = await sendPasswordResetEmail(email, token);
      if (delivered === 'console') {
        // Development only: SMTP is not configured, the code is on the server console.
        return res.json({
          success: true,
          message: 'If an account exists for that email, a reset code has been issued.',
          delivery: 'console',
        });
      }
      if (delivered === false && config.isProduction) {
        logger.error('password reset email could not be delivered (SMTP not configured)');
      }
    }

    // Identical response whether or not the account exists (no user enumeration).
    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset code has been sent.',
    });
  } catch (error) {
    logger.error('forgot-password failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error processing password reset.' });
  }
});

// POST /api/reset-password — step 2: code + new password.
router.post('/reset-password', credentialLimiter, async (req, res) => {
  const body = req.body || {};
  const token = asString(body.token).trim();
  const newPassword = asString(body.newPassword);

  if (!isValidResetTokenFormat(token)) {
    return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
  }
  const passwordError = validatePassword(newPassword);
  if (passwordError) {
    return res.status(400).json({ success: false, message: passwordError });
  }

  try {
    const tokenHash = hashResetToken(token);
    const { rows } = await db.query(
      'SELECT id, user_id, expires_at, used_at FROM password_reset_tokens WHERE token_hash = $1 LIMIT 1',
      [tokenHash]
    );
    const record = rows[0];
    const expired = record && new Date(record.expires_at).getTime() <= Date.now();

    if (!record || record.used_at || expired) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    // Atomically claim the code first: even two parallel requests can only
    // succeed once, so a reset code is strictly single-use.
    const claim = await db.query(
      'UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1 AND used_at IS NULL AND expires_at > NOW()',
      [record.id]
    );
    if (claim.rowCount === 0) {
      return res.status(400).json({ success: false, message: 'Invalid or expired reset code.' });
    }

    const hashedPassword = await hashPassword(newPassword);
    // token_version++ revokes every JWT issued before the reset: a stolen
    // session dies the moment the real owner changes the password.
    await db.query('UPDATE users SET password = $1, token_version = token_version + 1 WHERE id = $2', [
      hashedPassword,
      record.user_id,
    ]);

    return res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    logger.error('reset-password failed', { message: error.message });
    return res.status(500).json({ success: false, message: 'Error updating password.' });
  }
});

module.exports = router;
