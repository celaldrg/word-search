import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EFFECT_MS, createEffects } from '../src/effects.js';

test('an effect reports its progress and ends after its duration', () => {
  const effects = createEffects();
  effects.add('flash', { word: 'KIWI' }, 1000);
  assert.deepEqual(effects.active(1000), [{ word: 'KIWI', kind: 'flash', progress: 0 }]);
  assert.equal(effects.active(1000 + EFFECT_MS.flash / 2)[0].progress, 0.5);
  assert.deepEqual(effects.active(1000 + EFFECT_MS.flash), []);
  assert.deepEqual(effects.active(1000), [], 'an ended effect does not come back');
});

test('progress never goes below 0 for a frame stamped just before the effect started', () => {
  const effects = createEffects();
  effects.add('miss', { start: { row: 0, col: 0 }, end: { row: 0, col: 3 } }, 500);
  assert.equal(effects.active(498)[0].progress, 0);
});

test('a new hint replaces a running one; other effects run side by side', () => {
  const effects = createEffects();
  effects.add('hint', { cell: { row: 1, col: 1 } }, 0);
  effects.add('flash', { word: 'PEAR' }, 10);
  effects.add('hint', { cell: { row: 2, col: 2 } }, 20);
  const running = effects.active(30);
  assert.deepEqual(running.map(({ kind }) => kind), ['flash', 'hint']);
  assert.deepEqual(running[1].cell, { row: 2, col: 2 });
});

test('clear drops everything and unknown kinds are rejected', () => {
  const effects = createEffects();
  effects.add('flash', { word: 'PLUM' }, 0);
  effects.clear();
  assert.deepEqual(effects.active(1), []);
  assert.throws(() => effects.add('sparkle', {}, 0), /Unknown effect "sparkle"/);
});
