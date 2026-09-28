'use strict';

/**
 * All copy in content/site.json is plain text and is escaped on the way out,
 * so an apostrophe or an ampersand in the copy can never break the markup.
 *
 * `md` is the one exception: a deliberately tiny inline-markup pass for body
 * copy, supporting **bold**, *italic*, [text](href) and the :flag-xx: language
 * tokens. It escapes first and only then introduces tags, so it is safe on
 * untrusted-ish content too.
 */

const { flags } = require('./flags.js');

function esc(s) {
  return (
    String(s == null ? '' : s)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      // A straight apostrophe between letters is always a typewriter stand-in
      // (CHEO's, can't, O'Donnell): set the real one. The copy stays as typed.
      .replace(/(\p{L})'(?=\p{L})/gu, '$1\u2019')
  );
}

function attr(s) {
  return esc(s).replace(/"/g, '&quot;');
}

function md(s) {
  // Flags go in last, so the inline-markup rules never see SVG markup.
  return flags(
    esc(s)
      .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (m, text, href) => {
        const external = /^https?:\/\//.test(href);
        const rel = external ? ' target="_blank" rel="noopener"' : '';
        return `<a href="${href.replace(/"/g, '&quot;')}"${rel}>${text}</a>`;
      })
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/(^|[\s(])\*([^*]+)\*/g, '$1<em>$2</em>')
  );
}

/**
 * The site's two arrows, drawn rather than typed: neither U+2192 nor U+2197
 * is in any of the shipped font subsets, so as characters they came from
 * whatever font the operating system had, at its weight and size. Decorative
 * (the link text says where it goes), so hidden from assistive tech.
 */
const ARROWS = {
  right: 'M1.5 6h8.5M6.75 2.75 10 6 6.75 9.25',
  out: 'M2.25 9.75 9.75 2.25M4 2.25h5.75V8',
};
function arrow(dir) {
  return (
    `<svg class="arrow" viewBox="0 0 12 12" aria-hidden="true" focusable="false">` +
    `<path d="${ARROWS[dir]}"/></svg>`
  );
}

// "Phạm Nguyên Khôi" may break after the family name, never inside the given
// name: the last space becomes a no-break space. Typesetting only; the copy in
// site.json is unchanged.
function keepGivenName(name) {
  return String(name).replace(/ (?=\S+$)/, '\u00a0');
}

module.exports = { esc, attr, md, arrow, keepGivenName };
