const test = require('node:test');
const assert = require('node:assert/strict');

const { BCRYPT_ROUNDS, compareAgainstDummy, hashPassword, verifyPassword } = require('../lib/passwords');

test('hashPassword produces a bcrypt hash, never the plain password', async () => {
  const hash = await hashPassword('secret123');
  assert.ok(hash.startsWith('$2'), 'expected a bcrypt hash');
  assert.notEqual(hash, 'secret123');
  assert.ok(hash.length >= 54);
  assert.equal(await hashPassword('secret123') !== hash, true, 'hashes must be salted');
});

test('verifyPassword accepts the right password and rejects the wrong one', async () => {
  const hash = await hashPassword('correct horse 1');
  assert.deepEqual(await verifyPassword('correct horse 1', hash), { valid: true, rehash: false });
  assert.deepEqual(await verifyPassword('wrong horse 1', hash), { valid: false, rehash: false });
});

test('legacy plain-text rows are accepted once and flagged for upgrade', async () => {
  assert.deepEqual(await verifyPassword('legacyPass1', 'legacyPass1'), {
    valid: true,
    rehash: true,
  });
  assert.deepEqual(await verifyPassword('nope12345', 'legacyPass1'), {
    valid: false,
    rehash: false,
  });
});

test('verifyPassword tolerates empty/malformed stored values', async () => {
  assert.deepEqual(await verifyPassword('anything1', ''), { valid: false, rehash: false });
  assert.deepEqual(await verifyPassword('anything1', null), { valid: false, rehash: false });
  // A truncated bcrypt hash must not be treated as plain text
  assert.deepEqual(await verifyPassword('$2b$12$short', '$2b$12$short'), {
    valid: false,
    rehash: false,
  });
});

test('compareAgainstDummy never validates an account that does not exist', async () => {
  const { valid, rehash } = await compareAgainstDummy('anything1');
  assert.equal(valid, false);
  assert.equal(rehash, false);
  // ...and it is a real bcrypt comparison, so timing matches a real lookup
  assert.ok(BCRYPT_ROUNDS >= 10);
});
