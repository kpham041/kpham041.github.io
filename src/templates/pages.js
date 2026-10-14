'use strict';

const { esc, attr, md, arrow, keepGivenName } = require('./esc.js');
const { urlFor } = require('./routes.js');
const { tone, scene, stamp } = require('./ui.js');
const desk = require('./desk.js');

/* --------------------------------------------------------------- helpers */

// A key/value row list: a stamp label in a fixed column, prose beside it.
function defList(rows) {
  return `<dl class="deflist">
${rows
  .map(
    (r) => `        <div class="deflist__row">
          <dt class="deflist__key"><span class="label">${esc(r.k)}</span></dt>
          <dd class="deflist__val">${md(r.v)}</dd>
        </div>`
  )
  .join('\n')}
      </dl>`;
}

// A page head: the two-tone title and an optional intro. The kicker above the
// title is shown only when it adds something: on every page today it would
// repeat either the title or the nav item already marked as current.
function sectionHead(c, id, navLabel) {
  const same = (a, b) => String(a || '').toLowerCase() === String(b || '').toLowerCase();
  const kicker =
    c.overline && !same(c.overline, c.title) && !same(c.overline, navLabel)
      ? `<p class="overline">${esc(c.overline)}</p>\n        `
      : '';
  return `      <div class="section__head">
        ${kicker}<h1 id="${attr(id)}">${tone(c.title, c.toneWords)}</h1>
        ${c.intro ? `<p class="lead">${md(c.intro)}</p>` : ''}
      </div>`;
}

// Line-breaking at render time; the copy in site.json is never changed.
// "Liu, B. C." stays one unit: no break between a surname and its initials,
// or between initials.
function keepInitials(authors) {
  return String(authors)
    .replace(/(\p{L}), (?=\p{Lu}\.)/gu, '$1, ')
    .replace(/(\p{Lu}\.) (?=\p{Lu}\.)/gu, '$1 ');
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
            <a class="btn btn--ghost" data-page="work" href="${attr(urlFor(lang, 'work'))}">${esc(
      c.ctaSecondary
    )}${arrow('right')}</a>
          </div>
        </div>
        <figure class="hero__figure">
          <div class="print">
            <span class="print__tape" aria-hidden="true"></span>
            <picture>
              <source type="image/webp" srcset="/img/portrait-380.webp 380w, /img/portrait-560.webp 560w, /img/portrait-760.webp 760w" sizes="(max-width: 700px) 176px, 380px">
              <img src="/img/portrait-560.jpg" srcset="/img/portrait-380.jpg 380w, /img/portrait-560.jpg 560w, /img/portrait-760.jpg 760w" sizes="(max-width: 700px) 176px, 380px" width="1024" height="1024" alt="${attr(
                t.ogImageAlt
              )}" fetchpriority="high" decoding="async">
            </picture>
          </div>
        </figure>
      </section>
    </div>

${scene('horizon', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-labelledby="highlights-h">
        <h2 class="visually-hidden" id="highlights-h">${esc(c.highlightsLabel)}</h2>
        ${defList(c.highlights)}
      </section>
    </div>

${scene('wayback', ctx)}`,
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
${sectionHead(c, 'about-h', t.nav.about)}

        <h2 class="overline">${esc(c.factsLabel)}</h2>
        ${defList(c.facts)}
      </section>
    </div>

${scene('river', ctx)}

    <div class="shell">
      <section class="section" aria-labelledby="story-h">
        <h2 class="overline" id="story-h">${esc(c.storyLabel)}</h2>
        <div class="prose">
${c.story.map((p) => `          <p>${md(p)}</p>`).join('\n')}
        </div>

        <div class="section">
          <h2 class="overline">${esc(c.skillsLabel)}</h2>
          <p class="lead">${md(c.skillsIntro)}</p>
          ${defList(skills)}
        </div>
      </section>
    </div>

${scene('hills', ctx)}

    <div class="shell">
${desk(ctx)}
    </div>`,
  };
}

/* ------------------------------------------------------------------ work */

