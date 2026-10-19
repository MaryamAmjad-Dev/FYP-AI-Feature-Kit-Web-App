import apiClient from './apiClient';

/**
 * AI feature calls.
 *
 * Every third-party key (Stability, remove.bg, Hugging Face) lives on the
 * server. The browser only ever talks to our own backend, which proxies the
 * request with the real key — nothing secret is bundled into the JS.
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

/** Converts a File into raw base64 (no data: prefix) for the AI proxy. */
export function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      resolve(result.includes(',') ? result.split(',')[1] : result);
    };
    reader.onerror = () => reject(new Error('Could not read the selected file.'));
    reader.readAsDataURL(file);
  });
}

/** Generates an image and returns a Blob (caller wraps it in an object URL). */
export async function generateImage(prompt) {
  const res = await apiClient.post('/ai/text-to-image', { prompt }, { responseType: 'blob' });
  return res.data;
}

/** Removes a background (optionally cropped to a region) and returns a Blob. */
export async function removeBackground({ imageBase64, crop }) {
  const res = await apiClient.post(
    '/ai/remove-bg',
    { imageBase64, ...(crop || {}) },
    { responseType: 'blob' }
  );
  return res.data;
}

/** Summarizes text; returns the model output (array with summary_text). */
export async function summarizeText(text) {
  const res = await apiClient.post('/ai/summarize', { text });
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
