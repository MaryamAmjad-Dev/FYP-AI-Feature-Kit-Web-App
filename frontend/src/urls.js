/**
 * External link helpers.
 *
 * Anything that ends up in an `href` goes through here first: only https://
 * URLs survive, so a value read from storage (or an API) can never turn into
 * a `javascript:` link or a data: URL.
 */
export function safeExternalUrl(value) {
  const raw = typeof value === 'string' ? value.trim() : '';
  if (!raw) return '';
  if (!/^https:\/\//i.test(raw)) return '';
  try {
    const parsed = new URL(raw);
    return parsed.protocol === 'https:' ? parsed.toString() : '';
  } catch {
    return '';
  }
}

/** Same rules, but returns null when the value is unusable (for guards). */
export function externalUrlOrNull(value) {
  return safeExternalUrl(value) || null;
}
