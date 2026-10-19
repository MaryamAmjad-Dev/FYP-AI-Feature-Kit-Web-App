// Rule-based prompt critic for the Text-to-Image "Self-Critic" feature.
//
// IMPORTANT — what this is NOT: it is not a language model and not a vision
// model. It never looks at the generated image (no vision provider is
// configured for this project). It is a deterministic, offline analysis of the
// *text prompt itself*: a fixed set of heuristics that reward the qualities
// image models actually respond to (a concrete subject, style, lighting,
// composition and level of detail) and flag the ones that hurt results (vague
// wording, requests for rendered text/watermarks). The same input always
// produces the same output — no API key, no network call, no cost.

// Vocabulary each dimension watches for. Matching is a case-insensitive
// substring test on the lowercased prompt.
const DIMENSIONS = [
  {
    key: 'style',
    label: 'art style',
    hints: [
      'photorealistic', 'realistic', 'photo', 'illustration', 'anime', 'manga',
      'oil painting', 'watercolor', 'watercolour', 'sketch', 'pencil', '3d',
      'render', 'cinematic', 'concept art', 'pixel art', 'flat design',
      'minimalist', 'vintage', 'surreal', 'comic', 'poster',
    ],
    // A neutral, widely useful default the model renders reliably.
    suggest: 'cinematic photorealistic style',
  },
  {
    key: 'lighting',
    label: 'lighting',
    hints: [
      'light', 'lighting', 'lit', 'sunset', 'sunrise', 'golden hour', 'noon',
      'midnight', 'neon', 'studio', 'backlit', 'rim light', 'candlelit',
      'volumetric', 'dramatic light', 'soft light', 'moody light',
    ],
    suggest: 'soft cinematic lighting',
  },
  {
    key: 'composition',
    label: 'framing / composition',
    hints: [
      'close-up', 'closeup', 'wide', 'macro', 'aerial', 'portrait',
      'landscape', 'from above', 'from below', 'low angle', 'high angle',
      'panorama', 'symmetrical', 'depth of field', 'bokeh', 'foreground',
      'bird s eye', 'first person',
    ],
    suggest: 'wide-angle framing with shallow depth of field',
  },
  {
    key: 'detail',
    label: 'detail level',
    hints: [
      'detailed', 'intricate', 'sharp', '8k', '4k', 'hd', 'high resolution',
      'crisp', 'textured', 'fine detail', 'highly detailed', 'ultra',
    ],
    suggest: 'highly detailed, sharp focus, 8k resolution',
  },
  {
    key: 'color',
    label: 'color / mood',
    hints: [
      'vibrant', 'muted', 'pastel', 'monochrome', 'grayscale', 'greyscale',
      'colorful', 'colourful', 'moody', 'warm', 'cool tone', 'teal and orange',
      'high contrast', 'soft palette', 'saturated', 'earthy',
    ],
    suggest: 'vivid, balanced color palette',
  },
];

// Words that make a prompt vague rather than concrete.
const VAGUE_TERMS = [
  'something', 'stuff', 'thing', 'etc', 'nice', 'good', 'cool', 'interesting',
  'nice looking', 'some kind of',
];

// Concepts diffusion models render poorly (misspelled / garbled text, stray
// marks). Flag them and suggest moving the description to composition instead.
const PROBLEM_TERMS = [
  'text', 'words', 'word', 'letters', 'letter', 'logo', 'watermark',
  'signature', 'caption', 'typography', 'spelling', 'font', 'subtitle',
];

function wordsOf(text) {
  return text.toLowerCase().match(/[a-z0-9']+/g) || [];
}

function includesAny(lower, hints) {
  return hints.some((hint) => lower.includes(hint));
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

/**
 * Analyze a prompt and return a structured critique plus an improved prompt.
 *
 * @param {string} prompt raw user prompt
 * @returns {{
 *   originalPrompt: string,
 *   improvedPrompt: string,
 *   score: number,              // 0-100, integer
 *   summary: string,            // one-line overall assessment
 *   strengths: string[],        // things the prompt already does well
 *   improvements: string[],     // specific, actionable gaps
 *   missingDimensions: string[],// dimension labels absent from the prompt
 *   notes: string               // honest disclaimer about what this is
 * }}
 */
function criticizePrompt(prompt) {
  const originalPrompt = typeof prompt === 'string' ? prompt.trim() : '';
  const lower = originalPrompt.toLowerCase();
  const words = wordsOf(originalPrompt);

  const strengths = [];
  const improvements = [];
  const missingDimensions = [];
  const additions = [];

  // Start from a low baseline; each detected quality adds to it.
  let score = 20;

  // --- Prompt length -------------------------------------------------------
  if (words.length >= 6 && words.length <= 60) {
    score += 15;
    strengths.push('Prompt has a good amount of descriptive detail.');
  } else if (words.length < 6) {
    improvements.push(
      'Prompt is very short — add the subject, setting and a couple of adjectives so the model has more to work with.'
    );
  } else {
    score += 6;
    strengths.push('Prompt is rich in detail (very long prompts can drift; keep the key subject first).');
  }

  // --- Present vs missing quality dimensions -------------------------------
  const presentLabels = [];
  for (const dim of DIMENSIONS) {
    if (includesAny(lower, dim.hints)) {
      presentLabels.push(dim.label);
    } else {
      missingDimensions.push(dim.label);
      additions.push(dim.suggest);
    }
  }
  score += presentLabels.length * 8;
  if (presentLabels.length) {
    strengths.push(`Already specifies ${presentLabels.join(', ')} — image models render these reliably.`);
  }
  for (const label of missingDimensions) {
    improvements.push(`No ${label} given — the model will invent one; state it to steer the result.`);
  }

  // --- Vague wording -------------------------------------------------------
  const vagueFound = VAGUE_TERMS.filter((term) => lower.includes(term));
  if (vagueFound.length) {
    score -= 10;
    improvements.push(
      `Vague wording detected ("${vagueFound.join('", "')}") — replace it with a concrete description.`
    );
  }

  // --- Hard-to-render concepts (text / logos / watermarks) -----------------
  const problemFound = PROBLEM_TERMS.filter((term) => words.includes(term));
  if (problemFound.length) {
    score -= 12;
    improvements.push(
      `Asks for "${problemFound.join('", "')}" — image models render these poorly (garbled text). Prefer describing the scene instead.`
    );
  }

  // --- Build the improved prompt -------------------------------------------
  // Keep the user's original wording and append only the missing dimensions,
  // capped so the prompt stays focused.
  let improvedPrompt = originalPrompt;
  if (additions.length) {
    const base = originalPrompt.replace(/[.,;\s]+$/g, '');
    improvedPrompt = `${base}, ${additions.slice(0, 3).join(', ')}`;
  }

  score = clamp(Math.round(score), 5, 96);

  const summary =
    missingDimensions.length === 0 && !vagueFound.length && !problemFound.length
      ? 'Strong, well-specified prompt — the model should follow it closely.'
      : `Score ${score}/100 — solid base, but ${missingDimensions.length} dimension(s) are left to the model's guess.`;

  return {
    originalPrompt,
    improvedPrompt,
    score,
    summary,
    strengths,
    improvements,
    missingDimensions,
    notes:
      'Prompt-based analysis: this critic evaluates your text prompt with fixed rules — it does not inspect the generated image pixels.',
  };
}

module.exports = { criticizePrompt, DIMENSIONS };
