#!/usr/bin/env node
/**
 * check.js — a build gate, not a linter.
 *
 * Runs against dist/ after a build and fails the deploy on anything that would
 * ship visibly broken: dead internal links, missing assets, unfilled
 * placeholders, missing metadata, images without alt text or dimensions.
 *
 *   node build.js && node scripts/check.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const OUT = path.join(__dirname, '..', 'dist');
const errors = [];
const warnings = [];

function walk(dir, out) {
  out = out || [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
}

if (!fs.existsSync(OUT)) {
  console.error('dist/ does not exist — run `node build.js` first.');
  process.exit(1);
}

// dist/ is swapped in wholesale by build.js, so a rebuild (the --serve watcher,
// typically) can move the tree out from under this walk. Take the listing and
// the reads as one attempt, and start over if the tree shifted.
const pause = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);

function snapshot(attempt) {
  try {
    const list = walk(OUT);
    return { files: list, read: new Map(list.map((f) => [f, fs.readFileSync(f)])) };
  } catch (err) {
    if (err.code !== 'ENOENT' || attempt >= 10) throw err;
    pause(50 * (attempt + 1)); // back off; retrying instantly just loses again
    return snapshot(attempt + 1);
  }
}

const snap = snapshot(0);
const files = snap.files;
const readFile = (f) => snap.read.get(f).toString('utf8');
const htmlFiles = files.filter((f) => f.endsWith('.html'));
const rel = (f) => path.relative(OUT, f);

// Anything that looks like copy nobody finished writing.
const PLACEHOLDER = /\[PLACEHOLDER|\[EDIT\b|\[TODO|Lorem ipsum|\bTKTK\b|\{\{\s*\w/i;

// Claims that were removed on purpose and must never come back.
const FORBIDDEN = [
  /\bPhD\b/i,
  /\bdoctoral\b/i,
  /\bdoctorate\b/i,
  /\bQueen['’]s University\b/i,
  /\btiến sĩ\b/i,
  /\bluận án\b/i,
  /\bnghiên cứu sinh\b/i,
];

function exists(urlPath) {
  const clean = urlPath.split('#')[0].split('?')[0];
  if (!clean.startsWith('/')) return null; // relative — checked separately
  let p = path.join(OUT, clean);
  if (clean.endsWith('/')) p = path.join(p, 'index.html');
  return snap.read.has(p);
}

for (const file of htmlFiles) {
  const html = readFile(file);
  const name = rel(file);

  // --- required metadata -------------------------------------------------
  for (const [label, re] of [
    ['<title>', /<title>[^<]{5,}<\/title>/],
    ['meta description', /<meta name="description" content="[^"]{40,}"/],
    ['canonical', /<link rel="canonical"/],
    ['og:image', /<meta property="og:image"/],
    ['lang attribute', /<html lang="(en|vi)"/],
    ['h1', /<h1[\s>]/],
    ['skip link', /class="skip-link"/],
  ]) {
    if (!re.test(html)) errors.push(`${name}: missing ${label}`);
  }

  const h1s = (html.match(/<h1[\s>]/g) || []).length;
  if (h1s > 1) errors.push(`${name}: ${h1s} <h1> elements — there must be exactly one`);

  // --- copy that should not ship ----------------------------------------
  const ph = html.match(PLACEHOLDER);
  if (ph) errors.push(`${name}: unfinished placeholder copy near "${ph[0]}"`);

  for (const re of FORBIDDEN) {
    const m = html.match(re);
    if (m) {
      // Report with a little context so a false positive is obvious.
      const at = html.indexOf(m[0]);
      const ctx = html.slice(Math.max(0, at - 60), at + 80).replace(/\s+/g, ' ');
      errors.push(`${name}: removed claim reappeared — "${m[0]}" in "…${ctx}…"`);
    }
  }

  // --- images ------------------------------------------------------------
  const imgs = html.match(/<img\b[^>]*>/g) || [];
  for (const img of imgs) {
    if (!/\salt="/.test(img)) errors.push(`${name}: <img> without alt — ${img.slice(0, 90)}`);
    if (!/\swidth="\d+"/.test(img) || !/\sheight="\d+"/.test(img)) {
      warnings.push(`${name}: <img> without width/height (layout shift) — ${img.slice(0, 70)}`);
    }
  }

  // --- links and asset references ---------------------------------------
  const hrefs = [...html.matchAll(/(?:href|src)="([^"]+)"/g)].map((m) => m[1]);
  for (const href of hrefs) {
    if (/^(https?:|mailto:|tel:|data:|#)/.test(href)) continue;
    const ok = exists(href);
    if (ok === false) errors.push(`${name}: dead reference -> ${href}`);
  }

  // In-page anchors must resolve to a real id in the same document.
  const anchors = hrefs.filter((h) => h.startsWith('#') && h.length > 1);
  for (const a of anchors) {
    const id = a.slice(1);
    if (!new RegExp(`id="${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"`).test(html)) {
      errors.push(`${name}: anchor ${a} has no matching id`);
    }
  }

  // --- external links open safely ---------------------------------------
  const targets = html.match(/<a\b[^>]*target="_blank"[^>]*>/g) || [];
  for (const a of targets) {
    if (!/rel="[^"]*noopener/.test(a)) {
      errors.push(`${name}: target="_blank" without rel="noopener" — ${a.slice(0, 80)}`);
    }
  }
}

// --- site-level files -------------------------------------------------------
const present = new Set(files.map(rel));
for (const required of ['sitemap.xml', 'robots.txt', 'favicon.ico', 'favicon.svg', '.nojekyll']) {
  if (!present.has(required)) errors.push(`missing ${required}`);
}

// Every page in the sitemap must actually exist.
const sitemap = readFile(path.join(OUT, 'sitemap.xml'));
const locs = [...sitemap.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
for (const loc of locs) {
  const p = loc.replace(/^https?:\/\/[^/]+/, '');
  if (exists(p) === false) errors.push(`sitemap lists a page that was not built: ${p}`);
}

// EN and VI must stay in step — a page in one language and not the other means
// a broken language switch.
const enPages = htmlFiles.filter((f) => !rel(f).startsWith('vi/')).map(rel);
const viPages = htmlFiles.filter((f) => rel(f).startsWith('vi/')).map((f) => rel(f).slice(3));
for (const p of enPages) {
  if (!viPages.includes(p)) errors.push(`no Vietnamese counterpart for ${p}`);
}

// --- report -----------------------------------------------------------------
for (const w of warnings) console.warn('warn  ' + w);
for (const e of errors) console.error('ERROR ' + e);

console.log(
  `\nchecked ${htmlFiles.length} pages, ${files.length} files — ` +
    `${errors.length} error(s), ${warnings.length} warning(s)`
);
process.exit(errors.length ? 1 : 0);
