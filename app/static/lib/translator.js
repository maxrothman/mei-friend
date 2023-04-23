/**
 * Applies language packs to GUI elements
 *
 */

export var defaultLangCode = 'en';
export var defaultLang; // global object for default (English) language pack
export var langCode = '';
export var lang = {}; // global lang object from language pack files

import * as l from '../lang/lang.en.js';
lang = { ...l.lang };

/**
 * Change language of mei-friend GUI and refresh all menu items
 * @param {string} languageCode
 */
export function changeLanguage(languageCode) {
  if (!defaultLang) {
    loadDefaultLanguage('en', languageCode);
  } else {
    // change language, only if not default and different from current lang pack
    if (languageCode !== defaultLangCode && languageCode !== langCode) {
      const languagePack = '../lang/lang.' + languageCode + '.js';
      console.log('Loading language pack: ', languagePack);
      import(languagePack).then((p) => {
        for (let key in p.lang) lang[key] = p.lang[key];
        console.log('Language pack loaded: ' + languageCode + ', now translating.');
        translateGui();
      });
    } else if (languageCode === defaultLangCode) {
      for (let key in defaultLang) lang[key] = defaultLang[key];
      console.log('Translating back to default language: ' + defaultLangCode);
      translateGui();
    }
    langCode = languageCode;
  }
} // changeLanguage()

/**
 * Returns promise for importing the language pack for the language code
 * @param {string} languageCode 
 */
export async function requestLanguagePack(languageCode) {
  const languagePack = '../lang/lang.' + languageCode + '.js';
  console.log('Loading language pack: ', languagePack);
  return import(languagePack);
} // 

/**
 * Load default language pack (English), and change language thereafter (if second argument provided)
 * @param {string} languageCode
 * @param {string} languageCodeToloadThereafter
 */
function loadDefaultLanguage(languageCode = defaultLangCode, languageCodeToloadThereafter = '') {
  const languagePack = '../lang/lang.' + languageCode + '.js';
  console.log('Loading default language pack: ', languagePack);
  import(languagePack).then((p) => {
    defaultLang = p.lang;
    console.log('Default language pack loaded: ', languagePack);
    // change to language after loading, if provided
    if (languageCodeToloadThereafter) {
      changeLanguage(languageCodeToloadThereafter);
    }
  });
} // loadDefaultLanguage()

/**
 * Refresh language of all mei-friend GUI items
 */
export function translateGui() {
  const v = false; // debug verbosity
  for (let key in lang) {
    let el = document.getElementById(key);
    if (el) {
      if (v) console.log('key: ' + key + ' nodeName: ' + el.nodeName + ', el: ', el);
      if (el.closest('div.optionsItem')) {
        // for settings items
        if (el.nodeName.toLowerCase() === 'select' && 'labels' in lang[key]) {
          // modify values for select inputs
          el.childNodes.forEach((opt, i) => {
            if (i < lang[key].labels.length) opt.textContent = lang[key].labels[i];
          });
        }
        if (el.nodeName.toLowerCase() === 'input' && el.getAttribute('type') === 'button') {
          if (v) console.log('Found button: ', el);
        } else {
          el = el.parentElement.querySelector('label');
          if (v) console.log('Found label: ', el);
        }
      } else if (el.nodeName.toLowerCase() === 'details') {
        // for settings headers with details and summary
        el = el.querySelector('summary');
        if (v) console.log('Found summary: ', el);
      }
      // plus for all other items (menu items etc.)
      if (el) {
        if ('text' in lang[key]) {
          if (el.nodeName.toLowerCase() === 'input' && el.getAttribute('type') === 'button') {
            el.value = lang[key].text;
          } else {
            el.textContent = lang[key].text;
          }
        }
        if ('description' in lang[key]) el.title = lang[key].description;
      }
    }
  }
} // translateGui()
