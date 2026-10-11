const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');

const {
  extractToken,
  generateResetToken,
  hashResetToken,
  isAdmin,
  isValidResetTokenFormat,
  jwtSecret,
  signToken,
  verifyToken,
} = require('../auth');

const user = { id: 7, name: 'Ada', email: 'ada@example.com' };

function fakeReq(authorization) {
  return { get: (name) => (name.toLowerCase() === 'authorization' ? authorization : undefined) };
}

test('signToken/verifyToken round-trips the user identity', () => {
  const token = signToken(user);
  const payload = verifyToken(token);
  assert.equal(payload.id, 7);
  assert.equal(payload.email, 'ada@example.com');
  assert.equal(payload.name, 'Ada');
  assert.ok(payload.exp > Date.now() / 1000, 'token must carry an expiry');
});

test('verifyToken rejects tampered and garbage tokens', () => {
  const token = signToken(user);
  const [header, payload, signature] = token.split('.');
  const tampered = [header, Buffer.from(JSON.stringify({ id: 99 })).toString('base64url'), signature].join('.');
  assert.throws(() => verifyToken(tampered));
  assert.throws(() => verifyToken('not-a-token'));
  assert.throws(() => verifyToken(''));
});

test('verifyToken rejects expired tokens', () => {
  const expired = jwt.sign({ id: 1, email: 'a@b.com', name: 'A' }, jwtSecret, { expiresIn: -10 });
  assert.throws(() => verifyToken(expired), /expired/i);
});

test('extractToken reads only Bearer tokens', () => {
  assert.equal(extractToken(fakeReq('Bearer abc.def.ghi')), 'abc.def.ghi');
  assert.equal(extractToken(fakeReq('bearer   spaced  ')), 'spaced');
  assert.equal(extractToken(fakeReq('Basic dXNlcjpwYXNz')), null);
  assert.equal(extractToken(fakeReq('')), null);
  assert.equal(extractToken(fakeReq(undefined)), null);
});

test('reset tokens are random, hashable and format-checked', () => {
  const a = generateResetToken();
  const b = generateResetToken();

  assert.equal(a.length, 64);
  assert.notEqual(a, b);
  assert.equal(isValidResetTokenFormat(a), true);
  assert.equal(isValidResetTokenFormat('short'), false);
  assert.equal(isValidResetTokenFormat('z'.repeat(64)), false); // not hex
  assert.equal(isValidResetTokenFormat(null), false);

  // Only the hash is stored — it must be stable but not reveal the token.
  assert.equal(hashResetToken(a), hashResetToken(a));
  assert.notEqual(hashResetToken(a), hashResetToken(b));
  assert.notEqual(hashResetToken(a), a);
  assert.equal(hashResetToken(a).length, 64);
});

test('isAdmin matches only configured emails', () => {
  process.env.ADMIN_EMAILS = 'Admin@Example.com, other@example.com';
  // config is cached at require time, so assert against the loaded list instead.
  delete require.cache[require.resolve('../config')];
  delete require.cache[require.resolve('../auth')];
  const fresh = require('../auth');
  assert.equal(fresh.isAdmin('admin@example.com'), true);
  assert.equal(fresh.isAdmin('someone-else@example.com'), false);
  assert.equal(fresh.isAdmin(undefined), false);
  assert.equal(isAdmin('nobody@example.com'), false);
});
