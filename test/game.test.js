import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DIFFICULTIES, buildPuzzle, createDemoGame, createGame } from '../src/game.js';
import { lineCells } from '../src/selection.js';
import { getCategory } from '../src/words.js';

const SETUP = Object.freeze({ lang: 'en', categoryId: 'animals', difficulty: 'hard', seed: 12345 });

function newRound(setup = SETUP) {
  return { puzzle: buildPuzzle(setup), game: createGame(setup) };
}

function placementOf(puzzle, word) {
  return puzzle.placements.find((placement) => placement.word === word);
}

test('the same setup and seed rebuild the same puzzle', () => {
  const { puzzle, game } = newRound();
  assert.deepEqual(buildPuzzle(SETUP), puzzle);
  assert.deepEqual(game.getState().grid, puzzle.grid);
  assert.notDeepEqual(buildPuzzle({ ...SETUP, seed: 54321 }).grid, puzzle.grid);
});

test('a new round starts playing with nothing found', () => {
  const state = createGame(SETUP).getState();
  assert.equal(state.status, 'playing');
  assert.equal(state.size, DIFFICULTIES.hard.size);
  assert.equal(state.totalWords, state.size - 2);
  assert.equal(state.foundCount, 0);
  assert.equal(state.elapsedMs, 0);
  assert.equal(state.hintsUsed, 0);
  assert.deepEqual([state.lang, state.categoryId, state.difficulty], ['en', 'animals', 'hard']);
  assert.equal(state.selection, null);
  assert.deepEqual(state.cursor, { row: 0, col: 0 });
  assert.ok(state.words.every(({ found, colorIndex }) => !found && colorIndex === null));
});

test('missing or invalid setup values fall back to defaults', () => {
  const defaults = createGame().getState();
  assert.equal(defaults.lang, 'en');
  assert.equal(defaults.difficulty, 'medium');
  assert.equal(defaults.size, DIFFICULTIES.medium.size);
  assert.equal(defaults.categoryId, 'animals');
  assert.ok(Number.isInteger(defaults.seed) && defaults.seed >= 0 && defaults.seed < 2 ** 32);

  const odd = createGame({ lang: 'xx', categoryId: 'nope', difficulty: 'impossible', size: 99, seed: 5 }).getState();
  assert.deepEqual(
    [odd.lang, odd.categoryId, odd.difficulty, odd.size, odd.seed],
    ['en', 'animals', 'medium', 15, 5],
  );
  assert.equal(createGame({ size: 3, seed: 5 }).getState().size, 10);
  const fruits = createGame({ lang: 'tr', categoryId: 'fruits', seed: 5 }).getState();
  assert.deepEqual([fruits.lang, fruits.categoryId], ['tr', 'fruits']);
  const turkishFruits = getCategory('tr', 'fruits').words;
  assert.ok(fruits.words.every(({ word }) => turkishFruits.includes(word)));
});

test('a forward selection finds a word; selecting it again is a repeat', () => {
  const { puzzle, game } = newRound();
  const { word, start, end } = puzzle.placements[0];
  const found = game.select(start, end);
  assert.equal(found.status, 'found');
  assert.equal(found.word, word);
  assert.equal(found.colorIndex, 0);
  assert.equal(found.cells.length, word.length);
  assert.equal(found.cells.map(({ row, col }) => puzzle.grid[row][col]).join(''), word);
  assert.equal(game.select(start, end).status, 'repeat');
  assert.equal(game.getState().foundCount, 1);
});

test('a reversed selection finds the word', () => {
  const { puzzle, game } = newRound();
  for (const { word, start, end } of puzzle.placements) {
    const result = game.select(end, start);
    assert.equal(result.status, 'found');
    assert.equal(result.word, word);
  }
});

test('only straight-line selections are accepted', () => {
  const { puzzle, game } = newRound();
  const { start, end } = puzzle.placements[0];
  assert.equal(game.select({ row: 0, col: 0 }, { row: 1, col: 2 }).status, 'invalid');
  assert.equal(game.select({ row: 2, col: 1 }, { row: 7, col: 3 }).status, 'invalid');
  assert.equal(game.select(start, start).status, 'invalid');
  assert.equal(game.select({ row: -1, col: 0 }, { row: 0, col: 3 }).status, 'invalid');
  assert.equal(game.select({ row: 0.5, col: 0 }, { row: 0, col: 3 }).status, 'invalid');
  assert.equal(game.select(null, end).status, 'invalid');
  const shortLine = lineCells(start, end).slice(0, -1);
  const miss = game.select(start, shortLine.at(-1));
  assert.equal(miss.status, 'miss');
  assert.deepEqual(miss.cells, shortLine);
  assert.equal(game.getState().foundCount, 0);
});

test('finding every word wins the round and freezes timer and input', () => {
  const { puzzle, game } = newRound();
  puzzle.placements.forEach(({ start, end }, index) => {
    assert.equal(game.getState().status, 'playing');
    assert.equal(game.select(start, end).colorIndex, index);
  });
  const won = game.getState();
  assert.equal(won.status, 'won');
  assert.equal(won.foundCount, won.totalWords);
  assert.ok(won.words.every(({ found }) => found));
  assert.deepEqual(won.found.map(({ colorIndex }) => colorIndex), puzzle.placements.map((_, i) => i));
  game.update(5000);
  assert.equal(game.getState().elapsedMs, 0);
  assert.equal(game.select(puzzle.placements[0].start, puzzle.placements[0].end).status, 'invalid');
  assert.equal(game.hint(), null);
  game.beginSelection({ row: 0, col: 0 });
  assert.equal(game.getState().selection, null);
});

