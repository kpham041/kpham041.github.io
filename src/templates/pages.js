'use strict';

const { esc, attr, md } = require('./esc.js');
const { urlFor } = require('./routes.js');
const desk = require('./desk.js');

/* --------------------------------------------------------------- helpers */

// A key/value row list: mono label in a fixed column, prose beside it.
function defList(rows) {
  return `<dl class="deflist">
${rows
  .map(
    (r) => `        <div class="deflist__row">
          <dt class="deflist__key">${esc(r.k)}</dt>
          <dd class="deflist__val">${md(r.v)}</dd>
        </div>`
  )
  .join('\n')}
      </dl>`;
}

// A page head: title and optional intro. The kicker above the title is shown
// only when it adds something. On every page today it would repeat either the
// title or the nav item already marked as current, and a kicker on some pages
// but not others moved the title 30px as you navigated, so it is dropped in
// both cases. The words stay in site.json.
function sectionHead(overline, title, id, lead, navLabel) {
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  const kicker =
    overline && !same(overline, title) && !same(overline, navLabel)
      ? `<p class="overline">${esc(overline)}</p>\n        `
      : '';
  return `      <div class="section__head">
        ${kicker}<h1 id="${attr(id)}">${esc(title)}</h1>
        ${lead ? `<p class="lead">${md(lead)}</p>` : ''}
      </div>`;
}

// Line-breaking at render time; the copy in site.json is never changed.
// "Phạm Nguyên Khôi" may break after the family name, never inside the given name.
function keepGivenName(name) {
  return String(name).replace(/ (?=\S+$)/, '\u00a0');
}

// "Liu, B. C." stays one unit: no break between a surname and its initials,
// or between initials.
function keepInitials(authors) {
  return String(authors)
    .replace(/(\p{L}), (?=\p{Lu}\.)/gu, '$1,\u00a0')
    .replace(/(\p{Lu}\.) (?=\p{Lu}\.)/gu, '$1\u00a0');
}

// An address may break after the @ and nowhere else.
function emailBreakable(email) {
  const at = String(email).lastIndexOf('@');
  return at < 0 ? esc(email) : `${esc(email.slice(0, at + 1))}<wbr>${esc(email.slice(at + 1))}`;
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
          <h1 class="hero__name" id="hero-name">
            <span lang="vi">${esc(keepGivenName(site.nameVi))}</span>
            <span class="hero__latin">${esc(site.name)}</span>
          </h1>
          <p class="hero__role">${md(c.role)}</p>
          <p class="hero__blurb">${md(c.blurb)}</p>
          <div class="hero__actions">
            <a class="btn btn--primary" href="${attr(urlFor(lang, 'contact'))}">${esc(
      c.ctaPrimary
    )}</a>
            <a class="link" href="${attr(urlFor(lang, 'work'))}">${esc(c.ctaSecondary)} &rarr;</a>
          </div>
        </div>
        <figure class="hero__figure">
          <picture>
            <source type="image/webp" srcset="/img/portrait-380.webp 380w, /img/portrait-560.webp 560w, /img/portrait-760.webp 760w" sizes="(max-width: 700px) 260px, 380px">
            <img src="/img/portrait-560.jpg" srcset="/img/portrait-380.jpg 380w, /img/portrait-560.jpg 560w, /img/portrait-760.jpg 760w" sizes="(max-width: 700px) 260px, 380px" width="1024" height="1024" alt="${attr(
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
${sectionHead(c.overline, c.title, 'about-h', null, t.nav.about)}

        <h2 class="overline">${esc(c.factsLabel)}</h2>
        ${defList(c.facts)}

        <div class="section">
          <h2 class="overline">${esc(c.storyLabel)}</h2>
          <div class="prose">
${c.story.map((p, i) => `            <p>${md(p)}</p>`).join('\n')}
          </div>
        </div>

        <div class="section">
          <h2 class="overline">${esc(c.skillsLabel)}</h2>
          <p class="lead">${md(c.skillsIntro)}</p>
          ${defList(skills)}
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
      return `        <li class="entry">
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
${sectionHead(c.overline, c.title, 'work-h', c.intro, t.nav.work)}

        <ul class="entry-list" role="list">
${entries}
        </ul>

        <div class="section">
          <h2 class="overline">${esc(c.speakingLabel)}</h2>
          <p class="lead">${md(c.speakingIntro)}</p>
          ${defList(c.speaking)}
        </div>

        <p class="lead coda">${esc(
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
      return `        <li class="pub">
          <h2 class="pub__title">${esc(p.title)}</h2>
          <p class="pub__authors">${md(keepInitials(p.authors)).replace(
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
${sectionHead(c.overline, c.title, 'pubs-h', c.intro, t.nav.publications)}

        <ol class="entry-list" role="list">
${items}
        </ol>

        <p class="lead coda">${esc(
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
${sectionHead(c.overline, c.title, 'contact-h', c.intro, t.nav.contact)}

        <p class="overline">${esc(c.emailLabel)}</p>
        <p>
          <a class="contact-email link" href="mailto:${attr(profile.email)}">${emailBreakable(
      profile.email
    )}</a>
        </p>
${
  cv
    ? `        <p class="coda"><a class="btn btn--ghost" href="${attr(
        profile.cv.url
      )}">CV (PDF)</a></p>`
    : ''
}
${
  links.length
    ? `        <div class="section">
          <h2 class="overline">${esc(c.elsewhereLabel)}</h2>
          <ul class="linkgrid" role="list">
${linkGrid}
          </ul>
        </div>`
    : ''
}
        <div class="section">
          <p class="aside">${md(c.muted)}</p>
        </div>
      </section>
    </div>`,
  };
}

module.exports = { home, about, work, publications, contact };
