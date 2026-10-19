const express = require('express');
const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const { config } = require('../config/config');
const { requireAuth } = require('../middleware/auth');
const logger = require('../lib/logger');
const { LIMITS, asString } = require('../lib/validators');
const { summarize } = require('../lib/summarizer');

const router = express.Router();

const UPSTREAM_TIMEOUT_MS = 45000;

// AI endpoints are relatively expensive: keep a tighter budget per IP.
const aiLimiter = rateLimit({
  windowMs: config.rateLimits.aiWindowMs,
  limit: config.rateLimits.ai,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  keyGenerator: (req) => ipKeyGenerator(req.ip || ''),
  handler: (req, res, next, options) =>
    res
      .status(options.statusCode)
      .json({ success: false, message: 'Too many AI requests. Please slow down.' }),
});

router.use(requireAuth, aiLimiter);

function stripDataUrl(value) {
  const match = /^data:[^;,]*;base64,(.*)$/s.exec(value);
  return match ? match[1] : value;
}

function parseCrop(body) {
  const keys = ['x', 'y', 'width', 'height'];
  const crop = {};
  for (const key of keys) {
    const raw = body[key];
    if (raw === undefined || raw === null || raw === '') return null;
    const value = Number(raw);
    if (!Number.isFinite(value) || value < 0 || value > 100000) return null;
    crop[key] = Math.round(value);
  }
  if (crop.width <= 0 || crop.height <= 0) return null;
  return crop;
}

async function failUpstream(res, upstream, fallbackMessage) {
  let detail = '';
  try {
    detail = (await upstream.text()).slice(0, 300);
  } catch {
    /* body unavailable */
  }
  logger.error('upstream provider error', { status: upstream.status, detail });
  return res.status(502).json({ success: false, message: fallbackMessage });
}

function requireKey(res, key, name) {
  if (key) return true;
  // The env-var name is logged server-side only — never sent to the client.
  logger.error('AI key not configured', { provider: name });
  res.status(503).json({
    success: false,
    message: 'This feature is temporarily unavailable. Please try again later.',
  });
  return false;
}

// POST /api/ai/text-to-image  { prompt }
router.post('/text-to-image', async (req, res) => {
  const prompt = asString((req.body || {}).prompt).trim();
  if (!prompt || prompt.length > LIMITS.prompt) {
    return res
      .status(400)
      .json({ success: false, message: `Prompt must be 1-${LIMITS.prompt} characters.` });
  }

  if (!requireKey(res, config.apiKeys.stability, 'STABILITY_API_KEY')) return;

  try {
    const form = new FormData();
    form.append('prompt', prompt);
    form.append('output_format', 'png');

    const upstream = await fetch('https://api.stability.ai/v2beta/stable-image/generate/core', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKeys.stability}`,
        Accept: 'image/*',
      },
      body: form,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      return failUpstream(res, upstream, 'Image generation failed. Please try again.');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
    return res.send(buffer);
  } catch (error) {
    logger.error('text-to-image failed', { message: error.message });
    return res.status(502).json({ success: false, message: 'Image generation failed.' });
  }
});

// POST /api/ai/remove-bg  { imageBase64, x?, y?, width?, height? }
router.post('/remove-bg', async (req, res) => {
  const body = req.body || {};
  const imageBase64 = stripDataUrl(asString(body.imageBase64).trim());
  if (!imageBase64 || imageBase64.length > LIMITS.imageBase64) {
    return res.status(400).json({ success: false, message: 'A valid image is required.' });
  }

  if (!requireKey(res, config.apiKeys.removeBg, 'REMOVE_BG_API_KEY')) return;

  const crop = parseCrop(body);

  try {
    const form = new FormData();
    form.append('image_file_base64', imageBase64);
    form.append('size', 'auto');
    if (crop) {
      form.append('x', String(crop.x));
      form.append('y', String(crop.y));
      form.append('width', String(crop.width));
      form.append('height', String(crop.height));
    }

    const upstream = await fetch('https://api.remove.bg/v1.0/removebg', {
      method: 'POST',
      headers: { 'X-Api-Key': config.apiKeys.removeBg },
      body: form,
      signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS),
    });

    if (!upstream.ok) {
      return failUpstream(res, upstream, 'Background removal failed. Please try again.');
    }

    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set('Content-Type', upstream.headers.get('content-type') || 'image/png');
    return res.send(buffer);
  } catch (error) {
    logger.error('remove-bg failed', { message: error.message });
    return res.status(502).json({ success: false, message: 'Background removal failed.' });
  }
});

// POST /api/ai/summarize  { text }
//
// Runs a local extractive summarizer (backend/lib/summarizer.js) — no
// third-party API, key or network hop. The response shape is unchanged:
// [{ summary_text }].
router.post('/summarize', async (req, res) => {
  const text = asString((req.body || {}).text).trim();
  if (!text || text.length > LIMITS.text) {
    return res
      .status(400)
      .json({ success: false, message: `Text must be 1-${LIMITS.text} characters.` });
  }

  try {
    const summary = summarize(text);
    if (!summary) {
      logger.error('summarizer produced an empty result');
      return res
        .status(502)
        .json({ success: false, message: 'Summarization failed. Please try again.' });
    }
    return res.json([{ summary_text: summary }]);
  } catch (error) {
    logger.error('summarize failed', { message: error.message });
    return res.status(502).json({ success: false, message: 'Summarization failed.' });
  }
});

module.exports = router;
