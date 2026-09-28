'use strict';

const { esc } = require('./esc.js');
const { urlFor } = require('./routes.js');

/**
 * 404.html. GitHub Pages serves this one file for every missing path, English
 * or Vietnamese, so the page carries both languages side by side rather than
 * guessing, and it works with JavaScript off. It is not a route: build.js
 * writes it once, and layout() leaves out canonical and hreflang for it.
 */
module.exports = function notFound(ctx) {
  const { content } = ctx;
  const en = content.i18n.en.notFound;
  const vi = content.i18n.vi.notFound;

  return {
    title: en.metaTitle,
    description: en.metaDescription,
    body: `    <div class="shell">
      <section class="section" aria-labelledby="notfound-h">
      <div class="section__head">
        <p class="overline">404</p>
        <h1 class="notfound__title" id="notfound-h">
          <span>${esc(en.title)}</span>
          <span class="notfound__vi" lang="vi">${esc(vi.title)}</span>
        </h1>
      </div>
        <div class="notfound__pair">
          <p>${esc(en.body)} <a class="link" href="${urlFor('en', 'home')}">${esc(en.homeLink)}</a></p>
          <p lang="vi">${esc(vi.body)} <a class="link" href="${urlFor('vi', 'home')}" hreflang="vi">${esc(
      vi.homeLink
    )}</a></p>
        </div>
      </section>
    </div>`,
  };
};
