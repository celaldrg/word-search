import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, buildPuzzle } from '../src/game.js';
import { DIRECTIONS, MAX_SIZE, MIN_SIZE, generatePuzzle, pickWords } from '../src/generator.js';
import { createRng } from '../src/rng.js';
import { ALPHABETS, LANGUAGES, LETTER_FREQUENCIES } from '../src/text.js';
import { listCategories } from '../src/words.js';

const SEEDS = 200;
const SIZES = Array.from({ length: MAX_SIZE - MIN_SIZE + 1 }, (_, i) => MIN_SIZE + i);
const CATEGORY_IDS = listCategories('en').map(({ id }) => id);
const ALPHABET_SETS = new Map(LANGUAGES.map((lang) => [lang, new Set(ALPHABETS[lang])]));
const puzzleCache = new Map();
const lineCache = new Map();

/**
 * Seeds 1..200 cycle through every category. The grid has the difficulty's own size, the one
 * the game plays, unless `allSizes` is set: then the seeds cycle through every size from 10 to 15.
 */
function setupFor(lang, difficulty, seed, allSizes) {
  return {
    lang,
    difficulty,
    seed,
    size: allSizes ? SIZES[seed % SIZES.length] : DIFFICULTIES[difficulty].size,
    categoryId: CATEGORY_IDS[seed % CATEGORY_IDS.length],
  };
}

/** The 200 puzzles of one language and difficulty (built once, shared by the tests below). */
function puzzlesFor(lang, difficulty, allSizes = false) {
  const key = `${lang}/${difficulty}/${allSizes ? 'all sizes' : 'own size'}`;
  if (!puzzleCache.has(key)) {
    const setups = Array.from({ length: SEEDS }, (_, i) => setupFor(lang, difficulty, i + 1, allSizes));
    puzzleCache.set(key, setups.map((setup) => ({ setup, puzzle: buildPuzzle(setup) })));
  }
  return puzzleCache.get(key);
}

/**
 * Every straight line of a size x size grid (rows, columns, both diagonals) as cell lists.
 * Written independently of the generator so the check shares none of its code.
 */
function gridLines(size) {
  if (!lineCache.has(size)) {
    const cells = (make) => Array.from({ length: size }, (_, i) => make(i));
    const inside = ({ row, col }) => row >= 0 && row < size && col >= 0 && col < size;
    const lines = [];
    for (let i = 0; i < size; i += 1) {
      lines.push(cells((j) => ({ row: i, col: j })), cells((j) => ({ row: j, col: i })));
    }
    for (let k = 1 - size; k < size; k += 1) {
      lines.push(cells((r) => ({ row: r, col: r + k })).filter(inside));
      lines.push(cells((r) => ({ row: r, col: size - 1 - r + k })).filter(inside));
    }
    lineCache.set(size, lines);
  }
  return lineCache.get(size);
}

/** Every line of the grid read forwards and backwards: 8 directions in total. */
function readings(grid) {
  return gridLines(grid.length)
    .flatMap((line) => [line, [...line].reverse()])
    .map((cells) => ({ cells, text: cells.map(({ row, col }) => grid[row][col]).join('') }));
}

/** Every place where `word` can be read along a straight line, overlapping hits included. */
function occurrences(lines, word) {
  const hits = [];
  for (const { cells, text } of lines) {
    for (let at = text.indexOf(word); at !== -1; at = text.indexOf(word, at + 1)) {
      hits.push({ start: cells[at], end: cells[at + word.length - 1] });
    }
  }
  return hits;
}

function placementCells({ word, start, direction }) {
  const { dr, dc } = DIRECTIONS[direction];
  return [...word].map((letter, i) => ({ letter, row: start.row + dr * i, col: start.col + dc * i }));
}

