/**
 * Canvas view of the letter grid: found words as rounded capsules in rotating shades, the live
 * selection, short effects, the keyboard cursor and the letters on top. The drawing buffer
 * follows the element's CSS size times the device pixel ratio.
 */
import { boardLayout, cellAtPoint, cellCenter, letterSize } from './layout.js';
import { BOARD_COLORS, foundColor } from './palette.js';

/** @typedef {import('./layout.js').BoardLayout} BoardLayout */
/** @typedef {import('./selection.js').Cell} Cell */
/** @typedef {import('./effects.js').ActiveEffect} ActiveEffect */

/**
 * @typedef {object} BoardFrame
 * @property {import('./game.js').GameState} state
 * @property {ActiveEffect[]} effects
 * @property {boolean} showCursor Draw the keyboard cursor.
 * @property {boolean} reduceMotion Show the hint as a steady ring instead of a pulse.
 */

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif';
const MAX_PIXEL_RATIO = 3;
const CAPSULE_RADIUS = 0.4; // in cells
const HINT_PULSES = 3;

/**
 * Creates the renderer for a canvas element.
 * @param {HTMLCanvasElement} canvas Styled to a square CSS size.
 * @param {() => void} onResize Called when the element changes size, so the caller redraws.
 * @returns {{ draw: (frame: BoardFrame) => void, cellAt: (clientX: number, clientY: number, size: number) => Cell | null }}
 */
export function createBoard(canvas, onResize) {
  const ctx = canvas.getContext('2d');
  new ResizeObserver(onResize).observe(canvas);

  /** Matches the drawing buffer to the CSS size and pixel ratio; returns the CSS side. */
  function fitBuffer() {
    const pixels = canvas.getBoundingClientRect().width;
    const ratio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    const buffer = Math.max(1, Math.round(pixels * ratio));
    if (canvas.width !== buffer || canvas.height !== buffer) {
      canvas.width = buffer;
      canvas.height = buffer;
    }
    ctx.setTransform(buffer / Math.max(pixels, 1), 0, 0, buffer / Math.max(pixels, 1), 0, 0);
    return pixels;
  }

  return {
    draw(frame) {
      const pixels = fitBuffer();
      ctx.clearRect(0, 0, pixels, pixels);
      if (pixels > 0) drawFrame(ctx, boardLayout(pixels, frame.state.size), frame);
    },
    cellAt(clientX, clientY, size) {
      const rect = canvas.getBoundingClientRect();
      return cellAtPoint(boardLayout(rect.width, size), clientX - rect.left, clientY - rect.top);
    },
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {BoardLayout} layout
 * @param {BoardFrame} frame
 */
function drawFrame(ctx, layout, { state, effects, showCursor, reduceMotion }) {
  const flashes = new Map(effects.filter(({ kind }) => kind === 'flash').map(({ word, progress }) => [word, progress]));
  state.found.forEach((entry) => drawFound(ctx, layout, entry, flashes.get(entry.word)));
  effects.filter(({ kind }) => kind === 'miss').forEach((effect) => drawMiss(ctx, layout, effect));
  if (state.selection) drawSelection(ctx, layout, state.selection);
  effects.filter(({ kind }) => kind === 'hint').forEach((effect) => drawHint(ctx, layout, effect, reduceMotion));
  if (showCursor) drawCursor(ctx, layout, state.cursor);
  drawLetters(ctx, layout, state.grid, state.selection);
}

/** Path of a capsule (a stadium) around the cells from `from` to `to`. */
function capsulePath(ctx, layout, from, to) {
  const a = cellCenter(layout, from);
  const b = cellCenter(layout, to);
  const radius = layout.cell * CAPSULE_RADIUS;
  const angle = Math.atan2(b.y - a.y, b.x - a.x);
  ctx.beginPath();
  ctx.arc(a.x, a.y, radius, angle + Math.PI / 2, angle + (3 * Math.PI) / 2);
  ctx.arc(b.x, b.y, radius, angle - Math.PI / 2, angle + Math.PI / 2);
  ctx.closePath();
}

/** A found word: tinted capsule with an outline; it glows brighter while a flash runs. */
function drawFound(ctx, layout, { start, end, colorIndex }, flashProgress) {
  const glow = flashProgress === undefined ? 0 : 1 - flashProgress;
  const color = foundColor(colorIndex);
  capsulePath(ctx, layout, start, end);
  ctx.fillStyle = color;
  ctx.globalAlpha = 0.2 + 0.5 * glow;
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = Math.max(1.5, layout.cell * 0.07);
  ctx.globalAlpha = 0.9;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** A selection that matched no word, fading out. */
function drawMiss(ctx, layout, { start, end, progress }) {
  capsulePath(ctx, layout, start, end);
  ctx.fillStyle = BOARD_COLORS.miss;
  ctx.globalAlpha = 0.6 * (1 - progress);
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** The line being selected: a solid accent capsule (its letters are drawn in dark ink). */
function drawSelection(ctx, layout, { anchor, head }) {
  capsulePath(ctx, layout, anchor, head);
  ctx.fillStyle = BOARD_COLORS.accent;
  ctx.globalAlpha = 0.95;
  ctx.fill();
  ctx.globalAlpha = 1;
}

/** A ring on the hinted first letter: it pulses a few times, or stays steady for reduced motion. */
function drawHint(ctx, layout, { cell, progress }, reduceMotion) {
  const strength = reduceMotion ? 1 : Math.abs(Math.sin(progress * HINT_PULSES * Math.PI));
  const { x, y } = cellCenter(layout, cell);
  ctx.beginPath();
  ctx.arc(x, y, layout.cell * 0.47, 0, 2 * Math.PI);
  ctx.fillStyle = BOARD_COLORS.accent;
  ctx.globalAlpha = 0.12 + 0.4 * strength;
  ctx.fill();
  ctx.strokeStyle = BOARD_COLORS.accent;
  ctx.lineWidth = Math.max(2, layout.cell * 0.08);
  ctx.globalAlpha = 0.35 + 0.65 * strength;
  ctx.stroke();
  ctx.globalAlpha = 1;
}

/** Dashed ring around the keyboard cursor. */
function drawCursor(ctx, layout, cell) {
  const { x, y } = cellCenter(layout, cell);
  ctx.beginPath();
  ctx.arc(x, y, layout.cell * 0.48, 0, 2 * Math.PI);
  ctx.strokeStyle = BOARD_COLORS.accent;
  ctx.lineWidth = 2;
  ctx.setLineDash([3, 3]);
  ctx.stroke();
  ctx.setLineDash([]);
}

/** The letters, in dark ink where the selection covers them. */
function drawLetters(ctx, layout, grid, selection) {
  const size = grid.length;
  const selected = new Set((selection?.cells ?? []).map(({ row, col }) => row * size + col));
  const fontSize = letterSize(layout.cell);
  ctx.font = `700 ${fontSize}px ${FONT_STACK}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  grid.forEach((letters, row) => letters.forEach((letter, col) => {
    const { x, y } = cellCenter(layout, { row, col });
    ctx.fillStyle = selected.has(row * size + col) ? BOARD_COLORS.ink : BOARD_COLORS.letter;
    // Capital letters are about 0.72 em tall; this puts their middle on the cell's center.
    ctx.fillText(letter, x, y + fontSize * 0.36);
  }));
}
