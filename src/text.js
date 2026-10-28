/**
 * Language data for the word lists: alphabets, letter frequencies, Turkish-aware uppercasing
 * and dictionary order. Pure module.
 */

/** Languages that have word lists. */
export const LANGUAGES = Object.freeze(['en', 'tr']);

/** Uppercase alphabets in dictionary order. */
export const ALPHABETS = Object.freeze({
  en: Object.freeze([...'ABCDEFGHIJKLMNOPQRSTUVWXYZ']),
  tr: Object.freeze([...'ABCÇDEFGĞHIİJKLMNOÖPRSŞTUÜVYZ']),
});

/** Approximate letter frequencies in percent; filler letters are drawn with these weights. */
export const LETTER_FREQUENCIES = Object.freeze({
  en: Object.freeze({
    A: 8.17, B: 1.49, C: 2.78, D: 4.25, E: 12.7, F: 2.23, G: 2.02, H: 6.09, I: 6.97,
    J: 0.15, K: 0.77, L: 4.03, M: 2.41, N: 6.75, O: 7.51, P: 1.93, Q: 0.1, R: 5.99,
    S: 6.33, T: 9.06, U: 2.76, V: 0.98, W: 2.36, X: 0.15, Y: 1.97, Z: 0.07,
  }),
  tr: Object.freeze({
    A: 11.92, B: 2.84, C: 0.96, Ç: 1.16, D: 4.71, E: 8.91, F: 0.46, G: 1.25, Ğ: 1.13, H: 1.21,
    I: 5.11, İ: 8.6, J: 0.03, K: 4.68, L: 5.92, M: 3.75, N: 7.49, O: 2.48, Ö: 0.78, P: 0.89,
    R: 6.72, S: 3.01, Ş: 1.78, T: 3.01, U: 3.24, Ü: 1.85, V: 0.96, Y: 3.34, Z: 1.5,
  }),
});

const ALPHABET_ORDER = new Map(
  LANGUAGES.map((lang) => [lang, new Map(ALPHABETS[lang].map((letter, index) => [letter, index]))]),
);

/**
 * Uppercases text with the rules of a language. Turkish maps i -> İ and ı -> I whatever the
 * host locale is, so "kiraz" becomes "KİRAZ" and "ılık" becomes "ILIK".
 * @param {string} text
 * @param {string} lang
 * @returns {string}
 */
export function toUpperLang(text, lang) {
  if (lang !== 'tr') return text.toUpperCase();
  return text.replaceAll('i', 'İ').replaceAll('ı', 'I').toUpperCase();
}

/**
 * True when every character of `word` is a letter of the language's uppercase alphabet.
 * @param {string} word
 * @param {string} lang
 * @returns {boolean}
 */
export function isInAlphabet(word, lang) {
  const order = ALPHABET_ORDER.get(lang);
  return Boolean(order) && [...word].every((letter) => order.has(letter));
}

/**
 * Compares two uppercase words in the dictionary order of a language (in Turkish Ç follows C
 * and I comes before İ). Suitable for Array#sort.
 * @param {string} a
 * @param {string} b
 * @param {'en'|'tr'} lang
 * @returns {number}
 */
export function compareWords(a, b, lang) {
  const order = ALPHABET_ORDER.get(lang);
  const length = Math.min(a.length, b.length);
  for (let i = 0; i < length; i += 1) {
    const diff = order.get(a[i]) - order.get(b[i]);
    if (diff !== 0) return diff;
  }
  return a.length - b.length;
}