function checkPuzzle(puzzle, setup) {
  const { lang, difficulty, size, seed } = setup;
  const label = `${lang}/${difficulty}/${size}x${size}/seed ${seed}`;
  assert.equal(puzzle.grid.length, size, label);
  for (const row of puzzle.grid) {
    assert.equal(row.length, size, label);
    for (const letter of row) assert.ok(ALPHABET_SETS.get(lang).has(letter), `${label}: "${letter}"`);
  }
  assert.equal(puzzle.words.length, size - 2, label);
  assert.deepEqual(puzzle.placements.map(({ word }) => word).sort(), [...puzzle.words].sort(), label);
  const lines = readings(puzzle.grid);
  for (const placement of puzzle.placements) {
    const { word, direction, start, end } = placement;
    assert.ok(DIFFICULTIES[difficulty].directions.includes(direction), `${label}: ${word} goes ${direction}`);
    assert.deepEqual(occurrences(lines, word), [{ start, end }], `${label}: ${word} must appear exactly once`);
  }
}

test('the independent occurrence check reads words in all 8 directions', () => {
  for (const { dr, dc } of Object.values(DIRECTIONS)) {
    const grid = Array.from({ length: 10 }, () => Array(10).fill('.'));
    [...'CAT'].forEach((letter, i) => {
      grid[4 + dr * i][4 + dc * i] = letter;
    });
    const expected = [{ start: { row: 4, col: 4 }, end: { row: 4 + 2 * dr, col: 4 + 2 * dc } }];
    assert.deepEqual(occurrences(readings(grid), 'CAT'), expected, `direction ${dr},${dc}`);
  }
});

for (const lang of LANGUAGES) {
  for (const [difficulty, { size }] of Object.entries(DIFFICULTIES)) {
    test(`DONE ${lang}/${difficulty} ${size}x${size}: ${SEEDS} seeds, each word exactly once on a straight line, no extra copy`, () => {
      const puzzles = puzzlesFor(lang, difficulty);
      assert.equal(puzzles.length, SEEDS);
      for (const { setup, puzzle } of puzzles) {
        assert.equal(setup.size, size);
        checkPuzzle(puzzle, setup);
      }
    });
  }
}

test(`every grid size from ${MIN_SIZE} to ${MAX_SIZE} works in every language and difficulty`, () => {
  for (const lang of LANGUAGES) {
    for (const difficulty of Object.keys(DIFFICULTIES)) {
      const puzzles = puzzlesFor(lang, difficulty, true);
      assert.deepEqual([...new Set(puzzles.map(({ setup }) => setup.size))].sort((a, b) => a - b), SIZES);
      for (const { setup, puzzle } of puzzles) checkPuzzle(puzzle, setup);
    }
  }
});

test('every difficulty keeps to its directions; hard uses all 8', () => {
  for (const difficulty of Object.keys(DIFFICULTIES)) {
    const used = new Set(LANGUAGES.flatMap((lang) => puzzlesFor(lang, difficulty))
      .flatMap(({ puzzle }) => puzzle.placements.map(({ direction }) => direction)));
    assert.deepEqual([...used].sort(), [...DIFFICULTIES[difficulty].directions].sort(), difficulty);
  }
  assert.equal(DIFFICULTIES.hard.directions.length, 8);
  assert.ok(DIFFICULTIES.easy.directions.length < DIFFICULTIES.medium.directions.length);
});

test('words cross only on equal letters, and crossings do happen', () => {
  let crossings = 0;
  for (const lang of LANGUAGES) {
    for (const { puzzle } of puzzlesFor(lang, 'hard')) {
      const letters = new Map();
      for (const { letter, row, col } of puzzle.placements.flatMap(placementCells)) {
        const key = `${row},${col}`;
        if (letters.has(key)) {
          assert.equal(letters.get(key), letter, `seed ${puzzle.seed} cell ${key}`);
          crossings += 1;
        }
        letters.set(key, letter);
        assert.equal(puzzle.grid[row][col], letter);
      }
    }
  }
  assert.ok(crossings > 0, 'expected some words to share a letter');
});

