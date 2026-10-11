const express = require('express');
const { rateLimit } = require('express-rate-limit');

const { db } = require('../db');
const { isAdmin, requireAuth } = require('../auth');
const { asString, isKnownFeature, isValidEmail, normalizeEmail, validateMessage, validateName } = require('../validators');

const router = express.Router();

const contactLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  handler: (req, res, next, options) =>
    res
      .status(options.statusCode)
      .json({ success: false, message: 'Too many requests. Please try again later.' }),
});

// POST /api/feature-usage — authenticated; the user id comes from the token,
// never from the request body (a client cannot log usage for someone else).
router.post('/feature-usage', requireAuth, async (req, res) => {
  const body = req.body || {};
  const feature = asString(body.feature).trim();

  if (!isKnownFeature(feature)) {
    return res.status(400).json({ success: false, message: 'Unknown feature.' });
  }

  try {
    await db.query('INSERT INTO user_feature_usage (user_id, feature) VALUES ($1, $2)', [
      req.user.id,
      feature,
    ]);
    return res.json({ success: true });
  } catch (error) {
    console.error('Feature usage log error:', error);
    return res.status(500).json({ success: false, message: 'Error logging feature usage' });
  }
});

// GET /api/feature-usage — authenticated: admins see everything,
// everyone else sees only their own history (no PII of other users).
router.get('/feature-usage', requireAuth, async (req, res) => {
  try {
    if (isAdmin(req.user.email)) {
      const { rows } = await db.query(
        `SELECT ufu.id, ufu.feature, ufu.used_at, u.id as user_id, u.name, u.email
         FROM user_feature_usage ufu
         JOIN users u ON ufu.user_id = u.id
         ORDER BY ufu.used_at DESC`
      );
      return res.json({ success: true, scope: 'all', usage: rows });
    }

    const { rows } = await db.query(
      `SELECT id, feature, used_at
       FROM user_feature_usage
       WHERE user_id = $1
       ORDER BY used_at DESC`,
      [req.user.id]
    );
    return res.json({ success: true, scope: 'own', usage: rows });
  } catch (error) {
    console.error('Feature usage fetch error:', error);
    return res.status(500).json({ success: false, message: 'Error fetching feature usage' });
  }
});

// POST /api/contact — public, validated and rate limited.
router.post('/contact', contactLimiter, async (req, res) => {
  const body = req.body || {};
  const name = asString(body.name).trim();
  const email = normalizeEmail(body.email);
  const message = asString(body.message).trim();

  const error =
    validateName(name) ||
    (isValidEmail(email) ? null : 'Please enter a valid email address.') ||
    validateMessage(message);
  if (error) {
    return res.status(400).json({ success: false, message: error });
  }

  try {
    await db.query('INSERT INTO contact_messages (name, email, message) VALUES ($1, $2, $3)', [
      name,
      email,
      message,
    ]);
    return res.json({ success: true, message: 'Feedback sent and saved!' });
  } catch (error) {
    console.error('Contact error:', error);
    return res.status(500).json({ success: false, message: 'Error sending feedback.' });
  }
});

module.exports = router;
