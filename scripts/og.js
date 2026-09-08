#!/usr/bin/env node
/**
 * og.js — renders the 1200×630 social preview cards into static/img/.
 *
 * The card is real HTML rendered in headless Chrome, so it uses the same fonts
 * and palette as the site rather than a hand-drawn approximation. Run it after
 * changing the name, role line, or portrait:
 *
 *   node scripts/og.js
 *
 * Output: static/img/og-en.png, static/img/og-vi.png (committed to the repo —
 * they change rarely and the build must not depend on Chrome).
 */

'use strict';

const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const ROOT = path.join(__dirname, '..');
const content = JSON.parse(fs.readFileSync(path.join(ROOT, 'content', 'site.json'), 'utf8'));
const PORT = 9334;
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const FONT_DIR = path.join(ROOT, 'static', 'assets', 'fonts');
const b64 = (f) => fs.readFileSync(path.join(FONT_DIR, f)).toString('base64');
const portrait = fs.readFileSync(path.join(ROOT, 'static', 'img', 'portrait-560.jpg')).toString('base64');

function card(lang) {
  const t = content.i18n[lang];
  const site = content.site;
  const role = t.home.role;
  const kicker = lang === 'vi' ? 'Ottawa, Canada' : 'Ottawa, Canada';

  return `<!doctype html><html lang="${lang}"><head><meta charset="utf-8"><style>
  @font-face{font-family:F;src:url(data:font/woff2;base64,${b64('fraunces-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF;}
  @font-face{font-family:F;src:url(data:font/woff2;base64,${b64('fraunces-vietnamese.woff2')}) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB;}
  @font-face{font-family:F;src:url(data:font/woff2;base64,${b64('fraunces-latin-ext.woff2')}) format('woff2');unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,U+A720-A7FF;}
  @font-face{font-family:B;font-weight:400;src:url(data:font/woff2;base64,${b64('bevietnampro-400-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF;}
  @font-face{font-family:B;font-weight:400;src:url(data:font/woff2;base64,${b64('bevietnampro-400-vietnamese.woff2')}) format('woff2');unicode-range:U+0102-0103,U+0110-0111,U+0128-0129,U+0168-0169,U+01A0-01A1,U+01AF-01B0,U+0300-0301,U+0303-0304,U+0308-0309,U+0323,U+0329,U+1EA0-1EF9,U+20AB;}
  @font-face{font-family:B;font-weight:400;src:url(data:font/woff2;base64,${b64('bevietnampro-400-latin-ext.woff2')}) format('woff2');unicode-range:U+0100-02BA,U+1E00-1E9F,U+2C60-2C7F,U+A720-A7FF;}
  @font-face{font-family:M;src:url(data:font/woff2;base64,${b64('ibmplexmono-500-latin.woff2')}) format('woff2');unicode-range:U+0000-00FF;}
  *{margin:0;padding:0;box-sizing:border-box}
  body{width:1200px;height:630px;background:#fbfaf7;color:#171c26;font-family:B,sans-serif;
       display:grid;grid-template-columns:1fr 400px;align-items:center;gap:64px;padding:72px 80px;overflow:hidden}
  .kicker{font-family:M,monospace;font-size:19px;letter-spacing:.14em;text-transform:uppercase;color:#2c4a73;margin-bottom:26px}
  h1{font-family:F,serif;font-weight:600;font-size:82px;line-height:1.0;letter-spacing:-.028em}
  .latin{font-family:F,serif;font-weight:500;font-size:36px;color:#666d7a;letter-spacing:-.01em;margin-top:12px}
  .role{font-size:26px;line-height:1.45;color:#3b424f;margin-top:34px;max-width:22ch}
  .rule{width:96px;height:5px;background:#8f6129;margin-top:40px;border-radius:3px}
  figure{width:400px;height:400px;border-radius:34px;overflow:hidden;border:1px solid #e4dfd5;
         box-shadow:0 2px 4px rgba(23,28,38,.06),0 18px 48px rgba(23,28,38,.10)}
  img{width:100%;height:100%;object-fit:cover;display:block}
  </style></head><body>
  <div>
    <div class="kicker">${kicker}</div>
    <h1>${site.nameVi}</h1>
    <div class="latin">${site.name}</div>
    <div class="role">${role}</div>
    <div class="rule"></div>
  </div>
  <figure><img src="data:image/jpeg;base64,${portrait}" alt=""></figure>
  </body></html>`;
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'og-'));
  const chrome = spawn(
    CHROME,
    [
      '--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run',
      '--allow-file-access-from-files',
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
  await S('Runtime.enable');
  await S('Emulation.setDeviceMetricsOverride', {
    width: 1200, height: 630, deviceScaleFactor: 1, mobile: false,
  });

  for (const lang of ['en', 'vi']) {
    const file = path.join(tmp, `og-${lang}.html`);
    fs.writeFileSync(file, card(lang));
    await S('Page.navigate', { url: 'file://' + file });
    await sleep(500);
    await S('Runtime.evaluate', {
      expression: 'document.fonts.ready.then(() => new Promise(r => setTimeout(r, 200)))',
      awaitPromise: true,
    });
    const shot = await S('Page.captureScreenshot', { format: 'png' });
    const dest = path.join(ROOT, 'static', 'img', `og-${lang}.png`);
    fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
    console.log(`  og-${lang}.png  ${(fs.statSync(dest).size / 1024).toFixed(0)}K`);
  }

  ws.close();
  chrome.kill();
}

main().catch((e) => { console.error(e); process.exit(1); });
