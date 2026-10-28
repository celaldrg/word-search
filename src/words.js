/**
 * Original word lists: 20 categories, each with an English and a Turkish list of 15 words.
 * Words are written in lowercase and uppercased with the rules of their language
 * (Turkish: i -> İ, ı -> I). No list holds a palindrome or a word that contains another word of
 * the same list (forwards or backwards), so every word of a list can share a puzzle.
 * Pure module.
 */
import { LANGUAGES, toUpperLang } from './text.js';

const CATEGORY_DATA = Object.freeze([
  {
    id: 'animals',
    en: {
      title: 'Animals',
      words: 'tiger zebra giraffe elephant kangaroo penguin dolphin rabbit monkey squirrel badger hedgehog otter falcon camel',
    },
    tr: {
      title: 'Hayvanlar',
      words: 'aslan kaplan zürafa fil maymun tavşan kirpi sincap penguen yunus kartal ceylan deve kanguru timsah',
    },
  },
  {
    id: 'fruits',
    en: {
      title: 'Fruits',
      words: 'apple banana cherry grape lemon mango orange peach pear kiwi plum apricot melon papaya coconut',
    },
    tr: {
      title: 'Meyveler',
      words: 'elma armut kiraz çilek üzüm muz karpuz kavun şeftali incir erik nar ayva mandalina portakal',
    },
  },
  {
    id: 'vegetables',
    en: {
      title: 'Vegetables',
      words: 'carrot potato tomato onion garlic pepper cabbage spinach lettuce celery radish pumpkin broccoli cucumber eggplant',
    },
    tr: {
      title: 'Sebzeler',
      words: 'domates biber patates soğan sarımsak havuç ıspanak marul lahana pırasa patlıcan brokoli salatalık bezelye turp',
    },
  },
  {
    id: 'colors',
    en: {
      title: 'Colors',
      words: 'red blue green yellow purple pink brown black white gray violet indigo maroon crimson turquoise',
    },
    tr: {
      title: 'Renkler',
      words: 'kırmızı mavi yeşil sarı mor pembe turuncu siyah beyaz gri kahverengi lacivert turkuaz bordo eflatun',
    },
  },
  {
    id: 'countries',
    en: {
      title: 'Countries',
      words: 'france germany italy spain japan china brazil canada mexico egypt india kenya norway peru greece',
    },
    tr: {
      title: 'Ülkeler',
      words: 'fransa almanya italya ispanya japonya çin brezilya kanada meksika mısır hindistan kenya norveç peru yunanistan',
    },
  },
  {
    id: 'sports',
    en: {
      title: 'Sports',
      words: 'soccer tennis hockey boxing golf rugby rowing skiing karate cycling archery fencing surfing volleyball cricket',
    },
    tr: {
      title: 'Sporlar',
      words: 'futbol basketbol voleybol tenis yüzme güreş boks golf okçuluk eskrim bisiklet hentbol judo karate atletizm',
    },
  },
  {
    id: 'instruments',
    en: {
      title: 'Instruments',
      words: 'guitar piano violin drums flute trumpet harp cello banjo organ clarinet saxophone tuba ukulele accordion',
    },
    tr: {
      title: 'Müzik Aletleri',
      words: 'gitar piyano keman davul flüt trompet arp viyolonsel bağlama kaval kanun ney saksofon akordeon zurna',
    },
  },
  {
    id: 'kitchen',
    en: {
      title: 'Kitchen',
      words: 'spoon fork knife plate bowl kettle oven toaster blender ladle whisk spatula fridge grater teapot',
    },
    tr: {
      title: 'Mutfak',
      words: 'kaşık çatal bıçak tabak tencere tava fırın çaydanlık bardak rende kepçe tepsi süzgeç buzdolabı sürahi',
    },
  },
  {
    id: 'weather',
    en: {
      title: 'Weather',
      words: 'rain snow wind storm cloud thunder sunshine fog hail frost breeze lightning drizzle blizzard monsoon',
    },
    tr: {
      title: 'Hava Durumu',
      words: 'yağmur kar fırtına bulut kasırga dolu şimşek gökkuşağı güneş ayaz kırağı çiğ sağanak poyraz tipi',
    },
  },
  {
    id: 'sea',
    en: {
      title: 'Sea Life',
      words: 'shark whale octopus squid coral starfish crab lobster seahorse jellyfish oyster clam seal turtle shrimp',
    },
    tr: {
      title: 'Deniz',
      words: 'balina ahtapot yengeç istakoz midye mercan denizatı kalamar karides fok kaplumbağa istiridye levrek hamsi palamut',
    },
  },
  {
    id: 'space',
    en: {
      title: 'Space',
      words: 'planet comet galaxy orbit rocket meteor nebula asteroid satellite eclipse telescope moon saturn jupiter cosmos',
    },
    tr: {
      title: 'Uzay',
      words: 'gezegen göktaşı galaksi yörünge roket bulutsu asteroit uydu teleskop tutulma satürn jüpiter astronot yıldız evren',
    },
  },
  {
    id: 'body',
    en: {
      title: 'Human Body',
      words: 'heart brain lungs liver elbow knee shoulder finger ankle wrist stomach skeleton muscle eyebrow thumb',
    },
    tr: {
      title: 'Vücut',
      words: 'kalp beyin akciğer karaciğer dirsek diz omuz parmak ayak bilek mide kas iskelet dudak kulak',
    },
  },
  {
    id: 'jobs',
    en: {
      title: 'Jobs',
      words: 'doctor teacher farmer pilot chef nurse lawyer baker dentist engineer artist plumber sailor judge architect',
    },
    tr: {
      title: 'Meslekler',
      words: 'doktor öğretmen çiftçi pilot aşçı hemşire avukat fırıncı dişçi mühendis ressam tesisatçı denizci yargıç mimar',
    },
  },
  {
    id: 'transport',
    en: {
      title: 'Transport',
      words: 'train bicycle airplane submarine truck tractor scooter taxi ferry canoe yacht tram helicopter motorbike ambulance',
    },
    tr: {
      title: 'Taşıtlar',
      words: 'tren bisiklet uçak denizaltı kamyon traktör otobüs taksi vapur kano yat tramvay helikopter motosiklet ambulans',
    },
  },
  {
    id: 'clothing',
    en: {
      title: 'Clothing',
      words: 'shirt jacket scarf gloves boots socks sweater dress skirt coat hoodie sandals pajamas belt trousers',
    },
    tr: {
      title: 'Giyim',
      words: 'gömlek ceket atkı eldiven bot çorap hırka elbise etek mont şapka sandalet pijama kemer pantolon',
    },
  },
  {
    id: 'nature',
    en: {
      title: 'Nature',
      words: 'forest river mountain valley meadow canyon island desert volcano glacier waterfall lake cave cliff jungle',
    },
    tr: {
      title: 'Doğa',
      words: 'orman nehir tepe vadi çayır kanyon çöl yanardağ buzul şelale göl mağara uçurum pınar ova',
    },
  },
  {
    id: 'school',
    en: {
      title: 'School',
      words: 'pencil eraser notebook ruler backpack chalk desk library lesson homework exam scissors glue classroom marker',
    },
    tr: {
      title: 'Okul',
      words: 'kalem silgi defter cetvel çanta tebeşir sıra kütüphane ders ödev sınav makas sınıf kitap öğrenci',
    },
  },
  {
    id: 'home',
    en: {
      title: 'Home',
      words: 'kitchen bedroom bathroom garden window door roof stairs sofa pillow blanket curtain carpet mirror lamp',
    },
    tr: {
      title: 'Ev',
      words: 'mutfak yatak banyo bahçe pencere kapı çatı merdiven kanepe yastık battaniye perde halı ayna lamba',
    },
  },
  {
    id: 'feelings',
    en: {
      title: 'Feelings',
      words: 'happy angry proud brave calm scared jealous lonely excited nervous grateful curious hopeful bored cheerful',
    },
    tr: {
      title: 'Duygular',
      words: 'mutlu kızgın gururlu cesur sakin korkmuş kıskanç yalnız heyecanlı gergin minnettar meraklı şaşkın sıkılmış neşeli',
    },
  },
  {
    id: 'technology',
    en: {
      title: 'Technology',
      words: 'computer keyboard mouse screen printer router laptop tablet camera speaker battery charger robot modem server',
    },
    tr: {
      title: 'Teknoloji',
      words: 'bilgisayar klavye fare ekran yazıcı modem dizüstü tablet kamera hoparlör pil robot sunucu yazılım internet',
    },
  },
]);

/**
 * Categories in display order with their titles in one language.
 * @param {'en'|'tr'} lang
 * @returns {{ id: string, title: string }[]}
 */
export function listCategories(lang) {
  if (!LANGUAGES.includes(lang)) throw new Error(`Unknown language "${lang}".`);
  return CATEGORY_DATA.map((category) => ({ id: category.id, title: category[lang].title }));
}

/**
 * One category in one language, its words uppercased with that language's rules.
 * @param {string} lang
 * @param {string} id
 * @returns {{ id: string, title: string, words: string[] } | null} null for an unknown language or id
 */
export function getCategory(lang, id) {
  const category = CATEGORY_DATA.find((entry) => entry.id === id);
  if (!category || !LANGUAGES.includes(lang)) return null;
  const { title, words } = category[lang];
  return { id, title, words: words.split(' ').map((word) => toUpperLang(word, lang)) };
}
