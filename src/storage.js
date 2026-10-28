/**
 * Tiny localStorage helper. Every read and write is wrapped in try/catch, so private mode,
 * blocked storage or a full quota never crash the game. Nothing is touched at import time.
 */

const PREFIX = 'word-search:';

/**
 * @typedef {object} KeyValueStore
 * @property {<T>(key: string, fallback: T) => T} get Stored JSON value, or `fallback` when it is
 *   missing, unreadable or storage is unavailable.
 * @property {(key: string, value: unknown) => boolean} set Saves `value` as JSON; false when it
 *   could not be saved.
 */

/**
 * Creates a JSON key-value store on top of a Web Storage-like backend.
 * @param {() => (Pick<Storage, 'getItem' | 'setItem'> | null | undefined)} [getBackend]
 *   Looked up on every call; defaults to the page's localStorage.
 * @returns {KeyValueStore}
 */
export function createStorage(getBackend = () => globalThis.localStorage) {
  return {
    get(key, fallback) {
      try {
        const raw = getBackend()?.getItem(PREFIX + key);
        return raw == null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },
    set(key, value) {
      try {
        const backend = getBackend();
        if (!backend) return false;
        backend.setItem(PREFIX + key, JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    },
  };
}

/** Store backed by the page's localStorage. */
export const storage = createStorage();
