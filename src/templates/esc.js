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
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
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

module.exports = { esc, attr, md };
