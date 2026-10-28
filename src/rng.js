/**
 * Seeded pseudo-random numbers (mulberry32). Every random choice in the game goes through an
 * Rng made here, so a seed always rebuilds the same puzzle and the tests stay deterministic.
 */

/**
 * @typedef {object} Rng
 * @property {() => number} next Float in [0, 1).
 * @property {(max: number) => number} int Integer in [0, max).
 * @property {<T>(items: readonly T[]) => T[]} shuffle Shuffled copy of `items` (Fisher-Yates).
 * @property {(weights: readonly number[]) => number} weightedIndex Index drawn with probability
 *   proportional to its weight.
 */

/**
 * Creates a deterministic random number generator.
 * @param {number} seed Any number; it is reduced to an unsigned 32-bit integer.
 * @returns {Rng}
 */
export function createRng(seed) {
  let state = seed >>> 0;

  function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  function int(max) {
    return Math.floor(next() * max);
  }

  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i -= 1) {
      const j = int(i + 1);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }

  function weightedIndex(weights) {
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let remaining = next() * total;
    for (let i = 0; i < weights.length - 1; i += 1) {
      remaining -= weights[i];
      if (remaining < 0) return i;
    }
    return weights.length - 1;
  }

  return { next, int, shuffle, weightedIndex };
}

/**
 * Returns a fresh unsigned 32-bit seed for a new, non-reproducible game.
 * @returns {number}
 */
export function randomSeed() {
  return Math.floor(Math.random() * 4294967296);
}
