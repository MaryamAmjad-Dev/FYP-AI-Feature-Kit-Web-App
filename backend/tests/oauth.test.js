const test = require('node:test');
const assert = require('node:assert/strict');

const { config } = require('../config/config');
const {
  buildAuthorizeUrl,
  callbackUrl,
  configuredProviders,
  frontendUrl,
  generateState,
  isConfigured,
  isKnownProvider,
  isValidState,
} = require('../lib/oauth');

test('generateState is provider-prefixed, url-safe and unique', () => {
  const state = generateState('google');
  assert.ok(state.startsWith('google.'), 'state must name its provider');
  assert.match(state, /^google\.[A-Za-z0-9_-]+$/, 'state must survive a query string round trip');
  assert.notEqual(state, generateState('google'), 'two attempts must never share a state');
  assert.notEqual(generateState('google'), generateState('github'));
});

test('isValidState accepts only the state we issued, for the right provider', () => {
  const state = generateState('google');

  assert.equal(isValidState('google', state, state), true);
  // Tampered / guessed / swapped values must never validate.
  assert.equal(isValidState('google', `${state}x`, state), false);
  assert.equal(isValidState('google', state.slice(0, -1), state), false);
  assert.equal(isValidState('google', state, generateState('google')), false);
  assert.equal(isValidState('google', generateState('github'), state), false);
  assert.equal(isValidState('github', state, state), false);
  assert.equal(isValidState('google', '', ''), false);
  assert.equal(isValidState('google', undefined, undefined), false);
  assert.equal(isValidState('google', null, null), false);
  assert.equal(isValidState('google', state, ''), false);
});

test('callbackUrl points at the API path the provider console must whitelist', () => {
  for (const provider of ['google', 'github']) {
    const url = callbackUrl(provider);
    assert.ok(url.endsWith(`/auth/${provider}/callback`), `unexpected ${url}`);
    assert.ok(url.startsWith(config.oauth.callbackBase), `${url} must sit under the callback base`);
  }
});

test('buildAuthorizeUrl carries everything the consent screen needs', () => {
  const state = generateState('google');
  const url = new URL(buildAuthorizeUrl('google', state));

  assert.equal(url.searchParams.get('response_type'), 'code');
  assert.equal(url.searchParams.get('state'), state);
  assert.equal(url.searchParams.get('redirect_uri'), callbackUrl('google'));
  assert.equal(url.searchParams.get('client_id'), config.oauth.google.clientId);
  assert.ok(url.searchParams.get('scope')?.includes('email'));
  assert.equal(url.searchParams.get('prompt'), 'select_account');

  const github = new URL(buildAuthorizeUrl('github', generateState('github')));
  assert.equal(github.searchParams.get('redirect_uri'), callbackUrl('github'));
  assert.equal(github.searchParams.get('response_type'), 'code');
  assert.ok(!github.searchParams.has('prompt'), 'the prompt hint is Google-specific');
});

test('providers without credentials are reported as not configured', () => {
  assert.equal(isKnownProvider('google'), true);
  assert.equal(isKnownProvider('github'), true);
  assert.equal(isKnownProvider('facebook'), false);

  const providers = configuredProviders();
  assert.deepEqual(Object.keys(providers).sort(), ['github', 'google']);
  for (const [name, enabled] of Object.entries(providers)) {
    assert.equal(typeof enabled, 'boolean');
    assert.equal(isConfigured(name), enabled);
  }
  assert.equal(isConfigured('facebook'), false);
});

test('frontendUrl builds the post-round-trip landing page', () => {
  assert.equal(
    frontendUrl('/auth/callback', { status: 'success', provider: 'google' }),
    `${config.appUrl.replace(/\/+$/, '')}/auth/callback?status=success&provider=google`
  );
  // Empty values are dropped so the message never reads "code=".
  assert.equal(
    frontendUrl('/auth/callback', { status: 'error', code: '' }),
    `${config.appUrl.replace(/\/+$/, '')}/auth/callback?status=error`
  );
});

test('the OAuth router exposes exactly the endpoints the frontend calls', () => {
  const router = require('../routes/oauth.routes');
  const routes = router.stack
    .filter((layer) => layer.route)
    .map((layer) => `${Object.keys(layer.route.methods)[0].toUpperCase()} ${layer.route.path}`);

  assert.deepEqual(routes, [
    'GET /providers',
    'GET /google',
    'GET /google/callback',
    'GET /github',
    'GET /github/callback',
  ]);
});
