const express = require('express');
const { rateLimit } = require('express-rate-limit');

const { db } = require('../db');
const { config } = require('../config');
const {
  generateResetToken,
  hashResetToken,
  isValidResetTokenFormat,
  requireAuth,
  signToken,
} = require('../auth');
const { compareAgainstDummy, hashPassword, verifyPassword } = require('../passwords');
const { sendPasswordResetEmail } = require('../mailer');
const {
  asString,
  isValidEmail,
  normalizeEmail,
  validateLogin,
  validatePassword,
  validateSignup,
} = require('../validators');

const router = express.Router();

// Brute-force protection for credential endpoints.
const credentialLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
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
    console.error('Signup error:', error);
    return res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

// POST /api/login
router.post('/login', credentialLimiter, async (req, res) => {
  const body = req.body || {};
  const email = normalizeEmail(body.email);
  const password = asString(body.password);

  const validationError = validateLogin({ email, password });
  if (validationError) {
    return res.status(400).json({ success: false, message: validationError });
  }

  try {
    const { rows } = await db.query(
      'SELECT id, name, email, password FROM users WHERE email = $1 LIMIT 1',
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

    const token = signToken(user);
    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error('Login error:', error);
    return res.status(500).json({ success: false, message: 'Error during login' });
  }
});

// GET /api/me — lets the client verify a stored session.
router.get('/me', requireAuth, (req, res) => {
  res.json({
    success: true,
    user: { id: req.user.id, name: req.user.name, email: req.user.email },
  });
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
        console.error('[forgot-password] Could not deliver reset email and SMTP is unavailable.');
      }
    }

    // Identical response whether or not the account exists (no user enumeration).
    return res.json({
      success: true,
      message: 'If an account exists for that email, a password reset code has been sent.',
    });
  } catch (error) {
    console.error('Forgot password error:', error);
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
    await db.query('UPDATE users SET password = $1 WHERE id = $2', [
      hashedPassword,
      record.user_id,
    ]);

    return res.json({ success: true, message: 'Password updated successfully. You can now log in.' });
  } catch (error) {
    console.error('Reset password error:', error);
    return res.status(500).json({ success: false, message: 'Error updating password.' });
  }
});

module.exports = router;
