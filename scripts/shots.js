#!/usr/bin/env node
/**
 * shots.js — full-page screenshots of every page, for design review.
 *
 * Drives headless Chrome over the DevTools Protocol rather than shelling out to
 * `--screenshot`, because that flag does not emulate the viewport properly (a
 * 390px window still lays out wider) and cannot emulate prefers-color-scheme.
 * CDP gives exact device metrics, real media emulation, and true full-page
 * capture. Zero dependencies — Node 22+ has a global WebSocket.
 *
 *   node build.js --serve            # in one terminal
 *   node scripts/shots.js [outdir]   # in another
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

const OUT = process.argv[2] || '/tmp/site-shots';
const BASE = process.env.BASE || 'http://localhost:4000';
const PORT = 9333;
const CHROME =
  process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';

const PAGES = [
  ['home', '/'],
  ['about', '/about/'],
  ['work', '/work/'],
  ['pubs', '/publications/'],
  ['contact', '/contact/'],
];

const VIEWS = [
  { suffix: '', width: 1280, height: 900, scheme: 'light', mobile: false },
  { suffix: '-dark', width: 1280, height: 900, scheme: 'dark', mobile: false },
  { suffix: '-mobile', width: 390, height: 844, scheme: 'light', mobile: true },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function main() {
  fs.mkdirSync(OUT, { recursive: true });

  const chrome = spawn(
    CHROME,
    [
      '--headless=new',
      '--disable-gpu',
      '--hide-scrollbars',
      '--no-first-run',
      '--no-default-browser-check',
      '--user-data-dir=' + fs.mkdtempSync(path.join(require('os').tmpdir(), 'shots-')),
      '--remote-debugging-port=' + PORT,
      'about:blank',
    ],
    { stdio: 'ignore' }
  );

  const cleanup = () => { try { chrome.kill(); } catch (e) {} };
  process.on('exit', cleanup);
  process.on('SIGINT', () => { cleanup(); process.exit(1); });

  // Wait for the debugging endpoint to answer.
  let wsUrl = null;
  for (let i = 0; i < 60 && !wsUrl; i++) {
    try {
      const r = await fetch(`http://127.0.0.1:${PORT}/json/version`);
      wsUrl = (await r.json()).webSocketDebuggerUrl;
    } catch (e) {
      await sleep(150);
    }
  }
  if (!wsUrl) throw new Error('Chrome did not expose a DevTools endpoint');

  const ws = new WebSocket(wsUrl);
  await new Promise((res, rej) => {
    ws.addEventListener('open', res, { once: true });
    ws.addEventListener('error', rej, { once: true });
  });

  let id = 0;
  const pending = new Map();
  const events = [];
  ws.addEventListener('message', (ev) => {
    const msg = JSON.parse(ev.data);
    if (msg.id && pending.has(msg.id)) {
      const { resolve, reject } = pending.get(msg.id);
      pending.delete(msg.id);
      msg.error ? reject(new Error(msg.error.message)) : resolve(msg.result);
    } else if (msg.method) {
      events.push(msg);
    }
  });

  function send(method, params, sessionId) {
    const msgId = ++id;
    return new Promise((resolve, reject) => {
      pending.set(msgId, { resolve, reject });
      ws.send(JSON.stringify({ id: msgId, method, params: params || {}, sessionId }));
    });
  }

  // One tab, reused for every shot.
  const { targetId } = await send('Target.createTarget', { url: 'about:blank' });
  const { sessionId } = await send('Target.attachToTarget', { targetId, flatten: true });
  const S = (m, p) => send(m, p, sessionId);

  await S('Page.enable');
  await S('Runtime.enable');

  const written = [];

  for (const view of VIEWS) {
    for (const [name, urlPath] of PAGES) {
      for (const lang of ['', 'vi']) {
        // Only capture Vietnamese for the two pages where it differs most.
        if (lang === 'vi' && !['home', 'about'].includes(name)) continue;
        if (lang === 'vi' && view.suffix !== '') continue;

        const url = BASE + (lang ? '/vi' + urlPath : urlPath);
        const file = `${lang ? 'vi-' : ''}${name}${view.suffix}.png`;

        await S('Emulation.setDeviceMetricsOverride', {
          width: view.width,
          height: view.height,
          deviceScaleFactor: 1,
          mobile: view.mobile,
          screenWidth: view.width,
          screenHeight: view.height,
        });
        await S('Emulation.setEmulatedMedia', {
          features: [
            { name: 'prefers-color-scheme', value: view.scheme },
            // Reduced motion pins every [data-reveal] to its final state, so a
            // still is never captured mid-fade. The end state is identical.
            { name: 'prefers-reduced-motion', value: 'reduce' },
          ],
        });

        await S('Page.navigate', { url });
        await S('Page.loadEventFired').catch(() => {});
        await sleep(700); // fonts and images

        // Belt and braces: reduced motion should already have revealed
        // everything, but force it so a slow font swap can never leave a gap.
        await S('Runtime.evaluate', {
          expression: `(async () => {
            document.querySelectorAll('[data-reveal]').forEach(el => el.setAttribute('data-revealed',''));
            if (document.fonts && document.fonts.ready) await document.fonts.ready;
            await new Promise(r => setTimeout(r, 250));
          })()`,
          awaitPromise: true,
        });

        // Report any layout that spills outside the viewport — the thing
        // eyeballing a screenshot most often misses.
        const overflow = await S('Runtime.evaluate', {
          expression: `JSON.stringify((() => {
            const w = document.documentElement.clientWidth;
            const bad = [...document.querySelectorAll('body *')].filter(el => {
              if (el.closest('[hidden]') || el.hasAttribute('hidden')) return false;
              const s = getComputedStyle(el);
              if (s.position === 'fixed' || s.display === 'none') return false;
              const r = el.getBoundingClientRect();
              return r.width > 0 && (r.right > w + 1 || r.left < -1);
            }).map(el => (el.tagName + '.' + (el.getAttribute('class') || '')).slice(0, 60));
            return { scrollWidth: document.documentElement.scrollWidth, clientWidth: w, bad: [...new Set(bad)].slice(0, 6) };
          })())`,
          returnByValue: true,
        });
        const ov = JSON.parse(overflow.result.value);
        if (ov.scrollWidth > ov.clientWidth + 1 || ov.bad.length) {
          console.warn(`  ! ${file} overflows: ${ov.scrollWidth}>${ov.clientWidth} ${ov.bad.join(', ')}`);
        }

        const shot = await S('Page.captureScreenshot', {
          format: 'png',
          captureBeyondViewport: true,
        });
        const dest = path.join(OUT, file);
        fs.writeFileSync(dest, Buffer.from(shot.data, 'base64'));
        written.push(file);
        console.log(`  ${file.padEnd(24)} ${(fs.statSync(dest).size / 1024).toFixed(0)}K`);
      }
    }
  }

  ws.close();
  chrome.kill();
  console.log(`\n${written.length} screenshots in ${OUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
