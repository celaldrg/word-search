/**
 * One round of word search: puzzle setup, found words, timer, hints and the pointer/keyboard
 * selection. Pure module: the UI calls the methods and renders getState().
 */
import { DIRECTIONS, MAX_SIZE, MIN_SIZE, generatePuzzle, pickWords } from './generator.js';
import { createRng, randomSeed } from './rng.js';
import { lineCells, matchPlacement, snapToLine } from './selection.js';
import { LANGUAGES, compareWords } from './text.js';
import { getCategory, listCategories } from './words.js';

/** @typedef {import('./selection.js').Cell} Cell */
/** @typedef {import('./generator.js').Placement} Placement */

/**
 * @typedef {object} PuzzleSetup
 * @property {'en'|'tr'} [lang] Word-list language (default 'en').
 * @property {string} [categoryId] Id from listCategories (default: the first category).
 * @property {'easy'|'medium'|'hard'} [difficulty] Default 'medium'.
 * @property {number} [size] Grid side 10-15 (default: the difficulty's size).
 * @property {number} [seed] Unsigned 32-bit seed (default: random).
 */

/**
 * @typedef {object} Puzzle
 * @property {'en'|'tr'} lang
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} size
 * @property {number} seed
 * @property {string} categoryId
 * @property {readonly string[]} words Hidden words in dictionary order.
 * @property {readonly (readonly string[])[]} grid grid[row][col] holds one letter.
 * @property {readonly Placement[]} placements Where each word is.
 */

/**
 * @typedef {object} SelectResult
 * @property {'found'|'repeat'|'miss'|'invalid'} status found: a new word; repeat: a word found
 *   before; miss: a straight line that is no word; invalid: not a straight line of 2+ cells
 *   inside the grid, or the round is already won.
 * @property {string} [word] For found and repeat.
 * @property {number} [colorIndex] For found: 0 for the first word found, 1 for the next, ...
 * @property {Cell[]} [cells] The selected line (all statuses except invalid).
 */

/**
 * @typedef {object} GameState
 * @property {'en'|'tr'} lang
 * @property {string} categoryId
 * @property {'easy'|'medium'|'hard'} difficulty
 * @property {number} size
 * @property {number} seed The same setup and seed rebuild the same puzzle (Restart).
 * @property {readonly (readonly string[])[]} grid grid[row][col]
 * @property {{ word: string, found: boolean, colorIndex: number | null }[]} words Dictionary order.
 * @property {{ word: string, start: Cell, end: Cell, colorIndex: number }[]} found Order found.
 * @property {{ anchor: Cell, head: Cell, cells: Cell[] } | null} selection Live selection line.
 * @property {Cell} cursor Keyboard cursor.
 * @property {number} elapsedMs
 * @property {number} hintsUsed Shown when the round is won.
 * @property {number} foundCount
 * @property {number} totalWords
 * @property {'playing'|'won'} status
 */

/** Difficulty presets: allowed placement directions and default grid size. */
export const DIFFICULTIES = Object.freeze({
  easy: Object.freeze({ size: 10, directions: Object.freeze(['E', 'S']) }),
  medium: Object.freeze({ size: 12, directions: Object.freeze(['E', 'S', 'SE', 'NE']) }),
  hard: Object.freeze({ size: 15, directions: Object.freeze(Object.keys(DIRECTIONS)) }),
});

const DEFAULT_DIFFICULTY = 'medium';
// Seed 69: the found words cover all 4 line orientations and all 4 quadrants without touching.
const DEMO_SETUP = Object.freeze({ lang: 'tr', categoryId: 'fruits', difficulty: 'hard', seed: 69 });
const DEMO_ELAPSED_MS = 94_000;
/** Letters of the first unfound word that the demo's drag in progress already covers. */
const DEMO_DRAG_LETTERS = 5;

/**
 * Builds the puzzle for a setup; missing or invalid values fall back to the defaults.
 * The same setup with the same seed always gives the same puzzle.
 * @param {PuzzleSetup} [setup]
 * @returns {Readonly<Puzzle>} deeply frozen
 */
export function buildPuzzle(setup = {}) {
  const { lang, difficulty, category, size, seed } = normalizeSetup(setup);
  const rng = createRng(seed);
  const words = pickWords(category.words, wordCountFor(size), rng);
  const { grid, placements } = generatePuzzle({
    words,
    lang,
    size,
    directions: DIFFICULTIES[difficulty].directions,
    rng,
  });
  return deepFreeze({
    lang,
    difficulty,
    size,
    seed,
    categoryId: category.id,
    words: [...words].sort((a, b) => compareWords(a, b, lang)),
    grid,
    placements,
  });
}

