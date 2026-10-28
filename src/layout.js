/**
 * Board geometry in CSS pixels: where each cell of the letter grid sits on the square canvas
 * and which cell lies under a point. Pure functions shared by the renderer and the input code.
 */

/** @typedef {import('./selection.js').Cell} Cell */

/** Letters fill this share of a cell... */
const LETTER_SHARE = 0.56;
/** ...and up to this share on small cells (a 15x15 grid on a phone), to reach READABLE_LETTER_PX. */
const SMALL_CELL_LETTER_SHARE = 0.66;
const READABLE_LETTER_PX = 14;

/**
 * @typedef {object} BoardLayout
 * @property {number} size Grid side in cells.
 * @property {number} pad Space between the canvas edge and the grid, in CSS pixels.
 * @property {number} cell Side of one cell in CSS pixels (0 while the canvas has no size).
 */

/**
 * Fits a size x size grid into a square canvas.
 * @param {number} pixels Canvas side in CSS pixels.
 * @param {number} size Grid side in cells.
 * @returns {BoardLayout}
 */
export function boardLayout(pixels, size) {
  const side = Math.max(0, pixels);
  const pad = Math.min(14, Math.max(4, Math.round(side * 0.025)));
  return { size, pad, cell: Math.max(0, side - 2 * pad) / size };
}

/**
 * Font size of the grid letters: 56% of a cell, raised towards 14 px on small cells (but never
 * above 66% of the cell) so a 15x15 grid stays readable on a phone.
 * @param {number} cell Side of one cell in CSS pixels.
 * @returns {number} Whole CSS pixels.
 */
export function letterSize(cell) {
  const raised = Math.min(cell * SMALL_CELL_LETTER_SHARE, READABLE_LETTER_PX);
  return Math.round(Math.max(cell * LETTER_SHARE, raised));
}

/**
 * Center of a cell in CSS pixels.
 * @param {BoardLayout} layout
 * @param {Cell} cell
 * @returns {{ x: number, y: number }}
 */
export function cellCenter({ pad, cell }, { row, col }) {
  return { x: pad + (col + 0.5) * cell, y: pad + (row + 0.5) * cell };
}

/**
 * The cell under a point. Points beyond the grid give the nearest edge cell, so a drag that
 * leaves the board keeps following the pointer along the edge.
 * @param {BoardLayout} layout
 * @param {number} x CSS pixels from the left edge of the canvas.
 * @param {number} y CSS pixels from the top edge of the canvas.
 * @returns {Cell | null} null while the canvas has no size or the point is not a number
 */
export function cellAtPoint({ size, pad, cell }, x, y) {
  if (!(cell > 0) || !Number.isFinite(x) || !Number.isFinite(y)) return null;
  const toIndex = (value) => Math.min(size - 1, Math.max(0, Math.floor((value - pad) / cell)));
  return { row: toIndex(y), col: toIndex(x) };
}
