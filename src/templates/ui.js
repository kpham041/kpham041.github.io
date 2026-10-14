'use strict';

/**
 * The poster-board furniture: the pieces of markup that make the site look
 * hand-finished. Each one is a small function so the pages stay readable.
 *
 *   tone()    the two-tone heading: the last words take the page colour and a
 *             highlighter stroke runs under them, below the baseline
 *   scene()   an inline SVG landscape from src/templates/svg/, with its pen
 *             notes filled in from site.json
 *   stamp()   the serrated postage stamp that carries a paper's year
 *   roughDefs the one SVG filter that paints the edge of every sticker
 */

const fs = require('fs');
const path = require('path');
const { esc, attr } = require('./esc.js');

const SVG_DIR = path.join(__dirname, 'svg');

/**
 * Wrap the last `n` space-separated words of a title in the tone span. With
 * n = 0 the whole title keeps its ink and only the stroke is drawn: a
 * single-concept title such as "Giới thiệu" is never split into two colours.
 * The count lives in site.json beside each title, so Vietnamese and English
 * each say where their own break goes.
 */
function tone(title, n) {
  const words = String(title).split(' ');
  const count = Number.isInteger(n) ? n : 1;
  if (count <= 0 || count >= words.length) {
    return `<span class="tone tone--ink">${esc(title)}</span>`;
  }
  const head = words.slice(0, words.length - count).join(' ');
  const tail = words.slice(words.length - count).join(' ');
  // A no-break space before the tone keeps the coloured words on the line
  // with at least one ink word, so a tone never starts a line on its own.
  return `${esc(head)} <span class="tone">${esc(tail)}</span>`;
}

/**
 * Read a landscape fragment and fill its placeholders. Missing files render
 * nothing, so a page never breaks while a drawing is still being made.
 *
 *   __NOTE_x__   pen notes from i18n.<lang>.notes
 *   __HREF_x__ / __LINK_x__   the two home links on the 404 signpost
 */
function scene(name, ctx, opts) {
  const file = path.join(SVG_DIR, name + '.svg');
  if (!fs.existsSync(file)) return '';
  let svg = fs.readFileSync(file, 'utf8').trim();
  const t = ctx.content.i18n[ctx.lang];
  const notes = (t && t.notes) || {};
  svg = svg.replace(/__NOTE_([a-z]+)__/g, (m, k) => esc(notes[k] || ''));
  if (opts && opts.links) {
    for (const [k, v] of Object.entries(opts.links)) {
      svg = svg.split(`__HREF_${k}__`).join(attr(v.href)).split(`__LINK_${k}__`).join(esc(v.label));
    }
  }
  const cls = ['scene', `scene--${name}`, opts && opts.className].filter(Boolean).join(' ');
  return `<div class="${cls}">${svg}</div>`;
}

/**
 * A 64x64 postage stamp: a serrated edge cut by a mask of half-circle bites
 * every 8 units, the paper tinted in the venue's colour, a thin inner frame,
 * and the year. `i` keeps the mask id unique on a page with several stamps.
 */
function stamp(year, hue, i) {
  const bites = [];
  for (let p = 4; p <= 60; p += 8) {
    bites.push(`<circle cx="${p}" cy="0" r="3.2"/><circle cx="${p}" cy="64" r="3.2"/>`);
    bites.push(`<circle cx="0" cy="${p}" r="3.2"/><circle cx="64" cy="${p}" r="3.2"/>`);
  }
  const id = `stamp-${i}`;
  return (
    `<svg class="stamp stamp--${attr(hue)}" viewBox="0 0 64 64" width="64" height="64" aria-hidden="true" focusable="false">` +
    `<mask id="${id}"><rect width="64" height="64" fill="#fff"/><g fill="#000">${bites.join('')}</g></mask>` +
    `<rect class="stamp__paper" width="64" height="64" mask="url(#${id})"/>` +
    `<rect class="stamp__frame" x="7.5" y="7.5" width="49" height="49"/>` +
    `<text class="stamp__year" x="32" y="40" text-anchor="middle">${esc(year)}</text>` +
    `</svg>`
  );
}

/**
 * The painted edge. One displacement filter, declared once per page, that
 * every sticker's background layer runs through. The filter region is widened
 * so the displaced edge is never clipped (Safari clips at the default 10%).
 */
const roughDefs =
  `<svg width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute">` +
  `<filter id="rough" x="-12%" y="-20%" width="124%" height="140%" color-interpolation-filters="sRGB">` +
  `<feTurbulence type="fractalNoise" baseFrequency="0.05" numOctaves="3" seed="3" result="n"/>` +
  `<feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G"/>` +
  `</filter></svg>`;

module.exports = { tone, scene, stamp, roughDefs };
