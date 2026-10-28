import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineCells, matchPlacement, snapToLine } from '../src/selection.js';

test('lineCells follows all 8 directions', () => {
  const from = { row: 5, col: 5 };
  const steps = [[0, 1], [0, -1], [1, 0], [-1, 0], [1, 1], [-1, -1], [1, -1], [-1, 1]];
  for (const [dRow, dCol] of steps) {
    const cells = lineCells(from, { row: 5 + 3 * dRow, col: 5 + 3 * dCol });
    assert.deepEqual(cells, [0, 1, 2, 3].map((i) => ({ row: 5 + dRow * i, col: 5 + dCol * i })));
  }
});

test('lineCells rejects anything that is not a straight line', () => {
  assert.equal(lineCells({ row: 0, col: 0 }, { row: 1, col: 2 }), null);
  assert.equal(lineCells({ row: 4, col: 4 }, { row: 1, col: 2 }), null);
  assert.equal(lineCells({ row: 0, col: 0 }, { row: 3, col: 2 }), null);
  assert.deepEqual(lineCells({ row: 2, col: 2 }, { row: 2, col: 2 }), [{ row: 2, col: 2 }]);
});

test('snapToLine always ends on a straight line inside the grid', () => {
  const size = 7;
  for (let row = 0; row < size; row += 1) {
    for (let col = 0; col < size; col += 1) {
      for (let targetRow = -2; targetRow <= size + 1; targetRow += 1) {
        for (let targetCol = -2; targetCol <= size + 1; targetCol += 1) {
          const end = snapToLine({ row, col }, { row: targetRow, col: targetCol }, size);
          assert.ok(end.row >= 0 && end.row < size && end.col >= 0 && end.col < size);
          assert.notEqual(lineCells({ row, col }, end), null);
        }
      }
    }
  }
});

test('snapToLine keeps straight targets and picks the nearest direction otherwise', () => {
  const anchor = { row: 5, col: 5 };
  assert.deepEqual(snapToLine(anchor, { row: 5, col: 9 }, 12), { row: 5, col: 9 });
  assert.deepEqual(snapToLine(anchor, { row: 2, col: 2 }, 12), { row: 2, col: 2 });
  assert.deepEqual(snapToLine(anchor, { row: 6, col: 9 }, 12), { row: 5, col: 9 });
  assert.deepEqual(snapToLine(anchor, { row: 7, col: 6 }, 12), { row: 7, col: 7 });
  assert.deepEqual(snapToLine(anchor, anchor, 12), anchor);
  assert.deepEqual(snapToLine({ row: 1, col: 1 }, { row: 9, col: 9 }, 5), { row: 4, col: 4 });
});

test('matchPlacement finds a word selected forwards or backwards, and nothing else', () => {
  const placements = [
    { word: 'CAT', start: { row: 0, col: 0 }, end: { row: 0, col: 2 } },
    { word: 'DOG', start: { row: 4, col: 4 }, end: { row: 2, col: 2 } },
  ];
  assert.equal(matchPlacement(placements, { row: 0, col: 0 }, { row: 0, col: 2 }).word, 'CAT');
  assert.equal(matchPlacement(placements, { row: 0, col: 2 }, { row: 0, col: 0 }).word, 'CAT');
  assert.equal(matchPlacement(placements, { row: 2, col: 2 }, { row: 4, col: 4 }).word, 'DOG');
  assert.equal(matchPlacement(placements, { row: 0, col: 0 }, { row: 0, col: 1 }), null);
  assert.equal(matchPlacement(placements, { row: 4, col: 4 }, { row: 3, col: 3 }), null);
});
