/**
 * DOM helpers for everything around the canvas: translated static texts, select options, the
 * word list and the win dialog. Text always goes in through textContent or attributes.
 */
import { foundColor } from './palette.js';

/**
 * Translates the static page: data-i18n sets the text, data-i18n-label the aria-label and
 * data-i18n-title the tooltip of an element.
 * @param {ParentNode} root
 * @param {(key: string) => string} t Translation in the current interface language.
 */
export function translateStatic(root, t) {
  root.querySelectorAll('[data-i18n]').forEach((element) => {
    element.textContent = t(element.dataset.i18n);
  });
  root.querySelectorAll('[data-i18n-label]').forEach((element) => {
    element.setAttribute('aria-label', t(element.dataset.i18nLabel));
  });
  root.querySelectorAll('[data-i18n-title]').forEach((element) => {
    element.title = t(element.dataset.i18nTitle);
  });
}

/**
 * Replaces the options of a select and selects one of them.
 * @param {HTMLSelectElement} select
 * @param {{ value: string, label: string }[]} options
 * @param {string} value
 */
export function fillSelect(select, options, value) {
  select.replaceChildren(...options.map((option) => new Option(option.label, option.value)));
  select.value = value;
}

/**
 * Renders the words to find; found ones are struck through and marked with the shade of
 * their capsule on the board.
 * @param {HTMLElement} list A <ul> or <ol>.
 * @param {{ word: string, found: boolean, colorIndex: number | null }[]} words
 * @param {(word: string) => string} foundLabel Accessible name of a found word.
 */
export function renderWordList(list, words, foundLabel) {
  list.replaceChildren(...words.map(({ word, found, colorIndex }) => {
    const item = document.createElement('li');
    item.className = found ? 'word is-found' : 'word';
    item.textContent = word;
    if (found) {
      item.style.setProperty('--word-color', foundColor(colorIndex));
      item.setAttribute('aria-label', foundLabel(word));
    }
    return item;
  }));
}

/**
 * Fills in and opens the win dialog.
 * @param {{ dialog: HTMLDialogElement, time: HTMLElement, best: HTMLElement, bestRow: HTMLElement, hints: HTMLElement, record: HTMLElement }} parts
 * @param {{ time: string, best: string | null, hints: string, isNew: boolean }} result `best`
 *   null hides the best time; `hints` is the translated hint count line.
 */
export function showWinDialog(parts, { time, best, hints, isNew }) {
  parts.time.textContent = time;
  parts.best.textContent = best ?? '';
  parts.bestRow.hidden = best === null;
  parts.hints.textContent = hints;
  parts.record.hidden = !isNew;
  if (!parts.dialog.open) parts.dialog.showModal();
}
