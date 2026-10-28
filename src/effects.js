/**
 * Short board effects and their progress over time: a flash on a found (or found again) word,
 * a fading capsule after a miss and a pulsing hint. Pure: the caller passes the time in ms.
 */

/** @typedef {import('./selection.js').Cell} Cell */

/** How long each kind of effect runs, in milliseconds. */
export const EFFECT_MS = Object.freeze({ flash: 650, miss: 450, hint: 1800 });

/**
 * @typedef {object} ActiveEffect
 * @property {'flash'|'miss'|'hint'} kind
 * @property {number} progress From 0 (just started) up to, but not including, 1 (ended).
 * @property {string} [word] flash: the word whose capsule lights up.
 * @property {Cell} [start] miss: first cell of the line.
 * @property {Cell} [end] miss: last cell of the line.
 * @property {Cell} [cell] hint: the cell to highlight.
 */

/**
 * @typedef {object} EffectList
 * @property {(kind: 'flash'|'miss'|'hint', data: object, now: number) => void} add Starts an
 *   effect at time `now`; a new hint replaces a running one.
 * @property {(now: number) => ActiveEffect[]} active Effects still running at `now`, oldest
 *   first; ended ones are dropped.
 * @property {() => void} clear Drops every effect (new round).
 */

/**
 * Creates an empty effect list.
 * @returns {EffectList}
 */
export function createEffects() {
  let running = [];
  return {
    add(kind, data, now) {
      if (!Object.hasOwn(EFFECT_MS, kind)) throw new Error(`Unknown effect "${kind}".`);
      if (kind === 'hint') running = running.filter((effect) => effect.kind !== 'hint');
      running.push({ ...data, kind, startedAt: now });
    },
    active(now) {
      running = running.filter(({ kind, startedAt }) => now - startedAt < EFFECT_MS[kind]);
      return running.map(({ startedAt, ...effect }) => ({
        ...effect,
        progress: Math.max(0, (now - startedAt) / EFFECT_MS[effect.kind]),
      }));
    },
    clear() {
      running = [];
    },
  };
}
