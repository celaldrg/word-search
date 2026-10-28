import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createStorage, storage } from '../src/storage.js';

function memoryBackend() {
  const data = new Map();
  return {
    data,
    getItem: (key) => (data.has(key) ? data.get(key) : null),
    setItem: (key, value) => data.set(key, String(value)),
  };
}

test('values round-trip as JSON under a prefixed key', () => {
  const backend = memoryBackend();
  const store = createStorage(() => backend);
  assert.equal(store.set('best:en:easy:10', 61_000), true);
  assert.equal(store.set('settings', { uiLang: 'tr' }), true);
  assert.equal(store.get('best:en:easy:10', null), 61_000);
  assert.deepEqual(store.get('settings', {}), { uiLang: 'tr' });
  assert.ok(backend.data.has('word-search:settings'));
  assert.equal(store.get('missing', 'fallback'), 'fallback');
});

test('broken or missing storage never throws and falls back', () => {
  const failing = {
    getItem() {
      throw new Error('SecurityError');
    },
    setItem() {
      throw new Error('QuotaExceededError');
    },
  };
  const backends = [
    () => failing,
    () => {
      throw new Error('access denied');
    },
    () => null,
    () => undefined,
  ];
  for (const getBackend of backends) {
    const store = createStorage(getBackend);
    assert.equal(store.get('key', 7), 7);
    assert.equal(store.set('key', 1), false);
  }
});

test('unreadable JSON falls back', () => {
  const backend = memoryBackend();
  backend.setItem('word-search:key', '{not json');
  assert.equal(createStorage(() => backend).get('key', 'fallback'), 'fallback');
});

test('the default store works without a localStorage (Node, private mode)', () => {
  assert.equal(storage.get('never-saved-key', 7), 7);
});
