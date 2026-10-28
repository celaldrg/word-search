/**
 * Word search generator. Words are placed along straight lines with backtracking (crossing
 * only where letters are equal), then the empty cells get frequency-weighted filler letters.
 * Every word ends up in the grid exactly once: no extra copy forwards or backwards in any of
 * the 8 directions. Pure and deterministic for a given seeded Rng.
 */
import { ALPHABETS, LANGUAGES, LETTER_FREQUENCIES, isInAlphabet } from './text.js';

/** @typedef {import('./rng.js').Rng} Rng */
/** @typedef {import('./selection.js').Cell} Cell */
/**
 * @typedef {object} Placement
 * @property {string} word
 * @property {string} direction Key of DIRECTIONS.
 * @property {Cell} start Cell of the first letter.
 * @property {Cell} end Cell of the last letter.
 */

/** Smallest supported grid size. */
export const MIN_SIZE = 10;

/** Largest supported grid size. */
export const MAX_SIZE = 15;

/** The 8 straight-line directions as row/column steps (compass names, north is up). */
export const DIRECTIONS = Object.freeze({
  E: Object.freeze({ dr: 0, dc: 1 }),
  W: Object.freeze({ dr: 0, dc: -1 }),
  S: Object.freeze({ dr: 1, dc: 0 }),
  N: Object.freeze({ dr: -1, dc: 0 }),
  SE: Object.freeze({ dr: 1, dc: 1 }),
  NW: Object.freeze({ dr: -1, dc: -1 }),
  NE: Object.freeze({ dr: -1, dc: 1 }),
  SW: Object.freeze({ dr: 1, dc: -1 }),
});

const DIRECTION_NAMES = Object.keys(DIRECTIONS);
const ALL_STEPS = Object.values(DIRECTIONS);
const MAX_ATTEMPTS = 40;
const TRIALS_PER_ATTEMPT = 5000;

/**
 * Picks up to `count` words in random order, skipping palindromes and any word that contains,
 * or is contained in, an already picked word or its reverse (such pairs cannot each appear
 * exactly once).
 * @param {readonly string[]} words
 * @param {number} count
 * @param {Rng} rng
 * @returns {string[]}
 */
export function pickWords(words, count, rng) {
  const picked = [];
  for (const word of rng.shuffle(words)) {
    if (picked.length === count) break;
    if (!isPalindrome(word) && !picked.some((other) => wordsClash(word, other))) picked.push(word);
  }
  return picked;
}

/**
 * Builds a puzzle that holds every word exactly once.
 * @param {object} options
 * @param {readonly string[]} options.words Uppercase words of the language's alphabet.
 * @param {'en'|'tr'} options.lang Alphabet for validation and filler letters.
 * @param {number} options.size Grid side, MIN_SIZE to MAX_SIZE.
 * @param {readonly string[]} options.directions Allowed placement directions (keys of DIRECTIONS).
 * @param {Rng} options.rng
 * @returns {{ size: number, grid: string[][], placements: Placement[] }} grid[row][col] holds one letter
 * @throws {Error} with a readable message for invalid input, or when the words do not fit
 */
export function generatePuzzle({ words, lang, size, directions, rng }) {
  validateInput({ words, lang, size, directions });
  const context = createContext(words, size, directions);
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    const puzzle = attemptPuzzle(context, lang, rng);
    if (puzzle) return puzzle;
  }
  throw new Error(
    `Could not fit ${words.length} words into a ${size}x${size} grid after ${MAX_ATTEMPTS} attempts; ` +
      'use fewer or shorter words, a bigger grid or more directions.',
  );
}

