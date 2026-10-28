import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LANGUAGES, isInAlphabet } from '../src/text.js';
import { getCategory, listCategories } from '../src/words.js';

const reverse = (word) => [...word].reverse().join('');

function allLists() {
  return LANGUAGES.flatMap((lang) => listCategories(lang).map(({ id }) => ({ lang, ...getCategory(lang, id) })));
}

test('20 categories, each titled in English and Turkish', () => {
  for (const lang of LANGUAGES) {
    const categories = listCategories(lang);
    assert.equal(categories.length, 20);
    assert.equal(new Set(categories.map(({ id }) => id)).size, 20);
    assert.ok(categories.every(({ title }) => title.trim().length > 0));
  }
  assert.deepEqual(listCategories('tr').map(({ id }) => id), listCategories('en').map(({ id }) => id));
  assert.equal(getCategory('en', 'animals').title, 'Animals');
  assert.equal(getCategory('tr', 'animals').title, 'Hayvanlar');
});

test('every list has 15 distinct uppercase words of 3-10 letters from its alphabet', () => {
  for (const { lang, id, words } of allLists()) {
    assert.equal(words.length, 15, `${lang}/${id}`);
    assert.equal(new Set(words).size, 15, `${lang}/${id}`);
    for (const word of words) {
      assert.ok(word.length >= 3 && word.length <= 10, `${lang}/${id}: ${word}`);
      assert.ok(isInAlphabet(word, lang), `${lang}/${id}: ${word}`);
    }
  }
});

test('no list holds a palindrome or a word inside another word, forwards or backwards', () => {
  for (const { lang, id, words } of allLists()) {
    for (const word of words) {
      assert.notEqual(word, reverse(word), `${lang}/${id}: ${word} is a palindrome`);
      for (const other of words.filter((candidate) => candidate !== word)) {
        assert.ok(!other.includes(word) && !other.includes(reverse(word)), `${lang}/${id}: ${word} in ${other}`);
      }
    }
  }
});

test('Turkish lists are uppercased with Turkish rules and use Turkish letters', () => {
  const fruits = getCategory('tr', 'fruits').words;
  for (const word of ['KİRAZ', 'İNCİR', 'ŞEFTALİ', 'ÇİLEK', 'ÜZÜM']) assert.ok(fruits.includes(word), word);
  const vegetables = getCategory('tr', 'vegetables').words;
  for (const word of ['ISPANAK', 'PIRASA', 'SARIMSAK', 'SOĞAN', 'BİBER']) assert.ok(vegetables.includes(word), word);
  const turkish = allLists().filter(({ lang }) => lang === 'tr').flatMap(({ words }) => words).join('');
  for (const letter of 'ÇĞIİÖŞÜ') assert.ok(turkish.includes(letter), letter);
  assert.doesNotMatch(turkish, /[a-zçğıöşü]/);
});

test('unknown categories and languages', () => {
  assert.equal(getCategory('en', 'dragons'), null);
  assert.equal(getCategory('de', 'animals'), null);
  assert.throws(() => listCategories('de'), /Unknown language "de"/);
});
