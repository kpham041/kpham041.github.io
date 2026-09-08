'use strict';

const fs = require('fs');
const path = require('path');
const { esc, attr, md } = require('./esc.js');

const DEFS = fs.readFileSync(path.join(__dirname, 'svg', 'desk-defs.svg'), 'utf8');
const SCENE_RAW = fs.readFileSync(path.join(__dirname, 'svg', 'desk-scene.svg'), 'utf8');

/**
 * The desk scene: an illustrated workspace where every object opens a panel.
 *
 * Ported from the original canvas artboard. Three things changed in the port:
 *
 *   1. Hotspots are SVG <a href="#desk-…"> instead of <g role="button">, so they
 *      are natively focusable, keyboard-operable, and work with JavaScript off.
 *   2. The phin-coffee symbol was defined but never placed in the original,
 *      leaving the "writing" panel unreachable. It now has a spot on the desk.
 *   3. Every panel's content is real HTML in the page, not a JS-only string, so
 *      it is crawlable and readable without the modal.
 */
module.exports = function desk(ctx) {
  const { content, lang } = ctx;
  const d = content.desk[lang];
  const order = content.desk.order;

  // Hotspot accessible names come from the panel titles — one source of truth.
  let scene = SCENE_RAW;
  for (const id of order) {
    const panel = d.panels[id];
    scene = scene.split('__LABEL_' + id + '__').join(attr(d.openLabel.replace('%s', panel.title)));
  }

  const tiles = order
    .map((id) => {
      const p = d.panels[id];
      const s = content.desk.symbols[id];
      return `        <a class="desk__tile" href="#desk-${attr(id)}" data-panel="${attr(id)}">
          <svg viewBox="${attr(s.viewBox)}" aria-hidden="true" focusable="false"><use href="#${attr(
        s.symbol
      )}"></use></svg>
          <span>${esc(p.title)}</span>
        </a>`;
    })
    .join('\n');

  const indexLinks = order
    .map(
      (id) =>
        `<a class="link" href="#desk-${attr(id)}" data-panel="${attr(id)}">${esc(
          d.panels[id].title
        )}</a>`
    )
    .join('\n        ');

  const panels = order
    .map((id) => {
      const p = d.panels[id];
      const items = p.items
        .map(
          (it) => `          <div class="desk__row">
            ${it.label ? `<div class="desk__rowkey">${esc(it.label)}</div>` : ''}
            <p class="desk__rowtext">${md(it.text)}</p>
          </div>`
        )
        .join('\n');
      return `      <article class="desk__panel" id="desk-${attr(id)}" data-panel="${attr(id)}"
        aria-labelledby="desk-${attr(id)}-title">
        <p class="desk__kicker">${esc(p.kicker)}</p>
        <h3 class="desk__title" id="desk-${attr(id)}-title">${esc(p.title)}</h3>
        ${p.intro ? `<p class="desk__intro">${md(p.intro)}</p>` : ''}
        <div class="desk__rows">
${items}
        </div>
        ${
          p.updated
            ? `<p class="desk__updated">${esc(p.updatedLabel)} ${esc(p.updated)}</p>`
            : ''
        }
      </article>`;
    })
    .join('\n');

  return `<section class="desk" aria-labelledby="desk-h" data-desk>
  <div class="desk__head">
    <p class="overline">${esc(d.overline)}</p>
    <h2 id="desk-h">${esc(d.heading)}</h2>
    <p class="lead">${esc(d.subcopy)}</p>
  </div>

  <div class="desk__scene">
    <!-- role="group", not role="img": the scene contains nine real links, and
         role="img" would make the whole subtree presentational to assistive
         tech, hiding every one of them. -->
    <p class="visually-hidden" id="desk-scene-desc">${esc(d.sceneAlt)}</p>
    <svg viewBox="0 0 1600 630" class="desk__svg" role="group"
      aria-label="${attr(d.sceneLabel)}" aria-describedby="desk-scene-desc">
      ${DEFS}
${scene}
    </svg>
    <p class="desk__annotation" aria-hidden="true">${esc(d.annotation)}</p>
  </div>

  <div class="desk__tiles">
${tiles}
  </div>

  <nav class="desk__index" aria-label="${attr(d.indexLabel)}">
    <span class="desk__indexlabel">${esc(d.indexLabel)}</span>
    <div class="desk__indexlinks">
        ${indexLinks}
    </div>
  </nav>

  <div class="desk__panels">
${panels}
  </div>

  <dialog class="desk__dialog" data-desk-dialog aria-label="${attr(d.dialogLabel)}">
    <button class="desk__close" type="button" data-desk-close aria-label="${attr(d.closeLabel)}">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
    </button>
    <div class="desk__dialogbody" data-desk-dialogbody></div>
  </dialog>
</section>`;
};