function validateInput({ words, lang, size, directions }) {
  if (!LANGUAGES.includes(lang)) {
    throw new Error(`Unknown language "${lang}"; expected one of ${LANGUAGES.join(', ')}.`);
  }
  if (!Number.isInteger(size) || size < MIN_SIZE || size > MAX_SIZE) {
    throw new RangeError(`Grid size must be an integer from ${MIN_SIZE} to ${MAX_SIZE}, got ${size}.`);
  }
  if (!Array.isArray(directions) || directions.length === 0
    || !directions.every((name) => Object.hasOwn(DIRECTIONS, name))) {
    throw new Error(`Directions must be a non-empty list of ${DIRECTION_NAMES.join(', ')}.`);
  }
  if (!Array.isArray(words) || words.length === 0) throw new Error('At least one word is required.');
  words.forEach((word, index) => validateWord(word, lang, size, words.slice(0, index)));
}

function validateWord(word, lang, size, earlierWords) {
  if (typeof word !== 'string' || word.length < 2 || word.length > size) {
    throw new RangeError(`"${word}" must have 2 to ${size} letters to fit a ${size}x${size} grid.`);
  }
  if (!isInAlphabet(word, lang)) {
    throw new Error(`"${word}" has characters outside the uppercase ${lang} alphabet.`);
  }
  if (isPalindrome(word)) throw new Error(`"${word}" reads the same backwards, so it would appear twice.`);
  const clash = earlierWords.find((other) => wordsClash(word, other));
  if (clash !== undefined) {
    throw new Error(`"${clash}" and "${word}" cannot share a puzzle: one contains the other or its reverse.`);
  }
}

function reverse(word) {
  return [...word].reverse().join('');
}

function isPalindrome(word) {
  return word === reverse(word);
}

/** True when the words are equal or one contains the other, read forwards or backwards. */
function wordsClash(a, b) {
  const [shorter, longer] = a.length <= b.length ? [a, b] : [b, a];
  return longer.includes(shorter) || longer.includes(reverse(shorter));
}

function createContext(words, size, directions) {
  const byLetter = new Map();
  words.forEach((word) => {
    [...word].forEach((letter, offset) => {
      const entries = byLetter.get(letter) ?? [];
      entries.push({ word, offset });
      byLetter.set(letter, entries);
    });
  });
  return {
    size,
    directions,
    // Longest words first: they have the fewest spots left once the grid fills up.
    words: [...words].sort((a, b) => b.length - a.length),
    byLetter,
    spotsByLength: new Map(),
  };
}

function attemptPuzzle(context, lang, rng) {
  const search = {
    ...context,
    rng,
    cells: new Array(context.size * context.size).fill(''),
    placements: [],
    trialsLeft: TRIALS_PER_ATTEMPT,
  };
  if (!placeWords(search, 0) || !fillEmptyCells(search, lang)) return null;
  const { size, cells, placements } = search;
  const grid = Array.from({ length: size }, (_, row) => cells.slice(row * size, (row + 1) * size));
  return { size, grid, placements };
}

/** Depth-first placement of words[wordIndex..] in random spot order, within a trial budget. */
function placeWords(search, wordIndex) {
  if (wordIndex === search.words.length) return true;
  const word = search.words[wordIndex];
  const pool = spotsFor(search, word.length);
  for (let left = pool.length; left > 0 && search.trialsLeft > 0; left -= 1) {
    search.trialsLeft -= 1;
    const spot = decodeSpot(takeRandom(pool, left, search.rng), search.size);
    if (tryPlace(search, word, spot, wordIndex)) return true;
  }
  return false;
}

function tryPlace(search, word, spot, wordIndex) {
  const written = writeWord(search, word, spot);
  if (written === null) return false;
  const own = { word, ...spot };
  if (!written.some((index) => completesWord(search, index, own))) {
    search.placements.push(toPlacement(word, spot));
    if (placeWords(search, wordIndex + 1)) return true;
    search.placements.pop();
  }
  written.forEach((index) => {
    search.cells[index] = '';
  });
  return false;
}

/**
 * Writes `word` at `spot` when every cell is empty or already holds the same letter.
 * @returns {number[] | null} indices of the newly filled cells, or null when a letter conflicts
 */