function work(ctx) {
  const { content, lang } = ctx;
  const t = content.i18n[lang];
  const c = t.work;

  const entry = (proj, i) => {
    const p = proj[lang];
    return `        <li class="entry">
          <div class="entry__aside">
            <span class="num" aria-hidden="true">${String(i + 1).padStart(2, '0')}</span>
            <p class="entry__meta"><span class="label">${esc(p.meta)}</span></p>
          </div>
          <div class="entry__body">
            <h2 class="entry__title">${esc(p.title)}</h2>
            <div class="prose">
${p.body.map((para) => `              <p>${md(para)}</p>`).join('\n')}
            </div>
            ${tagRow(p.tags)}
          </div>
        </li>`;
  };

  // The crossing, homeward, sits before the Vietnamese hospital study: the
  // layout tells the biography's direction once, where it is true.
  const projects = content.projects;
  const last = projects.length - 1;
  const firstGroup = projects.slice(0, last).map(entry).join('\n');
  const lastEntry = projects.slice(last).map((p) => entry(p, last)).join('\n');

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="work-h">
${sectionHead(c, 'work-h', t.nav.work)}
      </section>
    </div>

${scene('skyline', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-label="${attr(c.title)}">
        <ul class="entry-list" role="list">
${firstGroup}
        </ul>
      </section>
    </div>

${scene('plane', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-label="${attr(c.title)}">
        <ul class="entry-list entry-list--continued" role="list">
${lastEntry}
        </ul>

        <div class="section">
          <h2 class="overline">${esc(c.speakingLabel)}</h2>
          <p class="lead">${md(c.speakingIntro)}</p>
          ${defList(c.speaking)}
        </div>

        <p class="lead coda">${esc(
          c.closingPre
        )} <a class="link" data-page="contact" href="${attr(urlFor(lang, 'contact'))}">${esc(c.closingLink)}</a></p>
      </section>
    </div>

${scene('wayback', ctx)}`,
  };
}

/* ---------------------------------------------------------- publications */

const STAMP_HUES = ['plum', 'orange', 'teal', 'red'];

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
          )}" target="_blank" rel="noopener">${esc(c.doiLabel)}: ${esc(p.doi)}${arrow('out')}</a></li>`
        );
      }
      return `        <li class="pub">
          <div class="pub__stamp">${stamp(p.year, STAMP_HUES[i % STAMP_HUES.length], i)}</div>
          <div class="pub__body">
            <h2 class="pub__title">${esc(p.title)}</h2>
            <p class="pub__authors">${md(keepInitials(p.authors)).replace(
              /<strong>/g,
              '<strong class="self">'
            )} <span>(${esc(p.year)})</span>. <span class="pub__venue">${esc(p.venue)}</span>.</p>
            ${links.length ? `<ul class="pub__links" role="list">${links.join('')}</ul>` : ''}
          </div>
        </li>`;
    })
    .join('\n');

  return {
    title: c.metaTitle,
    description: c.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="pubs-h">
${sectionHead(c, 'pubs-h', t.nav.publications)}
      </section>
    </div>

${scene('forest', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-label="${attr(c.title)}">
        <ol class="entry-list" role="list">
${items}
        </ol>

        <p class="lead coda">${esc(
          c.moreLabel
        )} <a class="link" href="${attr(scholar.url)}" target="_blank" rel="noopener">${esc(
      scholar.label
    )}${arrow('out')}</a></p>
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
      (l) => `          <li><a class="postcard" href="${attr(l.url)}" target="_blank" rel="noopener me">
            <span class="k">${esc(l.label)}${arrow('out')}</span>
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
${sectionHead(c, 'contact-h', t.nav.contact)}
      </section>
    </div>

${scene('sky', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-label="${attr(c.title)}">
        <h2 class="overline">${esc(c.emailLabel)}</h2>
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
      </section>
    </div>

${scene('post', ctx)}

    <div class="shell">
      <section class="section section--tight" aria-label="${attr(c.elsewhereLabel)}">
${
  links.length
    ? `        <h2 class="overline">${esc(c.elsewhereLabel)}</h2>
        <ul class="linkgrid" role="list">
${linkGrid}
        </ul>`
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
