const test = require('node:test');
const assert = require('node:assert/strict');

const { criticizePrompt } = require('../lib/promptCritic');

test('critique returns the documented shape with a bounded integer score', () => {
  const out = criticizePrompt('a dragon');
  assert.equal(typeof out.originalPrompt, 'string');
  assert.equal(typeof out.improvedPrompt, 'string');
  assert.ok(Number.isInteger(out.score) && out.score >= 0 && out.score <= 100, `bad score ${out.score}`);
  assert.ok(Array.isArray(out.strengths));
  assert.ok(Array.isArray(out.improvements));
  assert.ok(Array.isArray(out.missingDimensions));
  assert.equal(typeof out.summary, 'string');
  // Must be honest that it is prompt-based, not vision.
  assert.match(out.notes, /does not inspect/i);
});

test('a bare prompt scores lower and gains concrete additions', () => {
  const out = criticizePrompt('dragon');
  assert.ok(out.improvedPrompt.startsWith('dragon'), 'should keep the original wording first');
  assert.ok(out.improvedPrompt.length > 'dragon'.length, 'should append missing dimensions');
  assert.ok(out.missingDimensions.length >= 3, 'most dimensions are missing for a one-word prompt');
});

test('a rich, well-specified prompt scores higher than a bare one', () => {
  const bare = criticizePrompt('dragon');
  const rich = criticizePrompt(
    'a photorealistic dragon in cinematic lighting, wide-angle framing with shallow depth of field, highly detailed, 8k, vibrant color palette'
  );
  assert.ok(rich.score > bare.score, `expected ${rich.score} > ${bare.score}`);
  assert.equal(rich.missingDimensions.length, 0, 'no dimension should be missing');
  // Nothing to add → the improved prompt equals the original.
  assert.equal(rich.improvedPrompt, rich.originalPrompt);
});

test('the critic is deterministic', () => {
  const a = criticizePrompt('a castle at sunset');
  const b = criticizePrompt('a castle at sunset');
  assert.deepEqual(a, b);
});

test('vague wording and rendered-text requests are flagged', () => {
  const out = criticizePrompt('something cool with text and a logo');
  assert.ok(out.improvements.some((m) => /vague/i.test(m)), 'should flag vague wording');
  assert.ok(out.improvements.some((m) => /render poorly|garbled/i.test(m)), 'should flag text/logo');
});

test('handles empty and non-string input without throwing', () => {
  assert.doesNotThrow(() => criticizePrompt(''));
  assert.doesNotThrow(() => criticizePrompt(null));
  assert.doesNotThrow(() => criticizePrompt(12345));
});
