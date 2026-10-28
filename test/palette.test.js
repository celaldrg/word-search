import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { BOARD_COLORS, FOUND_COLORS, foundColor } from '../src/palette.js';

test('found words rotate through distinct shades, starting with the accent', () => {
  assert.equal(foundColor(0), BOARD_COLORS.accent);
  assert.equal(new Set(FOUND_COLORS).size, FOUND_COLORS.length);
  for (let i = 0; i < FOUND_COLORS.length; i += 1) {
    assert.equal(foundColor(i + FOUND_COLORS.length), foundColor(i));
  }
  assert.equal(foundColor(-1), FOUND_COLORS.at(-1));
});

test('board colors match the theme tokens in style.css', () => {
  const css = readFileSync(new URL('../style.css', import.meta.url), 'utf8');
  const token = (name) => css.match(new RegExp(`--${name}:\\s*(#[0-9a-f]{6})`))[1];
  assert.equal(BOARD_COLORS.letter, token('text'));
  assert.equal(BOARD_COLORS.ink, token('bg'));
  assert.equal(BOARD_COLORS.accent, token('accent'));
});
