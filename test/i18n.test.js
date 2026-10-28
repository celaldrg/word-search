import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DIFFICULTIES } from '../src/game.js';
import { STRINGS, UI_LANGUAGES, translate } from '../src/i18n.js';
import { LANGUAGES } from '../src/text.js';

const ROOT = new URL('../', import.meta.url);
const placeholders = (text) => [...text.matchAll(/\{(\w+)\}/g)].map(([, name]) => name).sort();

test('English is the default, and English and Turkish have the same non-empty keys', () => {
  assert.deepEqual(UI_LANGUAGES, ['en', 'tr']);
  const keys = Object.keys(STRINGS.en).sort();
  assert.deepEqual(Object.keys(STRINGS.tr).sort(), keys);
  for (const lang of UI_LANGUAGES) {
    for (const key of keys) assert.ok(STRINGS[lang][key].trim().length > 0, `${lang}: ${key}`);
  }
});

test('each key has the same placeholders in both languages', () => {
  for (const key of Object.keys(STRINGS.en)) {
    assert.deepEqual(placeholders(STRINGS.tr[key]), placeholders(STRINGS.en[key]), key);
  }
});

test('translate fills placeholders and falls back sensibly', () => {
  assert.equal(translate('en', 'status.found', { word: 'KIWI' }), 'Found KIWI!');
  assert.equal(translate('tr', 'status.found', { word: 'KİRAZ' }), 'KİRAZ bulundu!');
  assert.equal(translate('en', 'level.hard', { size: 15 }), 'Hard · 15×15 · all 8 directions');
  assert.equal(translate('en', 'status.found'), 'Found {word}!');
  assert.equal(translate('de', 'app.title'), 'Word Search');
  assert.equal(translate('tr', 'no.such.key'), 'no.such.key');
});

test('the language toggle names the other language', () => {
  assert.equal(translate('en', 'app.langToggle'), 'TR');
  assert.equal(translate('tr', 'app.langToggle'), 'EN');
});

test('every key used by index.html and the UI code exists', () => {
  const html = readFileSync(new URL('index.html', ROOT), 'utf8');
  const htmlKeys = [...html.matchAll(/data-i18n(?:-label|-title)?="([^"]+)"/g)].map(([, key]) => key);
  assert.ok(htmlKeys.length > 15, 'index.html marks its texts with data-i18n');

  const sources = readdirSync(new URL('src/', ROOT))
    .filter((name) => name.endsWith('.js') && name !== 'i18n.js')
    .map((name) => readFileSync(new URL(`src/${name}`, ROOT), 'utf8'))
    .join('\n');
  const namespaces = [...new Set(Object.keys(STRINGS.en).map((key) => key.split('.')[0]))].join('|');
  const codeKeys = [...sources.matchAll(new RegExp(`'((?:${namespaces})\\.\\w+)'`, 'g'))].map(([, key]) => key);
  assert.ok(codeKeys.length > 5, 'the UI code uses translation keys');

  const builtKeys = [
    ...LANGUAGES.map((lang) => `lang.${lang}`),
    ...Object.keys(DIFFICULTIES).map((id) => `level.${id}`),
  ];
  for (const key of [...htmlKeys, ...codeKeys, ...builtKeys]) {
    assert.ok(Object.hasOwn(STRINGS.en, key), `missing key ${key}`);
  }
});
