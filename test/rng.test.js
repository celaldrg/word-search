import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createRng, randomSeed } from '../src/rng.js';

const draw = (rng, count) => Array.from({ length: count }, () => rng.next());

test('the same seed gives the same sequence; another seed a different one', () => {
  const sequence = draw(createRng(42), 50);
  assert.deepEqual(draw(createRng(42), 50), sequence);
  assert.notDeepEqual(draw(createRng(43), 50), sequence);
  assert.ok(sequence.every((value) => value >= 0 && value < 1));
});

test('int stays within [0, max)', () => {
  const rng = createRng(7);
  const values = Array.from({ length: 1000 }, () => rng.int(6));
  assert.ok(values.every((value) => Number.isInteger(value) && value >= 0 && value < 6));
  assert.equal(new Set(values).size, 6);
});

test('shuffle returns a permutation and leaves the input alone', () => {
  const items = Object.freeze([1, 2, 3, 4, 5, 6, 7, 8]);
  const shuffled = createRng(1).shuffle(items);
  assert.deepEqual([...shuffled].sort((a, b) => a - b), [...items]);
  assert.notDeepEqual(shuffled, [...items]);
  assert.deepEqual(createRng(1).shuffle(items), shuffled);
});

test('weightedIndex follows the weights and never picks a zero weight', () => {
  const rng = createRng(9);
  const counts = [0, 0, 0];
  for (let i = 0; i < 4000; i += 1) counts[rng.weightedIndex([1, 0, 3])] += 1;
  assert.equal(counts[1], 0);
  assert.ok(counts[2] > counts[0] * 2, `counts ${counts}`);
});

test('randomSeed returns an unsigned 32-bit integer', () => {
  for (let i = 0; i < 20; i += 1) {
    const seed = randomSeed();
    assert.ok(Number.isInteger(seed) && seed >= 0 && seed < 2 ** 32);
  }
});
