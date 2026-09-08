'use strict';

/**
 * URL strategy
 * ------------
 * English is the default language and lives at the root. Vietnamese is mirrored
 * under /vi/. Every page is a real directory with its own index.html, so URLs are
 * clean, crawlable, linkable, and work with the browser's back button.
 *
 *   en: /            /about/      /work/      /publications/      /contact/
 *   vi: /vi/         /vi/about/   /vi/work/   /vi/publications/   /vi/contact/
 */

const LANGS = ['en', 'vi'];

// Page key -> path segment. `home` is the language root.
const SEGMENTS = {
  home: '',
  about: 'about',
  work: 'work',
  publications: 'publications',
  contact: 'contact',
};

function urlFor(lang, page) {
  const seg = SEGMENTS[page];
  const prefix = lang === 'en' ? '' : '/' + lang;
  if (!seg) return prefix + '/';
  return prefix + '/' + seg + '/';
}

module.exports = { LANGS, SEGMENTS, urlFor };