test('filler letters come from the alphabet, weighted by letter frequency', () => {
  for (const lang of LANGUAGES) {
    const counts = new Map();
    for (const difficulty of Object.keys(DIFFICULTIES)) {
      for (const { puzzle } of puzzlesFor(lang, difficulty)) {
        const used = new Set(puzzle.placements.flatMap(placementCells).map(({ row, col }) => `${row},${col}`));
        puzzle.grid.forEach((letters, row) => letters.forEach((letter, col) => {
          if (!used.has(`${row},${col}`)) counts.set(letter, (counts.get(letter) ?? 0) + 1);
        }));
      }
    }
    for (const letter of counts.keys()) assert.ok(ALPHABET_SETS.get(lang).has(letter), `${lang}: ${letter}`);
    const share = (letter) => (counts.get(letter) ?? 0) / Math.max(...counts.values());
    const [common, rare] = lang === 'en' ? ['E', 'Z'] : ['A', 'J'];
    assert.ok(LETTER_FREQUENCIES[lang][common] > LETTER_FREQUENCIES[lang][rare] * 20);
    assert.equal(share(common), 1, `${lang}: ${common} should be the most common filler letter`);
    assert.ok(share(rare) < 0.05, `${lang}: ${rare} should be rare`);
  }
});

test('the same seed rebuilds the same puzzle; another seed gives another one', () => {
  const make = (seed) => generatePuzzle({
    words: ['APPLE', 'MANGO', 'PEACH', 'LEMON', 'CHERRY', 'GRAPE', 'MELON', 'KIWI'],
    lang: 'en',
    size: 10,
    directions: ['E', 'S', 'SE', 'NE'],
    rng: createRng(seed),
  });
  assert.deepEqual(make(99), make(99));
  assert.notDeepEqual(make(99).grid, make(100).grid);
});

test('pickWords skips palindromes and words hidden in other words (forwards or backwards)', () => {
  const words = ['LEVEL', 'STAR', 'RATS', 'CAT', 'CATALOG', 'DOG', 'BIRD', 'RAT'];
  for (let seed = 1; seed <= 50; seed += 1) {
    const picked = pickWords(words, 10, createRng(seed));
    assert.ok(!picked.includes('LEVEL'));
    assert.ok(!(picked.includes('STAR') && picked.includes('RATS')));
    assert.ok(!(picked.includes('CAT') && picked.includes('CATALOG')));
    assert.ok(!(picked.includes('RAT') && (picked.includes('STAR') || picked.includes('RATS'))));
    assert.ok(picked.includes('DOG') && picked.includes('BIRD'));
  }
  assert.deepEqual(pickWords(words, 3, createRng(5)), pickWords(words, 3, createRng(5)));
  assert.equal(pickWords(words, 3, createRng(5)).length, 3);
});

test('invalid input is reported with a clear error', () => {
  const base = { words: ['APPLE', 'MANGO'], lang: 'en', size: 10, directions: ['E'], rng: createRng(1) };
  const cases = [
    [{ size: 9 }, /Grid size must be an integer from 10 to 15, got 9/],
    [{ size: 16 }, /Grid size must be an integer from 10 to 15, got 16/],
    [{ lang: 'de' }, /Unknown language "de"/],
    [{ directions: ['UP'] }, /Directions must be a non-empty list/],
    [{ directions: [] }, /Directions must be a non-empty list/],
    [{ words: [] }, /At least one word is required/],
    [{ words: ['ABCDEFGHIJK'] }, /must have 2 to 10 letters/],
    [{ words: ['apple'] }, /outside the uppercase en alphabet/],
    [{ words: ['QUIZ'], lang: 'tr' }, /outside the uppercase tr alphabet/],
    [{ words: ['KAYAK'] }, /reads the same backwards/],
    [{ words: ['STAR', 'RATS'] }, /"STAR" and "RATS" cannot share a puzzle/],
    [{ words: ['CAT', 'CATALOG'] }, /"CAT" and "CATALOG" cannot share a puzzle/],
  ];
  for (const [change, message] of cases) {
    assert.throws(() => generatePuzzle({ ...base, ...change }), message);
  }
});

test('words that cannot fit are reported clearly instead of looping', () => {
  // Twelve 10-letter words but only ten rows on a 10x10 grid with left-to-right placement.
  const alphabet = ALPHABETS.en.join('');
  const words = Array.from({ length: 12 }, (_, i) => alphabet.slice(i, i + 10));
  assert.throws(
    () => generatePuzzle({ words, lang: 'en', size: 10, directions: ['E'], rng: createRng(3) }),
    /Could not fit 12 words into a 10x10 grid after \d+ attempts/,
  );
});
