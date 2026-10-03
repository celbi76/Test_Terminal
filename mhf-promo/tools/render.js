#!/usr/bin/env node
// Rendert alle Bilder mit Chromium (Playwright) und kodiert zusammen mit build/audio.wav zu MP4.
//   node tools/render.js                 komplettes Video -> out/mhf-promo.mp4
//   node tools/render.js --stills 3,11   einzelne Bilder (Sekunden) -> build/stills/
//   node tools/render.js --safe          Sicherheitsrahmen (15 % oben/unten) einzeichnen
const path = require('path');
const fs = require('fs');
const http = require('http');
const { spawnSync } = require('child_process');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');

const ROOT = path.resolve(__dirname, '..');
const CFG = require(path.join(ROOT, 'config.js'));
const TIM = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/timings.json'), 'utf8'));
const QR = JSON.parse(fs.readFileSync(path.join(ROOT, 'build/qr.json'), 'utf8'));
const args = process.argv.slice(2);
const opt = k => { const i = args.indexOf('--' + k); return i < 0 ? null : (args[i + 1] && !args[i + 1].startsWith('--') ? args[i + 1] : true); };
const WORKERS = Number(opt('workers')) || 4;

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.png': 'image/png', '.woff2': 'font/woff2', '.json': 'application/json' };
function serve() {
  const srv = http.createServer((req, res) => {
    const p = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]));
    if (!p.startsWith(ROOT) || !fs.existsSync(p) || fs.statSync(p).isDirectory()) { res.writeHead(404); return res.end(); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(p)] || 'application/octet-stream' });
    fs.createReadStream(p).pipe(res);
  });
  return new Promise(r => srv.listen(0, '127.0.0.1', () => r(srv)));
}

async function openPage(browser, port) {
  const page = await browser.newPage({ viewport: { width: CFG.format.width, height: CFG.format.height }, deviceScaleFactor: 1 });
  await page.addInitScript(([c, t, q]) => { window.CONFIG = c; window.TIMINGS = t; window.QRMATRIX = q; }, [CFG, TIM, QR]);
  page.on('pageerror', e => { console.error('Seitenfehler:', e.message); process.exitCode = 1; });
  await page.goto(`http://127.0.0.1:${port}/scene.html`);
  await page.evaluate(() => window.sceneInit());
  await page.waitForFunction(() => window.__ready === true);
  return page;
}

(async () => {
  const srv = await serve();
  const port = srv.address().port;
  const browser = await chromium.launch({ args: ['--font-render-hinting=none', '--disable-lcd-text'] });
  const safe = !!opt('safe');
  const stills = opt('stills');
  if (stills && stills !== true) {
    const dir = path.join(ROOT, 'build/stills'); fs.mkdirSync(dir, { recursive: true });
    const page = await openPage(browser, port);
    for (const s of stills.split(',')) {
      await page.evaluate(([t, sf]) => window.renderFrame(t, { safe: sf }), [Number(s), safe]);
      await page.locator('#c').screenshot({ path: path.join(dir, `t${String(s).replace('.', '_')}.png`) });
    }
    await browser.close(); srv.close(); return;
  }
  const fps = CFG.format.fps;
  const total = Math.round(TIM.total * fps);
  const dir = path.join(ROOT, 'build/frames');
  fs.rmSync(dir, { recursive: true, force: true }); fs.mkdirSync(dir, { recursive: true });
  const pages = await Promise.all(Array.from({ length: WORKERS }, () => openPage(browser, port)));
  let next = 0, done = 0;
  const t0 = Date.now();
  await Promise.all(pages.map(async page => {
    for (;;) {
      const i = next++; if (i >= total) break;
      await page.evaluate(([t, sf]) => window.renderFrame(t, { safe: sf }), [i / fps, safe]);
      await page.locator('#c').screenshot({ path: path.join(dir, String(i).padStart(5, '0') + '.png') });
      if (++done % 100 === 0) console.log(`${done}/${total} Bilder, ${((Date.now() - t0) / 1000).toFixed(0)} s`);
    }
  }));
  await browser.close(); srv.close();

  const out = path.join(ROOT, 'out/mhf-promo.mp4');
  fs.mkdirSync(path.dirname(out), { recursive: true });
  const r = spawnSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', String(fps), '-i', path.join(dir, '%05d.png'),
    '-i', path.join(ROOT, 'build/audio.wav'),
    '-vf', 'scale=out_color_matrix=bt709:out_range=tv:flags=accurate_rnd+full_chroma_int+bicubic,format=yuv420p',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '14', '-profile:v', 'high', '-level', '4.2',
    '-colorspace', 'bt709', '-color_primaries', 'bt709', '-color_trc', 'bt709', '-color_range', 'tv',
    '-c:a', 'aac', '-b:a', '256k', '-ar', '48000', '-shortest', '-movflags', '+faststart', out], { stdio: 'inherit' });
  if (r.status !== 0) process.exit(r.status);
  console.log('Fertig:', out);
})();