function writeWord(search, word, { row, col, step }) {
  const { cells, size } = search;
  const indices = [...word].map((_, i) => (row + step.dr * i) * size + col + step.dc * i);
  if (indices.some((index, i) => cells[index] !== '' && cells[index] !== word[i])) return null;
  const written = indices.filter((index) => cells[index] === '');
  indices.forEach((index, i) => {
    cells[index] = word[i];
  });
  return written;
}

/**
 * True when the letter at `index` completes a copy of any word in any direction, other than
 * `own` (the placement being made, if any).
 */
function completesWord(search, index, own) {
  const row = Math.floor(index / search.size);
  const col = index % search.size;
  const entries = search.byLetter.get(search.cells[index]) ?? [];
  return entries.some(({ word, offset }) => ALL_STEPS.some((step) => {
    const startRow = row - step.dr * offset;
    const startCol = col - step.dc * offset;
    const isOwn = own !== null && own.word === word && own.row === startRow && own.col === startCol
      && own.step === step;
    return !isOwn && wordAt(search, word, startRow, startCol, step);
  }));
}

function wordAt(search, word, row, col, step) {
  const { cells, size } = search;
  const last = word.length - 1;
  if (!inGrid(row, size) || !inGrid(col, size)
    || !inGrid(row + step.dr * last, size) || !inGrid(col + step.dc * last, size)) {
    return false;
  }
  for (let i = 0; i <= last; i += 1) {
    if (cells[(row + step.dr * i) * size + col + step.dc * i] !== word[i]) return false;
  }
  return true;
}

function inGrid(value, size) {
  return value >= 0 && value < size;
}

function fillEmptyCells(search, lang) {
  const letters = ALPHABETS[lang];
  const weights = letters.map((letter) => LETTER_FREQUENCIES[lang][letter]);
  for (let index = 0; index < search.cells.length; index += 1) {
    if (search.cells[index] === '' && !fillCell(search, index, letters, weights)) return false;
  }
  return true;
}

/** Draws weighted filler letters until one completes no word; false if every letter would. */
function fillCell(search, index, letters, weights) {
  const options = [...letters];
  const optionWeights = [...weights];
  while (options.length > 0) {
    const pick = search.rng.weightedIndex(optionWeights);
    search.cells[index] = options[pick];
    if (!completesWord(search, index, null)) return true;
    options.splice(pick, 1);
    optionWeights.splice(pick, 1);
  }
  return false;
}

/** Fresh copy of every spot where a word of `length` fits (cached per length). */
function spotsFor(search, length) {
  const { size, directions, spotsByLength } = search;
  if (!spotsByLength.has(length)) spotsByLength.set(length, listSpots(size, directions, length));
  return [...spotsByLength.get(length)];
}

/** Start cells and directions that keep a word of `length` inside the grid, encoded as integers. */
function listSpots(size, directions, length) {
  const spots = [];
  directions.forEach((name) => {
    const { dr, dc } = DIRECTIONS[name];
    const directionIndex = DIRECTION_NAMES.indexOf(name);
    for (let row = 0; row < size; row += 1) {
      for (let col = 0; col < size; col += 1) {
        if (inGrid(row + dr * (length - 1), size) && inGrid(col + dc * (length - 1), size)) {
          spots.push((row * size + col) * DIRECTION_NAMES.length + directionIndex);
        }
      }
    }
  });
  return spots;
}

function decodeSpot(code, size) {
  const direction = DIRECTION_NAMES[code % DIRECTION_NAMES.length];
  const index = Math.floor(code / DIRECTION_NAMES.length);
  return { row: Math.floor(index / size), col: index % size, direction, step: DIRECTIONS[direction] };
}

/** Removes a random entry from the first `count` entries of `pool` and returns it. */
function takeRandom(pool, count, rng) {
  const pick = rng.int(count);
  const value = pool[pick];
  pool[pick] = pool[count - 1];
  return value;
}

function toPlacement(word, { row, col, direction, step }) {
  const last = word.length - 1;
  return {
    word,
    direction,
    start: { row, col },
    end: { row: row + step.dr * last, col: col + step.dc * last },
  };
}
