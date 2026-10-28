/**
 * Straight-line selection geometry on grid cells. Pure functions.
 */

/** @typedef {{ row: number, col: number }} Cell */

/**
 * Cells on the straight line from `from` to `to`, both included, or null when the cells are
 * not in one of the 8 directions (horizontal, vertical or 45-degree diagonal).
 * @param {Cell} from
 * @param {Cell} to
 * @returns {Cell[] | null}
 */
export function lineCells(from, to) {
  const dRow = to.row - from.row;
  const dCol = to.col - from.col;
  if (dRow !== 0 && dCol !== 0 && Math.abs(dRow) !== Math.abs(dCol)) return null;
  const stepRow = Math.sign(dRow);
  const stepCol = Math.sign(dCol);
  const length = Math.max(Math.abs(dRow), Math.abs(dCol)) + 1;
  return Array.from({ length }, (_, i) => ({ row: from.row + stepRow * i, col: from.col + stepCol * i }));
}

/**
 * End cell of the straight line from `anchor` that best follows a free pointer position: the
 * nearest of the 8 directions, as many cells as the pointer is away, clipped to the grid.
 * @param {Cell} anchor Start of the selection, inside the grid.
 * @param {Cell} target Cell under the pointer.
 * @param {number} size Grid side.
 * @returns {Cell}
 */
export function snapToLine(anchor, target, size) {
  const dRow = target.row - anchor.row;
  const dCol = target.col - anchor.col;
  if (dRow === 0 && dCol === 0) return { row: anchor.row, col: anchor.col };
  const eighth = Math.PI / 4;
  const angle = Math.round(Math.atan2(dRow, dCol) / eighth) * eighth;
  const stepRow = Math.round(Math.sin(angle));
  const stepCol = Math.round(Math.cos(angle));
  const length = Math.min(
    Math.max(Math.abs(dRow), Math.abs(dCol)),
    roomAlong(anchor.row, stepRow, size),
    roomAlong(anchor.col, stepCol, size),
  );
  return { row: anchor.row + stepRow * length, col: anchor.col + stepCol * length };
}

function roomAlong(position, step, size) {
  if (step > 0) return size - 1 - position;
  if (step < 0) return position;
  return Infinity;
}

/**
 * The placement whose first and last letters are exactly the selection ends, in either order.
 * @template {{ start: Cell, end: Cell }} P
 * @param {readonly P[]} placements
 * @param {Cell} from
 * @param {Cell} to
 * @returns {P | null}
 */
export function matchPlacement(placements, from, to) {
  const covers = (a, b) => (p) => sameCell(p.start, a) && sameCell(p.end, b);
  return placements.find(covers(from, to)) ?? placements.find(covers(to, from)) ?? null;
}

function sameCell(a, b) {
  return a.row === b.row && a.col === b.col;
}
