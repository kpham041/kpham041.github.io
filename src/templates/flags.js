'use strict';

/**
 * The three flags for the three languages.
 *
 * Drawn as inline SVG rather than written as emoji, because Windows ships no
 * flag glyphs at all: 🇻🇳 renders there as the letters VN in a box, which looks
 * like a bug. SVG looks the same everywhere and costs nothing extra to load.
 *
 * Any copy string in content/site.json may carry a :flag-vi:, :flag-en: or
 * :flag-fr: token. Vietnamese, English, French, always in that order, the order
 * Michael learned them in.
 *
 * The flags are decorative: the language is named in the text beside them, so
 * they carry no accessible name and screen readers skip straight to the word.
 */

// Union Jack, drawn with the saltire centred rather than counterchanged. The
// real offset is invisible below about 24px and doubles the path count.
const UK = `<rect width="30" height="20" fill="#012169"/>
<path d="M0 0 30 20M30 0 0 20" stroke="#fff" stroke-width="4"/>
<path d="M0 0 30 20M30 0 0 20" stroke="#c8102e" stroke-width="2"/>
<path d="M15 0V20M0 10H30" stroke="#fff" stroke-width="6.6"/>
<path d="M15 0V20M0 10H30" stroke="#c8102e" stroke-width="4"/>`;

const VN = `<rect width="30" height="20" fill="#da251d"/>
<path fill="#ff0" d="M15 4 16.35 8.15H20.71L17.18 10.71 18.53 14.85 15 12.29 11.47 14.85 12.82 10.71 9.29 8.15H13.65Z"/>`;

const FR = `<rect width="10" height="20" fill="#002654"/>
<rect x="10" width="10" height="20" fill="#fff"/>
<rect x="20" width="10" height="20" fill="#ce1126"/>`;

const FLAGS = { vi: VN, en: UK, fr: FR };

const TOKEN = /:flag-(vi|en|fr):\s*/g;

function flag(code) {
  return (
    `<span class="flag" aria-hidden="true">` +
    `<svg viewBox="0 0 30 20" focusable="false">${FLAGS[code]}</svg>` +
    `</span>`
  );
}

/** Replaces every :flag-xx: token in an already-escaped string. */
function flags(html) {
  return String(html == null ? '' : html).replace(TOKEN, (m, code) => flag(code));
}

/** Strips the tokens instead, for places that take plain text (alt, aria-label). */
function stripFlags(text) {
  return String(text == null ? '' : text).replace(TOKEN, '');
}

module.exports = { flags, stripFlags, FLAGS };
