(() => {
  "use strict";
  const YEAR = 2026;
  const KEY = "klartext-advent-2026";
  const $ = (s, el = document) => el.querySelector(s);
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

  // ---------- State ----------
  const defaults = { name: "", situation: "single", time: "08:00", preview: false, notes: {}, done: {}, fav: null, onboarded: false };
  let state = load();
  function load() {
    try { return { ...defaults, ...JSON.parse(localStorage.getItem(KEY) || "{}") }; } catch { return { ...defaults }; }
  }
  function save() { try { localStorage.setItem(KEY, JSON.stringify(state)); } catch { toast("Speichern nicht möglich. Prüfe deine Browser-Einstellungen."); } }

  // ---------- Dates ----------
  function unlockedDay() {
    if (state.preview) return 24;
    const n = new Date();
    if (n.getFullYear() > YEAR) return 24;
    if (n.getFullYear() < YEAR || n.getMonth() < 11) return 0;
    return Math.min(n.getDate(), 24);
  }
  const daysUntilStart = () => Math.max(1, Math.ceil((new Date(YEAR, 11, 1) - new Date()) / 864e5));
  const sit = () => SITUATIONS.find((s) => s.id === state.situation) || SITUATIONS[0];
  const doneCount = () => Object.values(state.done).filter(Boolean).length;
  const noteCount = () => Object.values(state.notes).filter((t) => t && t.trim()).length;

  // ---------- Toast ----------
  let toastTimer;
  function toast(msg) {
    const t = $("#toast"); t.textContent = msg; t.classList.add("on");
    clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove("on"), 2600);
  }

  // ---------- Render: calendar ----------
  function renderHeader() {
    const h = new Date().getHours();
    const hello = h < 11 ? "Guten Morgen" : h < 18 ? "Hallo" : "Guten Abend";
    $("#greeting").textContent = state.name ? `${hello}, ${state.name}` : hello;
    const pct = (doneCount() / 24) * 100;
    $("#ring").style.setProperty("--p", pct);
    $("#ringText").textContent = `${doneCount()} von 24 Schritten`;
    $("#ring").setAttribute("aria-label", `${doneCount()} von 24 Schritten erledigt`);
  }

  function renderSituations() {
    const box = $("#situations"); box.innerHTML = "";
    SITUATIONS.forEach((s) => {
      const b = document.createElement("button");
      b.role = "tab"; b.textContent = s.label; b.setAttribute("aria-selected", String(s.id === state.situation));
      b.onclick = () => { state.situation = s.id; save(); renderCalendar(); toast(`Situation: ${s.label}. Alle Türchen passen sich an.`); };
      box.appendChild(b);
    });
    $("#situationHint").textContent = sit().hint + " Du kannst jederzeit wechseln. Deine Notizen bleiben.";
  }

  function renderGrid() {
    const grid = $("#grid"); grid.innerHTML = "";
    const open = unlockedDay();
    const today = state.preview ? 0 : open;
    for (let d = 1; d <= 24; d++) {
      const b = document.createElement("button");
      const isOpen = d <= open;
      const cls = ["tile"];
      if (!isOpen) cls.push("locked"); else cls.push(state.done[d] ? "done" : "open");
      if (d === today && new Date().getDate() === d) cls.push("today");
      b.className = cls.join(" ");
      b.innerHTML = `${d}${isOpen ? `<small>${state.done[d] ? "erledigt" : state.notes[d] ? "notiert" : "offen"}</small>` : ""}`;
      b.setAttribute("aria-label", `Türchen ${d}, ${isOpen ? (state.done[d] ? "erledigt" : "offen") : "noch verschlossen"}`);
      b.onclick = () => {
        if (!isOpen) {
          b.classList.remove("shake"); void b.offsetWidth; b.classList.add("shake");
          toast(`Türchen ${d} öffnet sich am ${d}. Dezember.`); return;
        }
        openDoor(d);
      };
      grid.appendChild(b);
    }
    const hint = $("#gridHint");
    if (open === 0) hint.textContent = `Noch ${daysUntilStart()} Tage bis zum 1. Dezember. In den Einstellungen kannst du Name und Erinnerung festlegen oder den Testmodus anschalten.`;
    else if (open < 24) hint.textContent = "Verpasste Türchen holst du jederzeit nach. Du musst nicht jeden Tag alles machen.";
    else hint.textContent = "Alle Türchen sind offen. Dein Rückblick wartet.";
  }

  function renderCalendar() { renderHeader(); renderSituations(); renderGrid(); renderReview(); }

  // ---------- Door ----------
  const dlg = $("#door");
  function openDoor(d) {
    const day = DAYS[d - 1], [take, tip] = day.s[state.situation];
    const note = state.notes[d] || "";
    dlg.innerHTML = `
      <div class="sheet">
        <header>
          <div><div class="num">${d}. Dezember</div><div class="theme">${esc(day.theme)}</div></div>
          <button class="close" aria-label="Schließen" data-close>×</button>
        </header>
        <div class="take"><small>Der Take</small>${esc(take)}</div>
        <div class="block"><div class="label">Für dich · ${esc(sit().label)}</div><p style="margin:0">${esc(tip)}</p></div>
        <div class="block"><div class="label">Fakt übers Leben</div><p style="margin:0">${esc(day.fact)}</p></div>
        <div class="block">
          <div class="label">Schreib's auf</div>
          <div class="q">${esc(day.q)}</div>
          <textarea id="note" placeholder="Nur für dich. Bleibt auf diesem Gerät." aria-label="Deine Notiz">${esc(note)}</textarea>
          <div class="saved" id="saved" aria-live="polite"></div>
        </div>
        <div class="block">
          <div class="label">Mach's heute</div>
          <label class="check"><input type="checkbox" id="chk" ${state.done[d] ? "checked" : ""}><span class="box">✓</span><span>${esc(day.a)}</span></label>
        </div>
        <div class="actions">
          <button class="btn" id="btnShare">Take als Story-Kachel teilen</button>
          <button class="btn ghost" data-close>Fertig</button>
        </div>
      </div>`;
    if (!dlg.open) dlg.showModal();
    let t;
    const ta = $("#note", dlg);
    ta.addEventListener("input", () => {
      $("#saved").textContent = "Speichert …";
      clearTimeout(t);
      t = setTimeout(() => { commitNote(d, ta.value); $("#saved").textContent = "Gespeichert"; }, 400);
    });
    ta.addEventListener("blur", () => commitNote(d, ta.value));
    $("#chk", dlg).addEventListener("change", (e) => {
      state.done[d] = e.target.checked; save(); renderHeader(); renderGrid();
      if (e.target.checked) toast(doneCount() === 24 ? "Alle 24 Schritte geschafft. Stark." : "Abgehakt. Das fühlt sich besser an als Grübeln.");
    });
    $("#btnShare", dlg).onclick = () => shareTile(d, take);
  }
  function commitNote(d, v) {
    const clean = v.replace(/\s+$/, "");
    if (clean) state.notes[d] = clean; else delete state.notes[d];
    save(); renderGrid(); renderReview();
  }
  dlg.addEventListener("click", (e) => {
    if (e.target === dlg || e.target.closest("[data-close]")) dlg.close();
  });

  // ---------- Share tile ----------
  const palettes = { single: ["#ff5a4f", "#ff9a6b"], komplex: ["#7a5cff", "#ff6bb5"], getrennt: ["#2f6fff", "#5fd0c3"], vergeben: ["#e8467c", "#ffb25b"] };
  function wrap(ctx, text, max) {
    const words = text.split(" "), lines = []; let line = "";
    for (const w of words) {
      const test = line ? line + " " + w : w;
      if (ctx.measureText(test).width > max && line) { lines.push(line); line = w; } else line = test;
    }
    if (line) lines.push(line); return lines;
  }
  async function shareTile(d, take) {
    const W = 1080, H = 1920, c = document.createElement("canvas"); c.width = W; c.height = H;
    const ctx = c.getContext("2d"), [a, b] = palettes[state.situation];
    const g = ctx.createLinearGradient(0, 0, W, H); g.addColorStop(0, a); g.addColorStop(1, b);
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = "rgba(255,255,255,.9)"; ctx.font = "700 40px system-ui, sans-serif"; ctx.textBaseline = "alphabetic";
    ctx.fillText(`TÜRCHEN ${d}`, 90, 220);
    ctx.fillStyle = "#fff"; let size = 92, lines;
    do { ctx.font = `800 ${size}px system-ui, -apple-system, sans-serif`; lines = wrap(ctx, take, W - 180); size -= 4; }
    while (lines.length * size * 1.18 > H * 0.55 && size > 48);
    const lh = size * 1.22 + 4, startY = (H - lines.length * lh) / 2 + size * 0.4;
    lines.forEach((l, i) => ctx.fillText(l, 90, startY + i * lh));
    ctx.font = "600 38px system-ui, sans-serif"; ctx.fillStyle = "rgba(255,255,255,.85)";
    ctx.fillText("Klartext Advent", 90, H - 150);
    const blob = await new Promise((r) => c.toBlob(r, "image/png"));
    const file = new File([blob], `klartext-tuerchen-${d}.png`, { type: "image/png" });
    try {
      if (navigator.canShare && navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], text: take }); return; }
    } catch (e) { if (e && e.name === "AbortError") return; }
    download(blob, file.name); toast("Kachel gespeichert. Poste sie als Story.");
  }
  function download(blob, name) {
    const url = URL.createObjectURL(blob), a = document.createElement("a");
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  // ---------- Review ----------
  function renderReview() {
    const box = $("#reviewBody");
    const notes = Object.entries(state.notes).map(([d, t]) => [Number(d), t]).sort((x, y) => x[0] - y[0]);
    const ready = unlockedDay() >= 24;
    if (!ready) {
      box.innerHTML = `<div class="empty"><p><b>Dein Rückblick öffnet sich am 24. Dezember.</b></p><p>Bis dahin sammelst du hier ${noteCount()} Notizen. Alles, was du aufschreibst, kommt dann zusammen zurück.</p></div>`;
      return;
    }
    if (!notes.length) { box.innerHTML = `<div class="empty"><p>Du hast noch nichts aufgeschrieben. Öffne ein Türchen und beantworte die Frage.</p></div>`; return; }
    const fav = state.fav && state.notes[state.fav] ? state.notes[state.fav] : null;
    box.innerHTML = `
      <div class="letter">
        <div class="label">Dein Advent ${YEAR}</div>
        <h2>Liebe${state.name ? " " + esc(state.name) : ""},</h2>
        <p>Du hast ${doneCount()} von 24 Schritten gemacht und ${notes.length} Mal etwas für dich aufgeschrieben.</p>
        ${fav ? `<div class="label">Dein Satz für ${YEAR + 1}</div><div class="sentence">${esc(fav)}</div>` : `<p class="hint">Tippe unten bei einer Notiz auf „Als meinen Satz wählen“.</p>`}
      </div>
      <div class="letter">${notes.map(([d, t]) => `
        <div class="entry">
          <b>Türchen ${d} · ${esc(DAYS[d - 1].theme)}</b>
          <p><i>${esc(DAYS[d - 1].q)}</i></p>
          <p>${esc(t)}</p>
          <button class="no-print" data-fav="${d}">${state.fav === d ? "Dein Satz ✓" : "Als meinen Satz wählen"}</button>
          <button class="no-print" data-del="${d}">Löschen</button>
        </div>`).join("")}</div>
      <div class="row no-print"><button class="btn" id="btnPrint">Als PDF sichern</button></div>`;
    box.querySelectorAll("[data-fav]").forEach((b) => b.onclick = () => { state.fav = Number(b.dataset.fav); save(); renderReview(); });
    box.querySelectorAll("[data-del]").forEach((b) => b.onclick = () => {
      if (!confirm("Diese Notiz löschen?")) return;
      delete state.notes[b.dataset.del]; if (state.fav === Number(b.dataset.del)) state.fav = null; save(); renderCalendar();
    });
    $("#btnPrint").onclick = () => window.print();
  }

  // ---------- Settings ----------
  function bindSettings() {
    const name = $("#setName"), time = $("#setTime"), prev = $("#setPreview");
    name.value = state.name; time.value = state.time; prev.checked = state.preview;
    name.addEventListener("input", () => { state.name = name.value.trim().slice(0, 30); save(); renderHeader(); });
    time.addEventListener("change", () => { state.time = time.value || "08:00"; save(); });
    prev.addEventListener("change", () => { state.preview = prev.checked; save(); renderCalendar(); toast(prev.checked ? "Testmodus an. Alle Türchen sind offen." : "Testmodus aus."); });
    $("#btnIcs").onclick = exportIcs;
    $("#btnExport").onclick = () => download(new Blob([JSON.stringify(state, null, 2)], { type: "application/json" }), "klartext-advent-daten.json");
    $("#btnWipe").onclick = () => {
      if (!confirm("Alle Notizen und Fortschritte auf diesem Gerät löschen? Das lässt sich nicht rückgängig machen.")) return;
      try { localStorage.removeItem(KEY); } catch {}
      state = { ...defaults, onboarded: true }; bindSettings(); renderCalendar(); toast("Alles gelöscht.");
    };
  }
  function exportIcs() {
    const [hh, mm] = state.time.split(":"), pad = (n) => String(n).padStart(2, "0");
    const stamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
    const url = location.href.split("#")[0];
    const ics = ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Klartext Advent//DE", "CALSCALE:GREGORIAN", "BEGIN:VEVENT",
      `UID:klartext-${YEAR}@advent`, `DTSTAMP:${stamp}`, `DTSTART:${YEAR}1201T${pad(hh)}${pad(mm)}00`, `DTEND:${YEAR}1201T${pad(hh)}${pad(Number(mm) + 5 > 59 ? 59 : Number(mm) + 5)}00`,
      "RRULE:FREQ=DAILY;COUNT=24", "SUMMARY:Dein Türchen wartet", `DESCRIPTION:Öffne dein Türchen: ${url}`, `URL:${url}`,
      "BEGIN:VALARM", "TRIGGER:PT0S", "ACTION:DISPLAY", "DESCRIPTION:Dein Türchen wartet", "END:VALARM", "END:VEVENT", "END:VCALENDAR"].join("\r\n");
    download(new Blob([ics], { type: "text/calendar" }), "klartext-advent.ics");
    toast("Kalenderdatei geladen. Öffne sie, um die Termine zu speichern.");
  }

  // ---------- Tabs ----------
  document.querySelectorAll(".tabs button").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".tabs button").forEach((x) => x.classList.toggle("on", x === b));
    document.querySelectorAll(".view").forEach((v) => v.hidden = v.id !== "view-" + b.dataset.view);
    window.scrollTo({ top: 0 });
  }));

  // ---------- Welcome ----------
  function welcome() {
    const w = $("#welcome");
    w.innerHTML = `<div class="sheet welcome-sheet">
      <div class="eyebrow">Klartext Advent</div>
      <h2>24 Türchen. Ein Dezember für dich.</h2>
      <p>Jeden Morgen ein ehrlicher Take, ein Tipp, ein Fakt aus der Psychologie, eine Frage zum Aufschreiben und ein kleiner Schritt.</p>
      <label class="field"><span>Wie heißt du?</span><input id="wName" type="text" autocomplete="given-name" placeholder="Vorname"></label>
      <div class="label">Deine Situation</div>
      <div class="seg" id="wSit" style="margin-bottom:18px"></div>
      <button class="btn block" id="wGo">Los geht’s</button>
      <p class="hint small">Notizen bleiben auf diesem Gerät. Kein Konto, kein Abo.</p>
    </div>`;
    const seg = $("#wSit", w);
    SITUATIONS.forEach((s) => {
      const b = document.createElement("button"); b.textContent = s.label; b.setAttribute("aria-selected", String(s.id === state.situation));
      b.onclick = () => { state.situation = s.id; seg.querySelectorAll("button").forEach((x) => x.setAttribute("aria-selected", String(x === b))); };
      seg.appendChild(b);
    });
    $("#wGo", w).onclick = () => {
      state.name = $("#wName", w).value.trim().slice(0, 30); state.onboarded = true; save();
      $("#setName").value = state.name; w.close(); renderCalendar();
    };
    w.addEventListener("cancel", (e) => e.preventDefault());
    w.showModal();
  }

  // ---------- Init ----------
  bindSettings();
  renderCalendar();
  if (!state.onboarded) welcome();
  if ("serviceWorker" in navigator && location.protocol.startsWith("http")) navigator.serviceWorker.register("sw.js").catch(() => {});
})();
