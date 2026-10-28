import { test } from 'node:test';
import assert from 'node:assert/strict';
import { boardLayout, cellAtPoint, cellCenter, letterSize } from '../src/layout.js';

test('the grid fills the canvas inside a small margin', () => {
  for (const [pixels, size] of [[343, 15], [570, 12], [300, 10], [640, 15]]) {
    const layout = boardLayout(pixels, size);
    assert.equal(layout.size, size);
    assert.ok(layout.pad >= 4 && layout.pad <= 14, `pad ${layout.pad}`);
    assert.ok(Math.abs(2 * layout.pad + size * layout.cell - pixels) < 1e-9);
  }
});

test('the point at a cell center maps back to that cell', () => {
  const layout = boardLayout(343, 15);
  for (let row = 0; row < 15; row += 1) {
    for (let col = 0; col < 15; col += 1) {
      const { x, y } = cellCenter(layout, { row, col });
      assert.deepEqual(cellAtPoint(layout, x, y), { row, col });
    }
  }
});

test('points beyond the grid give the nearest edge cell', () => {
  const layout = boardLayout(300, 10);
  const { y } = cellCenter(layout, { row: 4, col: 0 });
  assert.deepEqual(cellAtPoint(layout, -50, y), { row: 4, col: 0 });
  assert.deepEqual(cellAtPoint(layout, 999, -3), { row: 0, col: 9 });
  assert.deepEqual(cellAtPoint(layout, 2, 299), { row: 9, col: 0 });
});

test('letters reach 14 px on a 15x15 phone board and stay inside their cells', () => {
  // A 343 px board (375 px phone, 16 px gutters) with 15 cells: 56% of a cell would be 12 px.
  const phone = boardLayout(343, 15).cell;
  assert.equal(Math.round(phone * 0.56), 12);
  assert.equal(letterSize(phone), 14);
  // A 288 px board (320 px phone) cannot reach 14 px within 66% of its 18.3 px cells.
  assert.equal(letterSize(boardLayout(288, 15).cell), 12);
  // Desktop boards keep 56% of a cell.
  assert.equal(letterSize(boardLayout(570, 12).cell), Math.round(boardLayout(570, 12).cell * 0.56));
  assert.equal(letterSize(boardLayout(640, 10).cell), 34);
  let previous = 0;
  for (let cell = 8; cell <= 70; cell += 0.25) {
    const px = letterSize(cell);
    assert.ok(Number.isInteger(px), `cell ${cell}`);
    assert.ok(px >= Math.round(cell * 0.56) && px <= Math.round(cell * 0.66), `cell ${cell}: ${px} px`);
    assert.ok(px >= previous, `cell ${cell}: letters never shrink as cells grow`);
    previous = px;
  }
});

test('no cell while the canvas has no size or the point is not a number', () => {
  assert.equal(cellAtPoint(boardLayout(0, 10), 5, 5), null);
  assert.equal(cellAtPoint(boardLayout(300, 10), Number.NaN, 5), null);
});
