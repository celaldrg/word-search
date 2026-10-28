import { test } from 'node:test';
import assert from 'node:assert/strict';
import { bestTimeKey, formatTime, mergeBest, parseBest } from '../src/records.js';

test('bestTimeKey separates language, difficulty and size', () => {
  assert.equal(bestTimeKey({ lang: 'tr', difficulty: 'hard', size: 15 }), 'best:tr:hard:15');
  assert.notEqual(
    bestTimeKey({ lang: 'en', difficulty: 'easy', size: 10 }),
    bestTimeKey({ lang: 'en', difficulty: 'easy', size: 11 }),
  );
});

test('mergeBest keeps the faster time and flags a new record', () => {
  assert.deepEqual(mergeBest(null, 5000), { bestMs: 5000, isNew: true });
  assert.deepEqual(mergeBest('junk', 5000), { bestMs: 5000, isNew: true });
  assert.deepEqual(mergeBest(0, 5000), { bestMs: 5000, isNew: true });
  assert.deepEqual(mergeBest(6000, 5000), { bestMs: 5000, isNew: true });
  assert.deepEqual(mergeBest(4000, 5000), { bestMs: 4000, isNew: false });
  assert.deepEqual(mergeBest(5000, 5000), { bestMs: 5000, isNew: false });
});

test('a 0 ms win is stored as 1 ms, so it reads back as a record', () => {
  const first = mergeBest(null, 0);
  assert.deepEqual(first, { bestMs: 1, isNew: true });
  assert.equal(parseBest(first.bestMs), 1);
  assert.equal(formatTime(first.bestMs), '0:00');
  assert.deepEqual(mergeBest(first.bestMs, 0), { bestMs: 1, isNew: false });
  assert.deepEqual(mergeBest(first.bestMs, 0.4), { bestMs: 1, isNew: false });
  assert.deepEqual(mergeBest(1, 2), { bestMs: 1, isNew: false });
});

test('parseBest accepts only positive finite numbers', () => {
  assert.equal(parseBest(61_000), 61_000);
  for (const junk of [null, undefined, 0, -5, Number.NaN, Number.POSITIVE_INFINITY, '61000', {}]) {
    assert.equal(parseBest(junk), null, String(junk));
  }
});

test('formatTime shows m:ss, and h:mm:ss from one hour', () => {
  assert.equal(formatTime(0), '0:00');
  assert.equal(formatTime(5999), '0:05');
  assert.equal(formatTime(65_432), '1:05');
  assert.equal(formatTime(3_599_999), '59:59');
  assert.equal(formatTime(3_725_000), '1:02:05');
  assert.equal(formatTime(-1), '0:00');
  assert.equal(formatTime(Number.NaN), '0:00');
});
