/**
 * Entry point: connects the pure game modules to the page. It owns the round in play, the
 * saved settings and the animation loop that advances the timer and redraws the board.
 */
import { createBoard } from './board.js';
import { createEffects } from './effects.js';
import { DIFFICULTIES, createDemoGame, createGame } from './game.js';
import { UI_LANGUAGES, translate } from './i18n.js';
import { bestTimeKey, formatTime, mergeBest, parseBest } from './records.js';
import { storage } from './storage.js';
import { LANGUAGES } from './text.js';
import { fillSelect, renderWordList, showWinDialog, translateStatic } from './view.js';
import { listCategories } from './words.js';

const SETTINGS_KEY = 'settings';
/** Most time one animation frame may add to the clock, so a stalled page cannot make it jump. */
const MAX_FRAME_MS = 1000;
const ARROW_STEPS = Object.freeze({
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
});

const byId = (id) => document.getElementById(id);
const els = {
  newGame: byId('new-game'),
  restart: byId('restart'),
  langToggle: byId('lang-toggle'),
  clock: byId('clock'),
  foundCount: byId('found-count'),
  bestTime: byId('best-time'),
  hint: byId('hint'),
  canvas: byId('board'),
  status: byId('status'),
  categoryTitle: byId('category-title'),
  wordList: byId('word-list'),
  categorySelect: byId('category-select'),
  wordLangSelect: byId('word-lang-select'),
  difficultySelect: byId('difficulty-select'),
  winNewGame: byId('win-new-game'),
  winClose: byId('win-close'),
  win: {
    dialog: byId('win-dialog'),
    time: byId('win-time'),
    best: byId('win-best'),
    bestRow: byId('win-best-row'),
    hints: byId('win-hints'),
    record: byId('win-record'),
  },
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const effects = createEffects();
const board = createBoard(els.canvas, requestDraw);

const app = {
  settings: loadSettings(),
  game: null,
  demo: false,
  clockRunning: false,
  lastFrame: null,
  clockText: '',
  keyboardMode: false,
  dragPointer: null,
  needsDraw: true,
  status: { key: 'status.start', params: {} },
};

/** Translates into the current interface language. */
function t(key, params) {
  return translate(app.settings.uiLang, key, params);
}

/** Saved settings; createGame falls back to defaults for a missing or unknown puzzle setting. */
function loadSettings() {
  const saved = storage.get(SETTINGS_KEY, null);
  return {
    uiLang: UI_LANGUAGES.includes(saved?.uiLang) ? saved.uiLang : UI_LANGUAGES[0],
    wordLang: saved?.wordLang,
    categoryId: saved?.categoryId,
    difficulty: saved?.difficulty,
  };
}

function saveSettings() {
  storage.set(SETTINGS_KEY, app.settings);
}

/**
 * Puts a round in play. A normal round's setup becomes the puzzle settings; the ?demo round
 * leaves the visitor's own settings alone, and its clock waits for the first move so the
 * screenshot stays fixed.
 */
function startRound(game, demo = false) {
  app.game = game;
  app.demo = demo;
  app.clockRunning = !demo;
  app.dragPointer = null;
  effects.clear();
  if (!demo) app.settings = { ...app.settings, ...puzzleSettingsOf(game) };
  if (els.win.dialog.open) els.win.dialog.close();
  app.status = { key: 'status.start', params: {} };
  renderRound();
}

/** A fresh puzzle (new seed) with the current settings. */
function createRoundFromSettings() {
  const { wordLang, categoryId, difficulty } = app.settings;
  return createGame({ lang: wordLang, categoryId, difficulty });
}

function newGame() {
  startRound(createRoundFromSettings());
}

/** Same puzzle again from the start: same setup, same seed. */
function restartRound() {
  const { lang, categoryId, difficulty, size, seed } = app.game.getState();
  startRound(createGame({ lang, categoryId, difficulty, size, seed }));
}

/** The puzzle settings that rebuild a round of the same kind. */
function puzzleSettingsOf(game) {
  const { lang, categoryId, difficulty } = game.getState();
  return { wordLang: lang, categoryId, difficulty };
}

/** A changed select starts a new game; the other puzzle settings stay as the round on screen shows them. */
function changeSetting(name, value) {
  app.settings = { ...app.settings, ...puzzleSettingsOf(app.game), [name]: value };
  saveSettings();
  newGame();
}

function toggleLanguage() {
  app.settings.uiLang = UI_LANGUAGES.find((lang) => lang !== app.settings.uiLang);
  saveSettings();
  applyLanguage();
  renderRound();
}

/** Static texts, page language and title in the interface language. */
function applyLanguage() {
  document.documentElement.lang = app.settings.uiLang;
  document.title = t('app.title');
  translateStatic(document, t);
}

/** Controls, word list, counters and status line of the round in play. */
function renderRound() {
  const state = app.game.getState();
  const categories = listCategories(app.settings.uiLang);
  fillSelect(els.categorySelect, categories.map(({ id, title }) => ({ value: id, label: title })), state.categoryId);
  fillSelect(els.wordLangSelect, LANGUAGES.map((lang) => ({ value: lang, label: t(`lang.${lang}`) })), state.lang);
  fillSelect(
    els.difficultySelect,
    Object.entries(DIFFICULTIES).map(([id, { size }]) => ({ value: id, label: t(`level.${id}`, { size }) })),
    state.difficulty,
  );
  els.categoryTitle.textContent = categories.find(({ id }) => id === state.categoryId).title;
  els.hint.disabled = state.status === 'won';
  renderWords(state);
  renderBest(state);
  renderStatus();
  requestDraw();
}

function renderWords(state) {
  renderWordList(els.wordList, state.words, (word) => t('words.found', { word }));
  els.foundCount.textContent = `${state.foundCount}/${state.totalWords}`;
}

function renderBest(state) {
  const best = parseBest(storage.get(bestTimeKey(state), null));
  els.bestTime.textContent = best === null ? t('stats.noBest') : formatTime(best);
}

function renderClock(elapsedMs) {
  const text = formatTime(elapsedMs);
  if (text === app.clockText) return;
  app.clockText = text;
  els.clock.textContent = text;
}

function setStatus(key, params = {}) {
  app.status = { key, params };
  renderStatus();
}

function renderStatus() {
  els.status.textContent = t(app.status.key, app.status.params);
}

function requestDraw() {
  app.needsDraw = true;
}

/** Shows what a finished selection did. */
function handleResult(result) {
  if (!result || result.status === 'invalid') return;
  const now = performance.now();
  if (result.status === 'miss') {
    effects.add('miss', { start: result.cells[0], end: result.cells.at(-1) }, now);
    setStatus('status.miss');
  } else {
    effects.add('flash', { word: result.word }, now);
    setStatus(result.status === 'found' ? 'status.found' : 'status.repeat', { word: result.word });
  }
  if (result.status === 'found') onWordFound();
  requestDraw();
}

function onWordFound() {
  const state = app.game.getState();
  renderWords(state);
  if (state.status === 'won') finishRound(state);
}

/** Saves the best time (demo rounds start half solved, so they never count) and shows the dialog. */
function finishRound(state) {
  const time = formatTime(state.elapsedMs);
  const record = app.demo ? null : saveBestTime(state);
  els.hint.disabled = true;
  setStatus('status.won', { time });
  renderBest(state);
  showWinDialog(els.win, {
    time,
    best: record && formatTime(record.bestMs),
    hints: t('win.hints', { count: state.hintsUsed }),
    isNew: Boolean(record?.isNew),
  });
}

function saveBestTime(state) {
  const key = bestTimeKey(state);
  const record = mergeBest(storage.get(key, null), state.elapsedMs);
  if (record.isNew) storage.set(key, record.bestMs);
  return record;
}

function showHint() {
  const hint = app.game.hint();
  if (!hint) return;
  app.clockRunning = true;
  effects.add('hint', { cell: hint.cell }, performance.now());
  setStatus('status.hint', { word: hint.word });
  requestDraw();
}

function cellUnder(event) {
  return board.cellAt(event.clientX, event.clientY, app.game.size);
}

function onPointerDown(event) {
  if (!event.isPrimary || event.button !== 0) return;
  const cell = cellUnder(event);
  if (!cell) return;
  els.canvas.setPointerCapture(event.pointerId);
  app.dragPointer = event.pointerId;
  app.keyboardMode = false;
  app.clockRunning = true;
  app.game.beginSelection(cell);
  requestDraw();
}

function onPointerMove(event) {
  if (event.pointerId !== app.dragPointer) return;
  const cell = cellUnder(event);
  if (!cell) return;
  app.game.updateSelection(cell);
  requestDraw();
}

function onPointerUp(event) {
  if (event.pointerId !== app.dragPointer) return;
  app.dragPointer = null;
  handleResult(app.game.endSelection());
  requestDraw();
}

function onPointerCancel(event) {
  if (event.pointerId !== app.dragPointer) return;
  app.dragPointer = null;
  app.game.cancelSelection();
  requestDraw();
}

/** Arrows move the cursor, Enter or Space starts and ends a selection, Escape cancels it. */
function onKeyDown(event) {
  const onBoard = event.target === els.canvas || event.target === document.body;
  if (!onBoard || event.altKey || event.ctrlKey || event.metaKey) return;
  const step = ARROW_STEPS[event.key];
  const toggles = event.key === 'Enter' || event.key === ' ';
  if (!step && !toggles && event.key !== 'Escape') return;
  event.preventDefault();
  app.keyboardMode = true;
  app.clockRunning = true;
  if (step) app.game.moveCursor(step[0], step[1]);
  else if (toggles && !event.repeat) handleResult(app.game.toggleSelection());
  else if (!toggles) app.game.cancelSelection();
  if (document.activeElement !== els.canvas) els.canvas.focus({ preventScroll: true });
  requestDraw();
}

/**
 * One animation frame: advances the clock (never with time the page spent hidden) and redraws
 * when needed; an idle frame only reads the elapsed time.
 */
function frame(now) {
  const dt = app.lastFrame === null ? 0 : Math.min(now - app.lastFrame, MAX_FRAME_MS);
  app.lastFrame = now;
  if (app.clockRunning) app.game.update(dt);
  renderClock(app.game.elapsedMs);
  const live = effects.active(now);
  if (app.needsDraw || live.length > 0) {
    board.draw({
      state: app.game.getState(),
      effects: live,
      showCursor: app.keyboardMode && document.activeElement === els.canvas,
      reduceMotion: reducedMotion.matches,
    });
    // One more frame after the last effect ends, to clear it.
    app.needsDraw = live.length > 0;
  }
  requestAnimationFrame(frame);
}

function wireEvents() {
  els.newGame.addEventListener('click', newGame);
  els.restart.addEventListener('click', restartRound);
  els.langToggle.addEventListener('click', toggleLanguage);
  els.hint.addEventListener('click', showHint);
  els.categorySelect.addEventListener('change', () => changeSetting('categoryId', els.categorySelect.value));
  els.wordLangSelect.addEventListener('change', () => changeSetting('wordLang', els.wordLangSelect.value));
  els.difficultySelect.addEventListener('change', () => changeSetting('difficulty', els.difficultySelect.value));
  els.winNewGame.addEventListener('click', newGame);
  els.winClose.addEventListener('click', () => els.win.dialog.close());
  els.canvas.addEventListener('pointerdown', onPointerDown);
  els.canvas.addEventListener('pointermove', onPointerMove);
  els.canvas.addEventListener('pointerup', onPointerUp);
  els.canvas.addEventListener('pointercancel', onPointerCancel);
  els.canvas.addEventListener('focus', requestDraw);
  els.canvas.addEventListener('blur', requestDraw);
  document.addEventListener('keydown', onKeyDown);
  document.addEventListener('visibilitychange', () => {
    app.lastFrame = null;
  });
}

function init() {
  const demo = new URLSearchParams(window.location.search).has('demo');
  applyLanguage();
  startRound(demo ? createDemoGame() : createRoundFromSettings(), demo);
  wireEvents();
  requestAnimationFrame(frame);
}

init();
