// Shared rate-limit store.
//
// express-rate-limit's default MemoryStore is per process, which on a
// serverless platform (Vercel, Lambda) means every cold instance starts with
// a fresh counter — so the limits barely hold. When Upstash Redis REST
// credentials are configured the counters live in one shared database
// instead; otherwise the in-memory store is used (fine for a single
// long-running Node process, e.g. `npm start` locally).
//
// Zero new dependencies: the Upstash REST API is plain HTTP (INCR/PEXPIRE),
// called with the global fetch.

const logger = require('../lib/logger');

class UpstashStore {
  constructor({ url, token, prefix = 'rl' }) {
    this.url = url.replace(/\/+$/, '');
    this.token = token;
    this.prefix = prefix;
  }

  key(key) {
    return `${this.prefix}:${key}`;
  }

  async command(...args) {
    const response = await fetch(this.url, {
      method: 'POST',
      headers: { Authorization: `Bearer ${this.token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify(args),
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`Upstash responded ${response.status}`);
    return (await response.json()).result;
  }

  /** express-rate-limit v7/v8 store interface. */
  async increment(key) {
    const full = this.key(key);
    const total = Number(await this.command('INCR', full));
    // First hit in this window → set the expiry (PX = milliseconds).
    if (total === 1) {
      const windowMs = Number(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000;
      await this.command('PEXPIRE', full, String(windowMs));
    }
    const ttl = Number(await this.command('PTTL', full));
    return { totalHits: total, resetTime: ttl > 0 ? new Date(Date.now() + ttl) : new Date() };
  }

  async decrement(key) {
    await this.command('DECR', this.key(key));
  }

  async resetKey(key) {
    await this.command('DEL', this.key(key));
  }
}

/**
 * Returns a shared store when UPSTASH_REDIS_REST_URL/TOKEN are set,
 * otherwise null (the caller keeps the default MemoryStore).
 */
function createSharedStore() {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  logger.info('rate-limit store', { store: 'upstash' });
  return new UpstashStore({ url, token });
}

module.exports = { UpstashStore, createSharedStore };