/**
 * Starts a new round.
 * @param {PuzzleSetup} [setup]
 * @returns {WordSearchGame}
 */
export function createGame(setup) {
  return new WordSearchGame(buildPuzzle(setup));
}

/**
 * The deterministic ?demo round for the README screenshot: a Turkish puzzle with every other
 * word of the list (half of them) already found, a drag in progress over the first letters of
 * an unfound word and the timer part-way through.
 * @returns {WordSearchGame}
 */
export function createDemoGame() {
  const puzzle = buildPuzzle(DEMO_SETUP);
  const game = new WordSearchGame(puzzle);
  const found = puzzle.words.filter((_, index) => index % 2 === 1);
  found.forEach((word) => {
    const { start, end } = puzzle.placements.find((placement) => placement.word === word);
    game.select(start, end);
  });
  const dragged = puzzle.placements.find(({ word }) => !found.includes(word));
  const cells = lineCells(dragged.start, dragged.end);
  game.beginSelection(cells[0]);
  game.updateSelection(cells[Math.min(DEMO_DRAG_LETTERS, cells.length) - 1]);
  game.update(DEMO_ELAPSED_MS);
  return game;
}

function normalizeSetup(setup) {
  const lang = LANGUAGES.includes(setup.lang) ? setup.lang : LANGUAGES[0];
  const difficulty = Object.hasOwn(DIFFICULTIES, setup.difficulty) ? setup.difficulty : DEFAULT_DIFFICULTY;
  const category = getCategory(lang, setup.categoryId) ?? getCategory(lang, listCategories(lang)[0].id);
  const size = Number.isInteger(setup.size)
    ? Math.min(MAX_SIZE, Math.max(MIN_SIZE, setup.size))
    : DIFFICULTIES[difficulty].size;
  const seed = Number.isInteger(setup.seed) ? setup.seed >>> 0 : randomSeed();
  return { lang, difficulty, category, size, seed };
}

/** A 10x10 grid hides 8 words, a 15x15 grid 13. */
function wordCountFor(size) {
  return size - 2;
}

function deepFreeze(value) {
  if (typeof value === 'object' && value !== null) {
    Object.values(value).forEach(deepFreeze);
    Object.freeze(value);
  }
  return value;
}

function cellOf(row, col) {
  return Object.freeze({ row, col });
}

class WordSearchGame {
  #puzzle;
  #found = [];
  #elapsedMs = 0;
  #hintsUsed = 0;
  #lastHintIndex = -1;
  #cursor = cellOf(0, 0);
  #anchor = null;
  #head = null;

  /** @param {Readonly<Puzzle>} puzzle */
  constructor(puzzle) {
    this.#puzzle = puzzle;
  }