test('the timer adds update() time while playing and ignores bad values', () => {
  const game = createGame(SETUP);
  game.update(1000);
  game.update(250);
  for (const bad of [-5, 0, Number.NaN, Number.POSITIVE_INFINITY, undefined]) game.update(bad);
  assert.equal(game.getState().elapsedMs, 1250);
});

test('the elapsedMs and size getters match getState() and are read-only', () => {
  const game = createGame(SETUP);
  assert.equal(game.elapsedMs, 0);
  assert.equal(game.size, DIFFICULTIES.hard.size);
  game.update(1000);
  game.update(250);
  assert.equal(game.elapsedMs, 1250);
  assert.equal(game.elapsedMs, game.getState().elapsedMs);
  assert.equal(createGame({ size: 11, seed: 5 }).size, 11);
  assert.throws(() => {
    game.elapsedMs = 0;
  }, TypeError);
  assert.throws(() => {
    game.size = 3;
  }, TypeError);
  assert.equal(game.elapsedMs, 1250);
  assert.equal(game.size, DIFFICULTIES.hard.size);
});

test('hint flashes the first letter of an unfound word and rotates through them', () => {
  const { puzzle, game } = newRound();
  const first = game.hint();
  assert.deepEqual(first.cell, placementOf(puzzle, first.word).start);
  assert.equal(puzzle.grid[first.cell.row][first.cell.col], first.word[0]);
  const second = game.hint();
  assert.notEqual(second.word, first.word);
  assert.equal(game.getState().hintsUsed, 2);

  const [last, ...others] = puzzle.words;
  for (const word of others) {
    const { start, end } = placementOf(puzzle, word);
    game.select(start, end);
  }
  for (let i = 0; i < 3; i += 1) assert.equal(game.hint().word, last);
  assert.equal(game.getState().hintsUsed, 5);
});

test('pointer drag: live highlight snaps to a straight line and finds the word', () => {
  const { puzzle, game } = newRound();
  const { word, start, end } = puzzle.placements[0];
  game.beginSelection(start);
  assert.deepEqual(game.getState().selection.cells, [start]);
  for (const pointer of [{ row: 3, col: 7 }, { row: 14.4, col: 0.2 }, { row: -8, col: 40 }]) {
    game.updateSelection(pointer);
    const { anchor, head, cells } = game.getState().selection;
    assert.deepEqual(anchor, start);
    assert.deepEqual(cells, lineCells(anchor, head));
  }
  game.updateSelection(end);
  const result = game.endSelection();
  assert.equal(result.status, 'found');
  assert.equal(result.word, word);
  assert.equal(game.getState().selection, null);
  assert.equal(game.endSelection(), null);
});

test('keyboard: arrows move the cursor inside the grid, Enter starts and ends a selection', () => {
  const { puzzle, game } = newRound();
  game.moveCursor(-1, -1);
  assert.deepEqual(game.getState().cursor, { row: 0, col: 0 });
  game.moveCursor(100, 100);
  assert.deepEqual(game.getState().cursor, { row: puzzle.size - 1, col: puzzle.size - 1 });

  const { word, start, end } = puzzle.placements[1];
  const { cursor } = game.getState();
  game.moveCursor(start.row - cursor.row, start.col - cursor.col);
  assert.equal(game.toggleSelection(), null);
  assert.deepEqual(game.getState().selection.anchor, start);
  game.moveCursor(end.row - start.row, end.col - start.col);
  assert.deepEqual(game.getState().selection.head, end);
  const result = game.toggleSelection();
  assert.equal(result.status, 'found');
  assert.equal(result.word, word);

  game.toggleSelection();
  game.moveCursor(0, 1);
  game.cancelSelection();
  assert.equal(game.getState().selection, null);
});

test('getState returns a snapshot that cannot change the game', () => {
  const game = createGame(SETUP);
  const state = game.getState();
  assert.ok(Object.isFrozen(state.grid) && Object.isFrozen(state.grid[0]) && Object.isFrozen(state.cursor));
  state.words[0].found = true;
  state.found.push({ word: 'X' });
  state.elapsedMs = 99;
  const fresh = game.getState();
  assert.equal(fresh.words[0].found, false);
  assert.equal(fresh.found.length, 0);
  assert.equal(fresh.elapsedMs, 0);
});

test('demo: a deterministic Turkish puzzle with half of the words found', () => {
  const state = createDemoGame().getState();
  assert.equal(state.lang, 'tr');
  assert.equal(state.status, 'playing');
  assert.equal(state.foundCount, Math.floor(state.totalWords / 2));
  assert.ok(state.elapsedMs > 0);
  assert.deepEqual(state.words.filter(({ found }) => found).map(({ word }) => word).sort(),
    state.found.map(({ word }) => word).sort());
  assert.deepEqual(createDemoGame().getState(), state);
});

test('demo: a drag is in progress over the first letters of an unfound word', () => {
  const state = createDemoGame().getState();
  const { lang, categoryId, difficulty, size, seed } = state;
  const puzzle = buildPuzzle({ lang, categoryId, difficulty, size, seed });
  const { selection } = state;
  assert.ok(selection, 'the demo shows a live selection');
  const dragged = puzzle.placements.find(({ start }) => start.row === selection.anchor.row
    && start.col === selection.anchor.col);
  assert.ok(dragged, 'the drag starts on the first letter of a hidden word');
  assert.equal(state.words.find(({ word }) => word === dragged.word).found, false);
  const wordCells = lineCells(dragged.start, dragged.end);
  assert.ok(selection.cells.length > 1 && selection.cells.length < wordCells.length);
  assert.deepEqual(selection.cells, wordCells.slice(0, selection.cells.length));
});
