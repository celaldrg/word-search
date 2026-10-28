/**
 * Interface strings in English and Turkish. Pure module: translate() looks a key up and fills
 * in its {placeholders}; the page code puts the result in with textContent.
 */

/** Interface languages; the first one is the default. */
export const UI_LANGUAGES = Object.freeze(['en', 'tr']);

/** Every interface string, by language and key. Both languages have the same keys. */
export const STRINGS = Object.freeze({
  en: Object.freeze({
    'app.title': 'Word Search',
    'app.newGame': 'New game',
    'app.restart': 'Restart',
    'app.langToggle': 'TR',
    'app.langToggleLabel': 'TR – switch to Turkish',
    'stats.time': 'Time',
    'stats.found': 'Found',
    'stats.best': 'Best',
    'stats.noBest': '—',
    'game.hint': 'Hint',
    'board.label':
      'Letter grid. Drag across a word, or move with the arrow keys and press Enter on its first and last letter. Escape cancels.',
    'status.start': 'Drag across a word to mark it, or use the arrow keys and Enter.',
    'status.found': 'Found {word}!',
    'status.repeat': '{word} is already found.',
    'status.miss': 'No hidden word there.',
    'status.hint': 'Hint: {word} starts at the flashing letter.',
    'status.won': 'All words found in {time}!',
    'words.found': '{word}, found',
    'settings.title': 'Puzzle settings',
    'settings.category': 'Category',
    'settings.wordLang': 'Word language',
    'settings.difficulty': 'Difficulty',
    'lang.en': 'English',
    'lang.tr': 'Turkish',
    'level.easy': 'Easy · {size}×{size} · → ↓',
    'level.medium': 'Medium · {size}×{size} · → ↓ ↘ ↗',
    'level.hard': 'Hard · {size}×{size} · all 8 directions',
    'win.title': 'Well done!',
    'win.text': 'You found every word.',
    'win.hints': 'Hints used: {count}',
    'win.newBest': 'New best time!',
    'win.close': 'Close',
    'footer.source': 'Source on GitHub',
  }),
  tr: Object.freeze({
    'app.title': 'Kelime Avı',
    'app.newGame': 'Yeni oyun',
    'app.restart': 'Baştan',
    'app.langToggle': 'EN',
    'app.langToggleLabel': 'EN – İngilizceye geç',
    'stats.time': 'Süre',
    'stats.found': 'Bulunan',
    'stats.best': 'En iyi',
    'stats.noBest': '—',
    'game.hint': 'İpucu',
    'board.label':
      'Harf tablosu. Bir kelimenin üzerinde sürükle ya da ok tuşlarıyla ilerleyip ilk ve son harfinde Enter’a bas. Escape iptal eder.',
    'status.start': 'Bir kelimeyi işaretlemek için üzerinde sürükle ya da ok tuşlarını ve Enter’ı kullan.',
    'status.found': '{word} bulundu!',
    'status.repeat': '{word} zaten bulundu.',
    'status.miss': 'Orada gizli bir kelime yok.',
    'status.hint': 'İpucu: {word} yanıp sönen harften başlıyor.',
    'status.won': 'Bütün kelimeler {time} sürede bulundu!',
    'words.found': '{word}, bulundu',
    'settings.title': 'Bulmaca ayarları',
    'settings.category': 'Kategori',
    'settings.wordLang': 'Kelime dili',
    'settings.difficulty': 'Zorluk',
    'lang.en': 'İngilizce',
    'lang.tr': 'Türkçe',
    'level.easy': 'Kolay · {size}×{size} · → ↓',
    'level.medium': 'Orta · {size}×{size} · → ↓ ↘ ↗',
    'level.hard': 'Zor · {size}×{size} · 8 yönün hepsi',
    'win.title': 'Tebrikler!',
    'win.text': 'Bütün kelimeleri buldun.',
    'win.hints': 'Kullanılan ipucu: {count}',
    'win.newBest': 'Yeni rekor!',
    'win.close': 'Kapat',
    'footer.source': 'Kaynak kodu GitHub’da',
  }),
});

/**
 * Looks up an interface string and fills in its {placeholders}.
 * @param {string} lang Interface language; unknown languages fall back to English.
 * @param {string} key
 * @param {Record<string, string | number>} [params] Values for the placeholders.
 * @returns {string} The English text when the language lacks the key, the key itself when
 *   no language has it.
 */
export function translate(lang, key, params = {}) {
  const table = STRINGS[lang] ?? STRINGS[UI_LANGUAGES[0]];
  const template = table[key] ?? STRINGS[UI_LANGUAGES[0]][key] ?? key;
  return template.replace(/\{(\w+)\}/g, (placeholder, name) =>
    (Object.hasOwn(params, name) ? String(params[name]) : placeholder));
}
