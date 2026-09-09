'use strict';

const { LANGS, urlFor } = require('./routes.js');
const { esc, attr } = require('./esc.js');

const NAV_PAGES = ['about', 'work', 'publications', 'contact'];

/**
 * Wraps a page's body HTML in the shared document shell: head metadata,
 * header, mobile drawer, footer, and scripts.
 *
 * Expects: { content, lang, page, title, description, body, ogType }
 */
module.exports = function layout(ctx) {
  const { content, lang, page, body } = ctx;
  const t = content.i18n[lang];
  const site = content.site;
  const profile = content.profile;

  const path = urlFor(lang, page);
  const canonical = site.url + path;
  const title = ctx.title;
  const fullTitle = page === 'home' ? `${title}` : `${title} · ${site.name}`;
  const description = ctx.description;
  const ogImage = site.url + '/img/og-' + lang + '.png';

  // hreflang: every page exists in both languages at a predictable URL.
  const alternates = LANGS.map(
    (l) =>
      `  <link rel="alternate" hreflang="${l === 'vi' ? 'vi-VN' : 'en'}" href="${attr(
        site.url + urlFor(l, page)
      )}">`
  ).join('\n');

  const navHtml = NAV_PAGES.map((p) => {
    const current = p === page;
    return `<a class="nav__link" href="${attr(urlFor(lang, p))}"${
      current ? ' aria-current="page"' : ''
    }>${esc(t.nav[p])}</a>`;
  }).join('\n        ');

  const drawerNavHtml = NAV_PAGES.map((p) => {
    const current = p === page;
    return `<a href="${attr(urlFor(lang, p))}"${current ? ' aria-current="page"' : ''}>${esc(
      t.nav[p]
    )}</a>`;
  }).join('\n          ');

  const langSwitch = LANGS.map((l) => {
    const isCurrent = l === lang;
    const label = l === 'en' ? 'EN' : 'VI';
    return `<a href="${attr(urlFor(l, page))}" lang="${l}" hreflang="${l}"${
      isCurrent ? ' aria-current="true"' : ''
    } title="${attr(t.langNames[l])}">${label}</a>`;
  }).join('<span class="langswitch__sep" aria-hidden="true">|</span>');

  const footerNav = ['home', ...NAV_PAGES]
    .map((p) => `<a href="${attr(urlFor(lang, p))}">${esc(t.nav[p])}</a>`)
    .join('\n            ');

  // JSON-LD. Only facts that appear on the site itself go in here.
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: site.name,
    alternateName: site.nameVi,
    url: site.url + urlFor(lang, 'home'),
    image: site.url + '/img/portrait-760.jpg',
    email: 'mailto:' + profile.email,
    jobTitle: t.jsonLdJobTitle,
    worksFor: {
      '@type': 'Organization',
      name: 'CHEO Research Institute, Clinical Research Unit',
      url: 'https://www.cheoresearch.ca/',
    },
    alumniOf: { '@type': 'CollegeOrUniversity', name: 'University of Ottawa' },
    knowsLanguage: ['vi', 'en', 'fr'],
    address: { '@type': 'PostalAddress', addressLocality: 'Ottawa', addressRegion: 'ON', addressCountry: 'CA' },
    sameAs: Object.values(profile.links)
      .filter((l) => l && l.url)
      .map((l) => l.url),
  };

  return `<!doctype html>
<html lang="${attr(lang === 'vi' ? 'vi' : 'en')}" class="no-js">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${esc(fullTitle)}</title>
  <meta name="description" content="${attr(description)}">
  <link rel="canonical" href="${attr(canonical)}">
${alternates}
  <link rel="alternate" hreflang="x-default" href="${attr(site.url + urlFor('en', page))}">

  <!-- The site opens light whatever the OS prefers; site.js repaints this
       when the reader turns dark mode on. -->
  <meta name="theme-color" content="#fbfaf7">
  <meta name="color-scheme" content="light">

  <meta property="og:type" content="${attr(ctx.ogType || 'website')}">
  <meta property="og:site_name" content="${attr(site.name)}">
  <meta property="og:locale" content="${attr(lang === 'vi' ? 'vi_VN' : 'en_CA')}">
  <meta property="og:title" content="${attr(fullTitle)}">
  <meta property="og:description" content="${attr(description)}">
  <meta property="og:url" content="${attr(canonical)}">
  <meta property="og:image" content="${attr(ogImage)}">
  <meta property="og:image:width" content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:image:alt" content="${attr(t.ogImageAlt)}">
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:title" content="${attr(fullTitle)}">
  <meta name="twitter:description" content="${attr(description)}">
  <meta name="twitter:image" content="${attr(ogImage)}">

  <link rel="icon" href="/favicon.ico" sizes="32x32">
  <link rel="icon" href="/favicon.svg" type="image/svg+xml">
  <link rel="apple-touch-icon" href="/img/icon-180.png">
  <link rel="manifest" href="/site.webmanifest">

  <link rel="preload" href="/assets/fonts/fraunces-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="preload" href="/assets/fonts/bevietnampro-400-latin.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="/assets/css/site.css">

  <script>
    /* Light is the default. This only re-applies a dark choice the reader
       made earlier, before first paint, so there is no flash of light.
       Also drops the no-js class so [data-reveal] can animate. */
    (function () {
      var d = document.documentElement;
      d.classList.remove('no-js');
      try {
        var s = localStorage.getItem('theme');
        if (s === 'light' || s === 'dark') d.setAttribute('data-theme', s);
      } catch (e) {}
    })();
  </script>

  <script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
${ctx.head ? '  ' + ctx.head : ''}
</head>
<body>
  <a class="skip-link" href="#main">${esc(t.skipToContent)}</a>

  <header class="header">
    <div class="shell header__inner">
      <a class="brand" href="${attr(urlFor(lang, 'home'))}">${esc(site.name)}</a>

      <nav class="nav nav-desktop" aria-label="${attr(t.primaryNav)}">
        ${navHtml}
      </nav>

      <div class="header__tools">
        <nav class="langswitch" aria-label="${attr(t.languageNav)}">
          ${langSwitch}
        </nav>
        <button class="iconbtn" type="button" data-theme-toggle aria-label="${attr(t.toggleTheme)}">
          <svg class="iconbtn__sun" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><circle cx="12" cy="12" r="4.2"/><path d="M12 2.6v2.2M12 19.2v2.2M4.3 4.3l1.6 1.6M18.1 18.1l1.6 1.6M2.6 12h2.2M19.2 12h2.2M4.3 19.7l1.6-1.6M18.1 5.9l1.6-1.6"/></svg>
          <svg class="iconbtn__moon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.5 14.5A8.6 8.6 0 0 1 9.5 3.5a8.6 8.6 0 1 0 11 11Z"/></svg>
        </button>
        <button class="iconbtn nav-toggle" type="button" data-drawer-open aria-label="${attr(
          t.openMenu
        )}" aria-expanded="false" aria-controls="site-drawer">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M3.5 7h17M3.5 12h17M3.5 17h17"/></svg>
        </button>
      </div>
    </div>
  </header>

  <div class="drawer__scrim" data-drawer-scrim hidden></div>
  <div class="drawer" id="site-drawer" role="dialog" aria-modal="true" aria-label="${attr(
    t.primaryNav
  )}" hidden>
    <div class="drawer__head">
      <span class="footer__name">${esc(site.name)}</span>
      <button class="iconbtn" type="button" data-drawer-close aria-label="${attr(t.closeMenu)}">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18"/></svg>
      </button>
    </div>
    <nav class="drawer__nav" aria-label="${attr(t.primaryNav)}">
          ${drawerNavHtml}
    </nav>
    <div class="drawer__foot">
      <nav class="langswitch" aria-label="${attr(t.languageNav)}">${langSwitch}</nav>
    </div>
  </div>

  <main class="main" id="main">
${body}
  </main>

  <footer class="footer">
    <div class="shell">
      <div class="footer__top">
        <span class="footer__name">${esc(site.name)} · <span lang="vi">${esc(
    site.nameVi
  )}</span></span>
        <nav class="footer__nav" aria-label="${attr(t.footerNav)}">
            ${footerNav}
        </nav>
      </div>
      <p class="footer__note">${esc(t.footerNote)}</p>
      <p class="footer__note" style="margin-top:.6rem">${esc(t.footerColophon)}</p>
    </div>
  </footer>

  <script src="/assets/js/site.js" defer></script>${
    ctx.extraScripts ? '\n  ' + ctx.extraScripts : ''
  }
</body>
</html>
`;
};
