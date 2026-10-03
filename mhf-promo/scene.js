// Zeichnet jedes Bild des Videos als Funktion der Zeit t. Alle Werte stammen aus config.js,
// alle Zeitpunkte aus build/timings.json (von tools/audio.py aus der echten Sprache berechnet).
(() => {
  const CFG = window.CONFIG, T = window.TIMINGS, QR = window.QRMATRIX;
  const W = CFG.format.width, H = CFG.format.height;
  const C = CFG.colors, S = CFG.sizes, TX = CFG.text;
  const FF = CFG.fonts.family;
  const MX = CFG.format.marginX;
  const canvas = document.getElementById('c');
  canvas.width = W; canvas.height = H;
  const ctx = canvas.getContext('2d');
  const tmp = document.createElement('canvas'); tmp.width = W; tmp.height = H;
  const tctx = tmp.getContext('2d');
  const small = document.createElement('canvas'); small.width = W; small.height = H;
  const sctx = small.getContext('2d');

  const ch = k => T.chunks[k].start;
  const chEnd = k => T.chunks[k].end;
  const cue = n => T.cues[n];
  const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
  const easeOut = x => 1 - Math.pow(1 - x, 3);
  const easeInOut = x => x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

  let flyer = null;
  const mosaics = [];
  let grain = null;

  async function init() {
    for (const w of Object.keys(CFG.fonts.files)) {
      const f = new FontFace(FF, `url(${CFG.fonts.files[w]})`, { weight: String(w) });
      await f.load(); document.fonts.add(f);
    }
    await document.fonts.ready;
    flyer = new Image();
    await new Promise((res, rej) => { flyer.onload = res; flyer.onerror = rej; flyer.src = CFG.mosaic.image; });
    // Flyer bildfüllend auf Format zuschneiden
    const base = document.createElement('canvas'); base.width = W; base.height = H;
    const bctx = base.getContext('2d');
    const sc = Math.max(W / flyer.width, H / flyer.height);
    bctx.drawImage(flyer, (W - flyer.width * sc) / 2, (H - flyer.height * sc) / 2, flyer.width * sc, flyer.height * sc);
    const data = bctx.getImageData(0, 0, W, H).data;
    for (const B of CFG.mosaic.steps) {
      const sw = Math.ceil(W / B), sh = Math.ceil(H / B);
      const cv = document.createElement('canvas'); cv.width = sw; cv.height = sh;
      const cx = cv.getContext('2d');
      const img = cx.createImageData(sw, sh);
      for (let by = 0; by < sh; by++) for (let bx = 0; bx < sw; bx++) {
        let r = 0, g = 0, b = 0, n = 0;
        for (let y = by * B; y < Math.min(H, (by + 1) * B); y++) for (let x = bx * B; x < Math.min(W, (bx + 1) * B); x++) {
          const i = (y * W + x) * 4; r += data[i]; g += data[i + 1]; b += data[i + 2]; n++;
        }
        const o = (by * sw + bx) * 4;
        const q = v => Math.round(v / n / 255 * 7) / 7 * 255 * CFG.mosaic.gain;   // Farben auf 8 Stufen reduziert
        img.data[o] = q(r); img.data[o + 1] = q(g); img.data[o + 2] = q(b); img.data[o + 3] = 255;
      }
      cx.putImageData(img, 0, 0);
      mosaics.push({ B, cv, sw, sh });
    }
    // Filmkorn: feste Textur, pro Bild anders verschoben
    if (CFG.mosaic.grain > 0) {
      grain = document.createElement('canvas'); grain.width = 512; grain.height = 512;
      const gx = grain.getContext('2d'), gi = gx.createImageData(512, 512);
      let seed = 1234567;
      const rnd = () => { seed |= 0; seed = seed + 0x6D2B79F5 | 0; let t = Math.imul(seed ^ seed >>> 15, 1 | seed); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
      for (let i = 0; i < 512 * 512; i++) {
        const v = Math.max(0, Math.min(255, 128 + (rnd() + rnd() + rnd() - 1.5) * 90));
        gi.data[i * 4] = gi.data[i * 4 + 1] = gi.data[i * 4 + 2] = v; gi.data[i * 4 + 3] = 255;
      }
      gx.putImageData(gi, 0, 0);
    }
    window.__ready = true;
  }

  // ---------- Hilfen ----------
  function font(g, size, weight = 700) { g.font = `${weight} ${size}px "${FF}"`; }
  function fitSize(g, text, size, maxW, weight = 700, ls = 0) {
    font(g, size, weight); g.letterSpacing = ls + 'px';
    const w = g.measureText(text).width;
    return w > maxW ? size * maxW / w : size;
  }
  function text(g, str, x, y, size, color, opt = {}) {
    const weight = opt.weight || 700, ls = opt.ls !== undefined ? opt.ls : -size * 0.015;
    const fs = opt.fit ? fitSize(g, str, size, opt.fit, weight, ls) : size;
    font(g, fs, weight);
    g.letterSpacing = ls + 'px';
    g.fillStyle = color;
    g.textAlign = opt.align || 'left';
    g.textBaseline = 'alphabetic';
    if (CFG.mosaic.textShadow) { g.shadowColor = 'rgba(0,0,0,0.55)'; g.shadowBlur = CFG.mosaic.textShadow; g.shadowOffsetY = 2; }
    g.fillText(str, x, y);
    g.shadowColor = 'transparent'; g.shadowBlur = 0; g.shadowOffsetY = 0;
    return { w: g.measureText(str).width, size: fs };
  }
  // Schrift löst sich aus Pixelblöcken auf (Bildidee: Stille = verpixelt, Dialog = klar)
  function pixAt(start, t, dur = 0.2) {
    const d = t - start;
    if (d < 0) return -1;
    if (d >= dur) return 1;
    const steps = [34, 20, 12, 6, 3];
    return steps[Math.min(steps.length - 1, Math.floor(d / dur * steps.length))];
  }
  function withPix(pix, alpha, draw) {
    if (pix < 0 || alpha <= 0) return;
    if (pix <= 1 && alpha >= 1) { draw(ctx); return; }
    tctx.clearRect(0, 0, W, H);
    draw(tctx);
    const p = Math.max(1, pix);
    const sw = Math.ceil(W / p), sh = Math.ceil(H / p);
    ctx.save();
    ctx.globalAlpha = alpha;
    if (p > 1) {
      sctx.clearRect(0, 0, W, H);
      sctx.imageSmoothingEnabled = true; sctx.imageSmoothingQuality = 'high';
      sctx.drawImage(tmp, 0, 0, W, H, 0, 0, sw, sh);
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(small, 0, 0, sw, sh, 0, 0, sw * p, sh * p);
    } else {
      ctx.drawImage(tmp, 0, 0);
    }
    ctx.restore();
  }
  function reveal(start, t, draw, extraAlpha = 1) { withPix(pixAt(start, t), extraAlpha, draw); }

  // ---------- Hintergrund ----------
  function drawPhoto(t, tStart) {
    // Foto mit langsamem Zoom und Drift, startet nach dem Auflösen des Mosaiks
    const M = CFG.mosaic;
    const p = clamp((t - tStart) / Math.max(0.1, T.total - tStart), 0, 1);
    const zoom = 1 + M.kenBurns * p;
    const sc = Math.max(W / flyer.width, H / flyer.height);
    const vw = W / sc / zoom, vh = H / sc / zoom;
    const cx = flyer.width / 2 + M.drift * p, cy = flyer.height / 2;
    ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(flyer, cx - vw / 2, cy - vh / 2, vw, vh, 0, 0, W, H);
  }

  function drawBackground(t) {
    ctx.fillStyle = C.bg; ctx.fillRect(0, 0, W, H);
    const M = CFG.mosaic;
    const tb = ch('v3.c');
    let idx = M.startStep, clear = false;
    if (t >= tb) {
      idx = M.startStep + 1 + Math.floor((t - tb) / M.stepDuration);
      if (idx >= mosaics.length) { if (M.clear) clear = true; idx = mosaics.length - 1; }
    }
    const a = M.alphaStart + (M.alpha - M.alphaStart) * easeOut(clamp(t / M.fadeIn, 0, 1));
    ctx.save();
    ctx.globalAlpha = a;
    if (clear) {
      const tClear = tb + (mosaics.length - M.startStep - 1) * M.stepDuration;
      drawPhoto(t, tClear);
    } else {
      const m = mosaics[idx];
      ctx.imageSmoothingEnabled = false;
      ctx.drawImage(m.cv, 0, 0, m.sw, m.sh, 0, 0, m.sw * m.B, m.sh * m.B);
    }
    ctx.restore();
    ctx.fillStyle = `rgba(0,0,0,${M.dim})`;
    ctx.fillRect(0, 0, W, H);
    if (grain) {
      const f = Math.floor(t * CFG.format.fps);
      const ox = (f * 197) % 512, oy = (f * 131) % 512;
      ctx.save();
      ctx.globalCompositeOperation = 'overlay';
      ctx.globalAlpha = M.grain;
      for (let y = -oy; y < H; y += 512) for (let x = -ox; x < W; x += 512) ctx.drawImage(grain, x, y);
      ctx.restore();
    }
  }

  // ---------- Szenen ----------
  function scene1(t) {
    const x = MX, s = S.s1;
    const lines = [
      [TX.s1[0][0], 700, 'v1.a'], [TX.s1[0][1], 865, 'v1.a'],
      [TX.s1[1][0], 1080, 'v1.b'], [TX.s1[1][1], 1245, 'v1.b'],
    ];
    const c0 = cue('censor');
    // Verpixeln des Satzes: Stille wird sichtbar
    let pix = 1, alpha = 1;
    if (t >= c0) {
      const d = clamp((t - c0) / 0.75, 0, 1);
      pix = 1 + Math.pow(d, 1.6) * 110;
      alpha = 1 - clamp((d - 0.55) / 0.45, 0, 1);
    }
    if (alpha <= 0) return;
    withPix(t >= c0 ? pix : 1, alpha, g => {
      for (const [str, y, k] of lines) if (t >= ch(k)) {
        const p = pixAt(ch(k), t);
        if (p > 1 && t < c0) continue;   // wird unten separat aufgelöst
        text(g, str, x, y, s, C.text, { fit: W - 2 * MX });
      }
    });
    if (t < c0) for (const k of ['v1.a', 'v1.b']) {
      const p = pixAt(ch(k), t);
      if (p > 1) withPix(p, 1, g => {
        for (const [str, y, kk] of lines) if (kk === k) text(g, str, x, y, s, C.text, { fit: W - 2 * MX });
      });
    }
  }

  function scene2(t) {
    const t0 = ch('v2.a');
    const flash = t - t0 < 0.13;
    if (flash) { ctx.fillStyle = C.flash; ctx.fillRect(0, 0, W, H); }
    text(ctx, TX.s2, MX, 1020, S.s2, flash ? C.flashText : C.text, { fit: W - 2 * MX });
  }

  function stripes(t, t0, y0, gap, h) {
    const cols = [C.green, C.blue, C.yellow, C.red];
    cols.forEach((c, i) => {
      const d = clamp((t - t0 - i * 0.09) / 0.5, 0, 1);
      if (d <= 0) return;
      ctx.fillStyle = c;
      ctx.fillRect(0, y0 + i * gap, W * easeOut(d), h);
    });
  }

  function scene3(t) {
    const L = TX.s3, s = S.s3;
    reveal(ch('v3.a'), t, g => {
      text(g, L[0][0], MX, 760, s, C.text, { fit: W - 2 * MX });
      text(g, L[0][1], MX, 920, s, C.text, { fit: W - 2 * MX });
    });
    reveal(ch('v3.b'), t, g => text(g, L[1][0], MX, 1080, s, C.text, { fit: W - 2 * MX }));
    reveal(ch('v3.c'), t, g => {
      const sz = fitSize(g, L[2][0], S.s3dialog, W - 2 * MX - 60, 700, -S.s3dialog * 0.015);
      font(g, sz); g.letterSpacing = -sz * 0.015 + 'px';
      const w = g.measureText(L[2][0]).width;
      g.fillStyle = C.blue; g.fillRect(MX - 30, 1135, w + 60, sz * 1.18);
      text(g, L[2][0], MX, 1135 + sz * 0.93, S.s3dialog, '#FFFFFF', { fit: W - 2 * MX - 60 });
    });
    if (t >= ch('v3.c')) stripes(t, ch('v3.c') + 0.1, 1420, 34, 18);
  }

  function scene4(t) {
    const heads = TX.s4head, ks = ['v4.a', 'v4.b', 'v4.c', 'v4.d'];
    heads.forEach((h, i) => reveal(ch(ks[i]), t, g => text(g, h, MX, 450 + i * 92, S.s4head, i === 0 ? C.dim : C.text, { fit: W - 2 * MX })));
    TX.names.forEach((n, i) => {
      const t0 = cue('names' + i);
      reveal(t0, t, g => {
        const y = 860 + i * 190;
        g.fillStyle = C[n.color]; g.fillRect(MX, y, 16, 150);
        text(g, n.name, MX + 40, y + 70, S.nameName, C.text, { fit: W - 2 * MX - 40 });
        text(g, n.role, MX + 40, y + 128, S.nameRole, C.dim, { weight: 500, ls: 0, fit: W - 2 * MX - 40 });
      });
    });
  }

  function colorRow(g, y, h, x0 = MX, w = W - 2 * MX) {
    [C.green, C.blue, C.yellow, C.red].forEach((c, i) => { g.fillStyle = c; g.fillRect(x0 + i * w / 4, y, w / 4, h); });
  }

  function scene5(t) {
    const s5 = TX.s5;
    reveal(ch('v5.a'), t, g => {
      text(g, s5.weekday, MX, 500, S.s5weekday, C.dim, { weight: 500, ls: 2 });
      text(g, s5.date, MX, 790, S.s5date, C.text, { fit: W - 2 * MX, ls: -S.s5date * 0.03 });
      text(g, s5.year, MX, 930, S.s5year, C.text);
      colorRow(g, 975, 14);
    });
    reveal(ch('v5.b'), t, g => text(g, s5.time, MX, 1120, S.s5time, C.text, { fit: W - 2 * MX }));
    reveal(ch('v5.c'), t, g => {
      text(g, s5.venue, MX, 1290, S.s5venue, C.text, { fit: W - 2 * MX });
      text(g, s5.address[0], MX, 1360, S.s5address, C.dim, { weight: 500, ls: 0 });
      text(g, s5.address[1], MX, 1418, S.s5address, C.dim, { weight: 500, ls: 0 });
    });
  }

  function drawQR(g, x, y, size) {
    g.fillStyle = C.qrBg; g.fillRect(x, y, size, size);
    const n = QR.length, pad = 22, cell = Math.floor((size - 2 * pad) / n);
    const off = Math.floor((size - cell * n) / 2);
    g.fillStyle = C.qrFg;
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (QR[r][c]) g.fillRect(x + off + c * cell, y + off + r * cell, cell, cell);
  }

  function scene6(t) {
    const s6 = TX.s6, t0 = ch('v6.a');
    reveal(t0, t, g => {
      text(g, s6.title[0], MX, 420, S.s6title, C.text);
      text(g, s6.title[1], MX, 565, S.s6title, C.text, { fit: W - 2 * MX });
      text(g, s6.title[2], MX, 710, S.s6title, C.text, { fit: W - 2 * MX });
      font(g, S.s6tag, 700); g.letterSpacing = '6px';
      const w = g.measureText(s6.tag).width;
      g.fillStyle = C.blue; g.fillRect(MX, 780, w + 56, 100);
      text(g, s6.tag, MX + 28, 850, S.s6tag, '#FFFFFF', { ls: 6 });
      colorRow(g, 905, 12);
    });
    reveal(t0 + 0.45, t, g => {
      drawQR(g, MX, 975, 360);
      text(g, s6.qrCaption, MX, 1375, S.s6caption, C.dim, { weight: 500, ls: 0 });
      text(g, s6.open, MX + 400, 1070, S.s6open, C.text, { fit: W - MX - (MX + 400) });
      text(g, s6.price, MX + 400, 1140, S.s6price, C.dim, { weight: 500, ls: 0, fit: W - MX - (MX + 400) });
    });
    reveal(ch('v6.c'), t, g => {
      text(g, s6.url, MX, 1480, S.s6url, C.text, { fit: W - 2 * MX });
      const bw = 520, bh = 96;
      g.fillStyle = C.pill;
      g.beginPath(); g.roundRect(MX, 1510, bw, bh, 48); g.fill();
      text(g, s6.button, MX + bw / 2, 1510 + 66, S.s6button, C.pillText, { align: 'center', ls: 0 });
    });
  }

  function render(t, opts = {}) {
    drawBackground(t);
    const a = ch('v2.a'), b = ch('v3.a'), c = ch('v4.a'), d = ch('v5.a'), e = ch('v6.a');
    if (t >= ch('v3.c') && t < e) text(ctx, TX.tag, MX, 345, S.tag, C.dim, { weight: 500, ls: 1 });
    if (t < a) scene1(t);
    else if (t < b) scene2(t);
    else if (t < c) scene3(t);
    else if (t < d) scene4(t);
    else if (t < e) scene5(t);
    else scene6(t);
    // Ausblenden am Ende
    const fade = clamp((T.total - t) / 0.5, 0, 1);
    if (fade < 1) { ctx.fillStyle = `rgba(7,8,6,${1 - fade})`; ctx.fillRect(0, 0, W, H); }
    if (opts.safe) {
      ctx.strokeStyle = 'rgba(255,0,0,0.8)'; ctx.lineWidth = 3;
      const y0 = H * CFG.format.safeTop, y1 = H * (1 - CFG.format.safeBottom);
      ctx.strokeRect(MX, y0, W - 2 * MX, y1 - y0);
    }
  }

  window.renderFrame = render;
  window.sceneInit = init;
})();
