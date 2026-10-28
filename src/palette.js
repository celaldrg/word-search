/**
 * Colors drawn on the canvas board and used for found words in the word list. The board colors
 * match the tokens in style.css. Pure module.
 */

/** Letters, dark ink on the selection, the accent and the miss color of the board. */
export const BOARD_COLORS = Object.freeze({
  letter: '#e2e8f0',
  ink: '#0f172a',
  accent: '#fde68a',
  miss: '#fb7185',
});

/** Capsule shades for found words, starting with the accent; they repeat after the last one. */
export const FOUND_COLORS = Object.freeze([
  '#fde68a',
  '#7dd3fc',
  '#86efac',
  '#f9a8d4',
  '#c4b5fd',
  '#fdba74',
  '#5eead4',
  '#bef264',
]);

/**
 * The shade of the n-th found word (0 = first found).
 * @param {number} index
 * @returns {string}
 */
export function foundColor(index) {
  const count = FOUND_COLORS.length;
  return FOUND_COLORS[((index % count) + count) % count];
}
