// Local extractive summarizer — no API key, no network call, no cost.
//
// The Hugging Face free inference tier this endpoint used to call has been
// retired (old `api-inference.huggingface.co` is gone; the new router needs
// paid credits), so the server picks the most important sentences itself.
// Extractive is not abstractive, but it always works, responds instantly and
// never leaks provider errors to the client.

// Compact stopword list: common function words carry no topical signal.
const STOPWORDS = new Set(
  (
    'a an the and or but if while of to in on at by for with from as is are was ' +
    'were be been being it its this that these those he she they we you i me him ' +
    'her them us your my his their our not no nor so than then there here when ' +
    'where why how what which who whom whose all any both each few more most other ' +
    'some such only own same too very can will just should now do does did doing ' +
    'has have had having may might must about into over under again further once ' +
    'during before after above below out off down up am pm etc also one two three'
  ).split(' ')
);

function splitSentences(text) {
  // Sentence boundaries: terminator followed by whitespace + a likely new
  // sentence start. Keeps decimals (3.14) and abbreviations mostly intact.
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(\[])/)
    .map((s) => s.trim())
    .filter((s) => s.length > 1);
}

function tokenize(sentence) {
  return sentence
    .toLowerCase()
    .split(/[^a-z0-9']+/)
    .filter((word) => word.length > 2 && !STOPWORDS.has(word));
}

/**
 * Returns a summary string: the highest-scoring sentences, reordered back
 * into their original positions so the result still reads coherently.
 *
 * @param {string} text  raw input (already length-validated by the route)
 * @returns {string}
 */
function summarize(text) {
  const sentences = splitSentences(text);
  if (sentences.length <= 2) return text.trim();

  // Term frequency across the whole document.
  const frequency = new Map();
  for (const sentence of sentences) {
    for (const word of tokenize(sentence)) {
      frequency.set(word, (frequency.get(word) || 0) + 1);
    }
  }

  // Score each sentence: sum of its term frequencies, length-normalised so a
  // wall of words does not automatically beat a short, dense sentence.
  const scored = sentences.map((sentence, index) => {
    const words = tokenize(sentence);
    if (!words.length) return { index, sentence, score: 0 };
    const score = words.reduce((sum, word) => sum + (frequency.get(word) || 0), 0);
    // Early sentences introduce the topic — a small position bonus reflects that.
    const positionBonus = index < 2 ? 1.25 : 1;
    return { index, sentence, score: (score / Math.sqrt(words.length)) * positionBonus };
  });

  // Keep roughly the top 30% (at least 1, at most 5 sentences).
  const keep = Math.min(5, Math.max(1, Math.round(sentences.length * 0.3)));
  const chosen = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, keep)
    .sort((a, b) => a.index - b.index);

  return chosen.map((item) => item.sentence).join(' ');
}

module.exports = { summarize };
