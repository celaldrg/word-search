import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ALPHABETS, LANGUAGES, LETTER_FREQUENCIES, compareWords, isInAlphabet, toUpperLang } from '../src/text.js';

test('Turkish uppercase maps i to İ and ı to I', () => {
  assert.equal(toUpperLang('istanbul', 'tr'), 'İSTANBUL');
  assert.equal(toUpperLang('ılık', 'tr'), 'ILIK');
  assert.equal(toUpperLang('ıi', 'tr'), 'Iİ');
  assert.equal(toUpperLang('kiraz', 'tr'), 'KİRAZ');
  assert.equal(toUpperLang('çiğdem şölen üzüm', 'tr'), 'ÇİĞDEM ŞÖLEN ÜZÜM');
  assert.equal(toUpperLang('İZMİR', 'tr'), 'İZMİR');
});

test('English uppercase maps i to I, unlike Turkish', () => {
  assert.equal(toUpperLang('kiwi', 'en'), 'KIWI');
  assert.notEqual(toUpperLang('i', 'en'), toUpperLang('i', 'tr'));
});

test('alphabets: 26 English letters, 29 Turkish letters without Q, W and X', () => {
  assert.equal(ALPHABETS.en.length, 26);
  assert.equal(ALPHABETS.tr.length, 29);
  for (const letter of 'QWX') assert.ok(!ALPHABETS.tr.includes(letter), letter);
  for (const letter of 'ÇĞIİÖŞÜ') assert.ok(ALPHABETS.tr.includes(letter), letter);
  for (const lang of LANGUAGES) {
    assert.equal(new Set(ALPHABETS[lang]).size, ALPHABETS[lang].length);
    assert.ok(ALPHABETS[lang].every((letter) => letter.length === 1));
  }
});

test('every letter of an alphabet, and nothing else, has a positive frequency weight', () => {
  for (const lang of LANGUAGES) {
    assert.deepEqual(Object.keys(LETTER_FREQUENCIES[lang]).sort(), [...ALPHABETS[lang]].sort());
    assert.ok(Object.values(LETTER_FREQUENCIES[lang]).every((weight) => weight > 0));
  }
});

test('isInAlphabet accepts only uppercase letters of the language', () => {
  assert.equal(isInAlphabet('ŞEFTALİ', 'tr'), true);
  assert.equal(isInAlphabet('ŞEFTALİ', 'en'), false);
  assert.equal(isInAlphabet('QUIZ', 'tr'), false);
  assert.equal(isInAlphabet('kiraz', 'tr'), false);
  assert.equal(isInAlphabet('NEW YORK', 'en'), false);
  assert.equal(isInAlphabet('APPLE', 'xx'), false);
});

test('compareWords sorts in each language\'s dictionary order', () => {
  const sortIn = (lang, words) => [...words].sort((a, b) => compareWords(a, b, lang));
  assert.deepEqual(
    sortIn('tr', ['ZEYTİN', 'İNCİR', 'ÇAM', 'IRMAK', 'CAM', 'ARMUT', 'ŞEKER', 'SU']),
    ['ARMUT', 'CAM', 'ÇAM', 'IRMAK', 'İNCİR', 'SU', 'ŞEKER', 'ZEYTİN'],
  );
  assert.deepEqual(sortIn('en', ['PEAR', 'APPLE', 'PEA', 'KIWI']), ['APPLE', 'KIWI', 'PEA', 'PEAR']);
});
