import apiClient from './apiClient';

/**
 * AI feature calls.
 *
 * The browser only ever talks to our own backend. The one server-side key
 * (Stability AI) stays on the server, which proxies the request — nothing
 * secret is bundled into the JS. Summarization is computed on the server
 * without any key, and background removal runs in the browser itself.
 */

/** Reads a useful, safe message out of an Axios error (JSON or Blob payloads). */
export async function extractErrorMessage(error) {
  const data = error?.response?.data;
  if (data instanceof Blob) {
    try {
      const text = await data.text();
      const json = JSON.parse(text);
      // Only a well-formed message field is trusted — never the raw body,
      // which could be an HTML error page from a proxy or framework.
      if (typeof json.message === 'string' && json.message.trim()) return json.message;
    } catch {
      /* fall through to the generic string */
    }
    return 'Request failed. Please try again.';
  }
  // The interceptor already overwrote 5xx messages with a safe generic string,
  // so data.message here is either a server-provided safe message or the
  // sanitized one. Never surface axios's raw internal error text.
  return data?.message || 'Request failed. Please try again.';
}

/** Generates an image and returns a Blob (caller wraps it in an object URL). */
export async function generateImage(prompt) {
  const res = await apiClient.post('/ai/text-to-image', { prompt }, { responseType: 'blob' });
  return res.data;
}

/** Summarizes text; returns the model output (array with summary_text). */
export async function summarizeText(text) {
  const res = await apiClient.post('/ai/summarize', { text });
  return res.data;
}

/**
 * Runs the rule-based prompt critic. Returns { originalPrompt, improvedPrompt,
 * score, summary, strengths, improvements, missingDimensions, notes }.
 * This analyzes the prompt TEXT only — it does not inspect the image.
 */
export async function criticizePrompt(prompt) {
  const res = await apiClient.post('/ai/criticize-prompt', { prompt });
  return res.data;
}

/** Records usage for the logged-in user (the server derives the user id). */
export async function logFeatureUsage(feature) {
  try {
    await apiClient.post('/feature-usage', { feature });
  } catch {
    // Usage logging is best-effort — never block the feature or dump the
    // full error object (which can include response bodies) to the console.
  }
}
