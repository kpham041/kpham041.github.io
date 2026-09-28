#!/usr/bin/env node
/**
 * icons.js: renders every raster icon from static/favicon.svg.
 *
 * One mark, every size. favicon.svg is drawn on a 4-unit grid so its strokes
 * land on whole pixels at 16, 32 and 48px; this script rasterises it with
 * headless Chrome (like og.js, so there is nothing to install) and writes:
 *
 *   static/favicon.ico              16, 32 and 48px frames (PNG-in-ICO)
 *   static/img/icon-192.png         the rounded tile, for the manifest
 *   static/img/icon-512.png
 *   static/img/icon-180.png         apple-touch-icon: full-bleed, iOS rounds it
 *   static/img/icon-maskable-512.png  full-bleed, the mark inside the safe zone
 *
 * Run it after editing favicon.svg:
 *
 *   node scripts/icons.js
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const STATIC = path.join(ROOT, 'static');
const PORT = 9335;
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const svg = fs.readFileSync(path.join(STATIC, 'favicon.svg'), 'utf8');
// Full-bleed variant: the same mark on a square tile. Launchers and iOS apply
// their own mask, and transparent corners would be filled with black.
const bleed = svg.replace(/<rect width="64" height="64" rx="14"/, '<rect width="64" height="64"');
const dataUri = (s) => 'data:image/svg+xml;base64,' + Buffer.from(s).toString('base64');

const JOBS = [
  { src: svg, size: 16, ico: true },
  { src: svg, size: 32, ico: true },
  { src: svg, size: 48, ico: true },
  { src: svg, size: 192, out: 'img/icon-192.png' },
  { src: svg, size: 512, out: 'img/icon-512.png' },
  { src: bleed, size: 180, out: 'img/icon-180.png' },
  { src: bleed, size: 512, out: 'img/icon-maskable-512.png' },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** PNG-in-ICO: a 6-byte header, a 16-byte entry per frame, then the PNGs. */
function ico(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2);
  header.writeUInt16LE(frames.length, 4);
  let offset = 6 + 16 * frames.length;
  const entries = frames.map(({ size, png }) => {
    const e = Buffer.alloc(16);
    e.writeUInt8(size >= 256 ? 0 : size, 0);
    e.writeUInt8(size >= 256 ? 0 : size, 1);
    e.writeUInt8(0, 2);
    e.writeUInt8(0, 3);
    e.writeUInt16LE(1, 4);
    e.writeUInt16LE(32, 6);
    e.writeUInt32LE(png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += png.length;
    return e;
  });
  return Buffer.concat([header, ...entries, ...frames.map((f) => f.png)]);
}

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'icons-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--user-data-dir=' + path.join(tmp, 'profile'),
      '--remote-debugging-port=' + PORT, 'about:blank',
    ],
    { stdio: 'ignore' }
  );
  process.on('exit', () => { try { chrome.kill(); } catch (e) {} });

  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      wsUrl = (await (await fetch(`http://127.0.0.1:${PORT}/json/version`)).json())
        .webSocketDebuggerUrl;
    } catch (e) { await sleep(150); }
  }
  if (!wsUrl) throw new Error('Chrome did not start');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener('message', (ev) => {
    const m = JSON.parse(ev.data);
    if (m.id && pending.has(m.id)) {
      const { resolve, reject } = pending.get(m.id);
      pending.delete(m.id);
      m.error ? reject(new Error(m.error.message)) : resolve(m.result);
    }
  });
  const send = (method, params, sessionId) =>
    new Promise((resolve, reject) => {
      const n = ++id;
      pending.set(n, { resolve, reject });
      ws.send(JSON.stringify({ id: n, method, params: params || {}, sessionId }));
    });

  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);
  await S('Page.enable');
  await S('Emulation.setDefaultBackgroundColorOverride', { color: { r: 0, g: 0, b: 0, a: 0 } });

  const frames = [];
  for (const job of JOBS) {
    await S('Emulation.setDeviceMetricsOverride', {
      width: job.size, height: job.size, deviceScaleFactor: 1, mobile: false,
    });
    const file = path.join(tmp, `icon-${job.size}.html`);
    fs.writeFileSync(
      file,
      `<!doctype html><style>html,body{margin:0;background:transparent}img{display:block}</style>` +
        `<img src="${dataUri(job.src)}" width="${job.size}" height="${job.size}">`
    );
    await S('Page.navigate', { url: 'file://' + file });
    await sleep(300);
    const shot = await S('Page.captureScreenshot', {
      format: 'png',
      clip: { x: 0, y: 0, width: job.size, height: job.size, scale: 1 },
    });
    const png = Buffer.from(shot.data, 'base64');
    if (job.ico) frames.push({ size: job.size, png });
    else {
      fs.writeFileSync(path.join(STATIC, job.out), png);
      console.log(`  ${job.out.padEnd(26)} ${(png.length / 1024).toFixed(1)}K`);
    }
  }
  const icoBuf = ico(frames);
  fs.writeFileSync(path.join(STATIC, 'favicon.ico'), icoBuf);
  console.log(`  ${'favicon.ico'.padEnd(26)} ${(icoBuf.length / 1024).toFixed(1)}K  (16, 32, 48)`);

  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
