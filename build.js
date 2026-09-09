#!/usr/bin/env node
/**
 * Static site generator for michaelpham.
 *
 * Zero dependencies: plain Node, no npm install, so CI is a single `node build.js`.
 * Reads all copy from content/site.json, renders one real HTML file per page per
 * language into dist/, and copies static/ over the top.
 *
 *   node build.js            build once into dist/
 *   node build.js --serve    build, then serve dist/ on :4000 and rebuild on change
 */

'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = __dirname;
const OUT = path.join(ROOT, 'dist');
// Each build renders into its own staging directory and is then renamed over
// dist/ in one step. Two things depend on that: a manual `node build.js` racing
// the --serve watcher must not leave dist/ half-deleted while check.js or the
// server is reading it, and the two builds must not scribble over each other.
const STAGE_ROOT = path.join(ROOT, '.dist-staging');
const CONTENT = path.join(ROOT, 'content', 'site.json');

const content = JSON.parse(fs.readFileSync(CONTENT, 'utf8'));
const pages = require('./src/templates/pages.js');
const layout = require('./src/templates/layout.js');
const { LANGS, urlFor } = require('./src/templates/routes.js');

/* ------------------------------------------------------------------ helpers */

function rmrf(p) {
  if (fs.existsSync(p)) fs.rmSync(p, { recursive: true, force: true });
}

function copyDir(src, dest) {
  if (!fs.existsSync(src)) return;
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    if (entry.name === '.DS_Store') continue;
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDir(s, d);
    else fs.copyFileSync(s, d);
  }
}

function write(stage, relPath, html) {
  const full = path.join(stage, relPath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, html);
  return full;
}

/* -------------------------------------------------------------------- build */

function build() {
  const started = Date.now();
  fs.mkdirSync(STAGE_ROOT, { recursive: true });
  const STAGE = fs.mkdtempSync(path.join(STAGE_ROOT, 'build-'));

  const written = [];

  for (const lang of LANGS) {
    for (const page of Object.keys(pages)) {
      const ctx = { content, lang, page };
      const body = pages[page](ctx);
      const html = layout({ ...ctx, ...body });
      const rel = path.join(urlFor(lang, page).replace(/^\//, ''), 'index.html');
      written.push(write(STAGE, rel, html));
    }
  }

  // Static assets: fonts, images, favicons, robots.txt …
  copyDir(path.join(ROOT, 'static'), STAGE);
  copyDir(path.join(ROOT, 'src', 'css'), path.join(STAGE, 'assets', 'css'));
  copyDir(path.join(ROOT, 'src', 'js'), path.join(STAGE, 'assets', 'js'));

  // GitHub Pages: skip Jekyll so files beginning with _ are served as-is.
  fs.writeFileSync(path.join(STAGE, '.nojekyll'), '');

  // sitemap.xml: every page, both languages.
  const urls = [];
  for (const lang of LANGS) {
    for (const page of Object.keys(pages)) urls.push(content.site.url + urlFor(lang, page));
  }
  const lastmod = content.site.lastUpdated;
  fs.writeFileSync(
    path.join(STAGE, 'sitemap.xml'),
    '<?xml version="1.0" encoding="UTF-8"?>\n' +
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls
        .map((u) => `  <url><loc>${u}</loc><lastmod>${lastmod}</lastmod></url>`)
        .join('\n') +
      '\n</urlset>\n'
  );

  swapIn(STAGE);

  const ms = Date.now() - started;
  console.log(`built ${written.length} pages + assets into dist/ in ${ms}ms`);
  return written;
}

/**
 * Move a finished staging directory into place as dist/.
 *
 * Two renames rather than one, because renaming onto a non-empty directory
 * fails. That leaves a sliver where dist/ does not exist, and a concurrent
 * build (the --serve watcher and a manual `node build.js`, typically) can
 * lose the race either way round. So: retry rather than crash, put the previous
 * build back if the swap fails so dist/ is never left missing, and never delete
 * the shared staging root outright, because another build is probably still
 * rendering inside it.
 */
function swapIn(stage) {
  for (let attempt = 0; ; attempt++) {
    const parked = `${OUT}.old-${process.pid}-${attempt}`;
    let parkedPrevious = false;
    try {
      if (fs.existsSync(OUT)) {
        fs.renameSync(OUT, parked);
        parkedPrevious = true;
      }
      fs.renameSync(stage, OUT);
      rmrf(parked);
      try {
        fs.rmdirSync(STAGE_ROOT); // only succeeds once no build is using it
      } catch (e) {
        /* another build is still staging, so leave it */
      }
      return;
    } catch (err) {
      if (parkedPrevious && !fs.existsSync(OUT)) {
        try {
          fs.renameSync(parked, OUT);
        } catch (e) {
          /* the winner already put its own dist/ there */
        }
      }
      rmrf(parked);
      const racy = err.code === 'ENOENT' || err.code === 'ENOTEMPTY';
      if (!racy || attempt >= 8) throw err;
    }
  }
}

/* -------------------------------------------------------------- dev server */

function serve() {
  const http = require('http');
  const PORT = process.env.PORT || 4000;
  const MIME = {
    '.html': 'text/html; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.webp': 'image/webp',
    '.ico': 'image/x-icon',
    '.woff2': 'font/woff2',
    '.xml': 'application/xml; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.pdf': 'application/pdf',
  };

  http
    .createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]);
      if (p.endsWith('/')) p += 'index.html';
      let file = path.join(OUT, p);
      if (!file.startsWith(OUT)) {
        res.writeHead(403).end('forbidden');
        return;
      }
      if (!fs.existsSync(file) && fs.existsSync(file + '.html')) file += '.html';
      if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) {
        res.writeHead(404, { 'content-type': 'text/html; charset=utf-8' });
        res.end('<h1>404</h1><p>Not found: ' + p + '</p>');
        return;
      }
      res.writeHead(200, { 'content-type': MIME[path.extname(file)] || 'application/octet-stream' });
      fs.createReadStream(file).pipe(res);
    })
    .listen(PORT, () => console.log(`serving dist/ on http://localhost:${PORT}`));

  // Rebuild whenever a source file changes. Debounced, because editors fire several events per save.
  let timer = null;
  const rebuild = () => {
    clearTimeout(timer);
    timer = setTimeout(() => {
      for (const k of Object.keys(require.cache)) {
        if (k.includes('/src/templates/')) delete require.cache[k];
      }
      try {
        Object.assign(content, JSON.parse(fs.readFileSync(CONTENT, 'utf8')));
        const p = require('./src/templates/pages.js');
        Object.keys(pages).forEach((k) => delete pages[k]);
        Object.assign(pages, p);
        build();
      } catch (err) {
        console.error('build failed:', err.message);
      }
    }, 80);
  };
  for (const dir of ['content', 'src', 'static']) {
    fs.watch(path.join(ROOT, dir), { recursive: true }, rebuild);
  }
}

build();
if (process.argv.includes('--serve')) serve();
