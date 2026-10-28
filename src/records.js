/**
 * Best-time bookkeeping and time formatting. Pure helpers; the UI saves the values through
 * storage.js.
 */

/** Shortest time a record holds, so a saved best time is always a positive number. */
const MIN_RECORD_MS = 1;

/**
 * Storage key for the best time of one puzzle setup.
 * @param {{ lang: string, difficulty: string, size: number }} setup
 * @returns {string}
 */
export function bestTimeKey({ lang, difficulty, size }) {
  return `best:${lang}:${difficulty}:${size}`;
}

/**
 * Reads a stored best time.
 * @param {unknown} storedMs Value from storage.
 * @returns {number | null} the time, or null when the value is not a positive number (no record yet)
 */
export function parseBest(storedMs) {
  return typeof storedMs === 'number' && Number.isFinite(storedMs) && storedMs > 0 ? storedMs : null;
}

/**
 * Combines a finished round's time with the stored best time.
 * @param {unknown} previousMs Stored value; anything but a positive number means "no record yet".
 * @param {number} timeMs Time of the round just won; a record holds at least 1 ms, so even a
 *   0 ms round is read back by parseBest.
 * @returns {{ bestMs: number, isNew: boolean }}
 */
export function mergeBest(previousMs, timeMs) {
  const time = Math.max(MIN_RECORD_MS, timeMs);
  const previous = parseBest(previousMs);
  if (previous !== null && previous <= time) return { bestMs: previous, isNew: false };
  return { bestMs: time, isNew: true };
}

/**
 * Formats a duration as m:ss, or h:mm:ss from one hour on.
 * @param {number} ms
 * @returns {string}
 */
export function formatTime(ms) {
  const totalSeconds = Number.isFinite(ms) && ms > 0 ? Math.floor(ms / 1000) : 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor(totalSeconds / 60) % 60;
  const seconds = String(totalSeconds % 60).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${seconds}` : `${minutes}:${seconds}`;
}