  /**
   * Snapshot of everything the UI renders; changing it does not change the game.
   * @returns {GameState}
   */
  getState() {
    const puzzle = this.#puzzle;
    return {
      lang: puzzle.lang,
      categoryId: puzzle.categoryId,
      difficulty: puzzle.difficulty,
      size: puzzle.size,
      seed: puzzle.seed,
      grid: puzzle.grid,
      words: puzzle.words.map((word) => {
        const entry = this.#foundEntry(word);
        return { word, found: entry !== undefined, colorIndex: entry ? entry.colorIndex : null };
      }),
      found: [...this.#found],
      selection: this.#anchor && {
        anchor: this.#anchor,
        head: this.#head,
        cells: lineCells(this.#anchor, this.#head),
      },
      cursor: this.#cursor,
      elapsedMs: this.#elapsedMs,
      hintsUsed: this.#hintsUsed,
      foundCount: this.#found.length,
      totalWords: puzzle.words.length,
      status: this.#isWon() ? 'won' : 'playing',
    };
  }

  /**
   * Time played so far, without building a whole getState() snapshot (read on every frame).
   * @returns {number}
   */
  get elapsedMs() {
    return this.#elapsedMs;
  }

  /**
   * Grid side in cells, without building a whole getState() snapshot (read on pointer moves).
   * @returns {number}
   */
  get size() {
    return this.#puzzle.size;
  }

  /**
   * Advances the timer while the round is being played. The UI should not pass on time during
   * which the page was hidden.
   * @param {number} dtMs Milliseconds since the previous update.
   */
  update(dtMs) {
    if (!this.#isWon() && Number.isFinite(dtMs) && dtMs > 0) this.#elapsedMs += dtMs;
  }

  /**
   * Checks the line between two cells, in either direction, against the hidden words.
   * @param {Cell} from
   * @param {Cell} to
   * @returns {SelectResult}
   */
  select(from, to) {
    const a = this.#cellInGrid(from);
    const b = this.#cellInGrid(to);
    const cells = a && b && !this.#isWon() ? lineCells(a, b) : null;
    if (!cells || cells.length < 2) return { status: 'invalid' };
    const placement = matchPlacement(this.#puzzle.placements, a, b);
    if (!placement) return { status: 'miss', cells };
    if (this.#foundEntry(placement.word)) return { status: 'repeat', word: placement.word, cells };
    const entry = Object.freeze({
      word: placement.word,
      start: placement.start,
      end: placement.end,
      colorIndex: this.#found.length,
    });
    this.#found.push(entry);
    return { status: 'found', word: entry.word, colorIndex: entry.colorIndex, cells };
  }

  /**
   * Starts a selection (pointer down). Positions outside the grid are clamped to its edge.
   * Ignored once the round is won.
   * @param {Cell} cell
   */
  beginSelection(cell) {
    const start = this.#clampCell(cell);
    if (!start || this.#isWon()) return;
    this.#anchor = start;
    this.#head = start;
    this.#cursor = start;
  }

  /**
   * Moves the end of the active selection towards a cell (pointer move). The end snaps to the
   * nearest straight line, so the live highlight is always a valid line.
   * @param {Cell} cell
   */
  updateSelection(cell) {
    const target = this.#clampCell(cell);
    if (!this.#anchor || !target) return;
    this.#head = Object.freeze(snapToLine(this.#anchor, target, this.#puzzle.size));
  }

  /**
   * Ends the active selection (pointer up) and checks it.
   * @returns {SelectResult | null} null when no selection was active
   */
  endSelection() {
    if (!this.#anchor) return null;
    const result = this.select(this.#anchor, this.#head);
    this.cancelSelection();
    return result;
  }

  /** Drops the active selection without checking it (Escape, pointer cancel). */
  cancelSelection() {
    this.#anchor = null;
    this.#head = null;
  }

  /**
   * Moves the keyboard cursor by whole cells (arrow keys) without leaving the grid; an active
   * selection follows the cursor.
   * @param {number} dRow
   * @param {number} dCol
   */
  moveCursor(dRow, dCol) {
    const { row, col } = this.#cursor;
    this.#cursor = this.#clampCell({ row: row + dRow, col: col + dCol }) ?? this.#cursor;
    this.updateSelection(this.#cursor);
  }

  /**
   * Keyboard Enter: starts a selection at the cursor, or ends and checks the active one.
   * @returns {SelectResult | null} null when a selection was started
   */
  toggleSelection() {
    if (this.#anchor) return this.endSelection();
    this.beginSelection(this.#cursor);
    return null;
  }

  /**
   * Hint: the next unfound word (rotating through the list) and the cell of its first letter.
   * @returns {{ word: string, cell: Cell } | null} null when every word is found
   */
  hint() {
    const { words, placements } = this.#puzzle;
    const index = words
      .map((_, step) => (this.#lastHintIndex + 1 + step) % words.length)
      .find((candidate) => !this.#foundEntry(words[candidate]));
    if (index === undefined) return null;
    this.#lastHintIndex = index;
    this.#hintsUsed += 1;
    const placement = placements.find((entry) => entry.word === words[index]);
    return { word: placement.word, cell: placement.start };
  }

  #isWon() {
    return this.#found.length === this.#puzzle.words.length;
  }

  #foundEntry(word) {
    return this.#found.find((entry) => entry.word === word);
  }

  #clampCell(cell) {
    if (!cell || !Number.isFinite(cell.row) || !Number.isFinite(cell.col)) return null;
    const last = this.#puzzle.size - 1;
    const clamp = (value) => Math.min(last, Math.max(0, Math.round(value)));
    return cellOf(clamp(cell.row), clamp(cell.col));
  }

  #cellInGrid(cell) {
    const { size } = this.#puzzle;
    const inside = Boolean(cell) && Number.isInteger(cell.row) && Number.isInteger(cell.col)
      && cell.row >= 0 && cell.row < size && cell.col >= 0 && cell.col < size;
    return inside ? cellOf(cell.row, cell.col) : null;
  }
}
