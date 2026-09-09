'use strict';

const { esc, attr, md } = require('./esc.js');
const { urlFor } = require('./routes.js');
const desk = require('./desk.js');

/* --------------------------------------------------------------- helpers */

// A key/value row list: mono label in a fixed column, prose beside it.
function defList(rows, opts) {
  const o = opts || {};
  return `<dl class="deflist">
${rows
  .map(
    (r, i) => `        <div class="deflist__row"${
      o.reveal === false ? '' : ` data-reveal="${i}"`
    }>
          <dt class="deflist__key">${esc(r.k)}</dt>
          <dd class="deflist__val">${md(r.v)}</dd>
        </div>`
  )
  .join('\n')}
      </dl>`;
}

function sectionHead(overline, title, id, lead) {
  // An overline that just repeats the heading is noise, so drop it.
  const kicker =
    overline && overline.toLowerCase() !== title.toLowerCase()
      ? `<p class="overline" data-reveal="0">${esc(overline)}</p>\n        `
      : '';
  return `      <div class="section__head">
        ${kicker}<h1 id="${attr(id)}" data-reveal="1">${esc(title)}</h1>
        ${lead ? `<p class="lead" data-reveal="2">${md(lead)}</p>` : ''}
      </div>`;
}

function tagRow(tags) {
  if (!tags || !tags.length) return '';
  return `<ul class="tag-row" role="list">${tags
    .map((t) => `<li class="tag">${esc(t)}</li>`)
    .join('')}</ul>`;
}

/* ------------------------------------------------------------------ home */

function home(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.home;
  const site = content.site;

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    ogType: 'profile',
    body: `    <div class="shell">
      <section class="hero" aria-labelledby="hero-name">
        <div class="hero__text">
          <h1 class="hero__name" id="hero-name" data-reveal="0">
            <span lang="vi">${esc(site.nameVi)}</span>
            <span class="hero__latin">${esc(site.name)}</span>
          </h1>
          <p class="hero__role" data-reveal="1">${md(c.role)}</p>
          <p class="hero__blurb" data-reveal="2">${md(c.blurb)}</p>
          <div class="hero__actions" data-reveal="3">
            <a class="btn btn--primary" href="${attr(urlFor(lang, 'contact'))}">${esc(
      c.ctaPrimary
    )}</a>
            <a class="link" href="${attr(urlFor(lang, 'work'))}">${esc(c.ctaSecondary)} &rarr;</a>
          </div>
        </div>
        <figure class="hero__figure" data-reveal="1">
          <picture>
            <source type="image/webp" srcset="/img/portrait-380.webp 380w, /img/portrait-560.webp 560w, /img/portrait-760.webp 760w" sizes="(max-width: 860px) 260px, 380px">
            <img src="/img/portrait-560.jpg" srcset="/img/portrait-380.jpg 380w, /img/portrait-560.jpg 560w, /img/portrait-760.jpg 760w" sizes="(max-width: 860px) 260px, 380px" width="1024" height="1024" alt="${attr(
              t.ogImageAlt
            )}" fetchpriority="high" decoding="async">
          </picture>
        </figure>
      </section>

      <section class="section section--tight" aria-labelledby="highlights-h">
        <h2 class="visually-hidden" id="highlights-h">${esc(c.highlightsLabel)}</h2>
        ${defList(c.highlights)}
      </section>
    </div>`,
  };
}

/* ----------------------------------------------------------------- about */

function about(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.about;
  const skills = content.skills[lang];

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    ogType: 'profile',
    extraScripts: '<script src="/assets/js/desk.js" defer></script>',
    head: '<link rel="stylesheet" href="/assets/css/desk.css">',
    body: `    <div class="shell">
      <section class="section" aria-labelledby="about-h">
${sectionHead(c.overline, c.title, 'about-h')}

        <h2 class="overline" data-reveal="0">${esc(c.factsLabel)}</h2>
        ${defList(c.facts)}

        <div class="section" style="padding-bottom:0">
          <h2 class="overline" data-reveal="0">${esc(c.storyLabel)}</h2>
          <div class="prose" style="margin-top:var(--space-m)">
${c.story.map((p, i) => `            <p data-reveal="${i}">${md(p)}</p>`).join('\n')}
          </div>
        </div>

        <div class="section">
          <h2 class="overline" data-reveal="0">${esc(c.skillsLabel)}</h2>
          <p class="lead" data-reveal="1" style="margin-top:.6rem">${md(c.skillsIntro)}</p>
          <div style="margin-top:var(--space-m)">${defList(skills)}</div>
        </div>
      </section>

${desk(ctx)}
    </div>`,
  };
}

/* ------------------------------------------------------------------ work */

function work(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.work;

  const entries = content.projects
    .map((proj, i) => {
      const p = proj[lang];
      return `        <li class="entry" data-reveal="${i}">
          <p class="entry__meta">${esc(p.meta)}</p>
          <div class="entry__body">
            <h2 class="entry__title">${esc(p.title)}</h2>
            <div class="prose">
${p.body.map((para) => `              <p>${md(para)}</p>`).join('\n')}
            </div>
            ${tagRow(p.tags)}
          </div>
        </li>`;
    })
    .join('\n');

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="work-h">
${sectionHead(c.overline, c.title, 'work-h', c.intro)}

        <ul class="entry-list" role="list">
${entries}
        </ul>

        <div class="section">
          <h2 class="overline" data-reveal="0">${esc(c.speakingLabel)}</h2>
          <p class="lead" data-reveal="1" style="margin-top:.6rem">${md(c.speakingIntro)}</p>
          <div style="margin-top:var(--space-m)">${defList(c.speaking)}</div>
        </div>

        <p class="lead" data-reveal="0" style="margin-top:var(--space-l)">${esc(
          c.closingPre
        )} <a class="link" href="${attr(urlFor(lang, 'contact'))}">${esc(c.closingLink)}</a></p>
      </section>
    </div>`,
  };
}

/* ---------------------------------------------------------- publications */

function publications(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.publications;
  const scholar = content.profile.links.scholar;

  const items = content.publications
    .map((p, i) => {
      const links = [];
      if (p.doi) {
        links.push(
          `<li><a class="link" href="https://doi.org/${attr(
            p.doi
          )}" target="_blank" rel="noopener">${esc(c.doiLabel)}: ${esc(p.doi)} &nearr;</a></li>`
        );
      }
      return `        <li class="pub" data-reveal="${i}">
          <h2 class="pub__title">${esc(p.title)}</h2>
          <p class="pub__authors">${md(p.authors).replace(
            /<strong>/g,
            '<strong class="self">'
          )} <span>(${esc(p.year)})</span>. <span class="pub__venue">${esc(p.venue)}</span>.</p>
          ${links.length ? `<ul class="pub__links" role="list">${links.join('')}</ul>` : ''}
        </li>`;
    })
    .join('\n');

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="pubs-h">
${sectionHead(c.overline, c.title, 'pubs-h', c.intro)}

        <ol class="entry-list" role="list">
${items}
        </ol>

        <p class="lead" data-reveal="0" style="margin-top:var(--space-l)">${esc(
          c.moreLabel
        )} <a class="link" href="${attr(scholar.url)}" target="_blank" rel="noopener">${esc(
      scholar.label
    )} &nearr;</a></p>
      </section>
    </div>`,
  };
}

/* --------------------------------------------------------------- contact */

function contact(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.contact;
  const profile = content.profile;

  // An empty url means "not set up yet", so the entry is skipped rather than
  // shipped as a dead link.
  const links = Object.values(profile.links).filter((l) => l && l.url);
  const linkGrid = links
    .map(
      (l) => `          <li><a href="${attr(l.url)}" target="_blank" rel="noopener me">
            <span class="k">${esc(l.label)} &nearr;</span>
            <span class="v">${esc(l.note[lang])}</span>
          </a></li>`
    )
    .join('\n');

  const cv = profile.cv && profile.cv.url;

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="contact-h">
${sectionHead(c.overline, c.title, 'contact-h', c.intro)}

        <p class="overline" data-reveal="0">${esc(c.emailLabel)}</p>
        <p style="margin-top:.5rem" data-reveal="1">
          <a class="contact-email link" href="mailto:${attr(profile.email)}">${esc(
      profile.email
    )}</a>
        </p>
${
  cv
    ? `        <p style="margin-top:var(--space-l)" data-reveal="2"><a class="btn btn--ghost" href="${attr(
        profile.cv.url
      )}">CV (PDF)</a></p>`
    : ''
}
${
  links.length
    ? `        <h2 class="overline" style="margin-top:var(--space-xl)" data-reveal="0">${esc(
        c.elsewhereLabel
      )}</h2>
        <ul class="linkgrid" role="list">
${linkGrid}
        </ul>`
    : ''
}
        <hr class="rule" style="margin-top:var(--space-xl);max-width:var(--measure)">
        <p style="margin-top:var(--space-m);color:var(--muted);max-width:var(--measure)">${md(
          c.muted
        )}</p>
      </section>
    </div>`,
  };
}

module.exports = { home, about, work, publications, contact };
