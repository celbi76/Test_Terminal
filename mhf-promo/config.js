// Alle änderbaren Werte für das Promo-Video "3. MentalHealth Forum Stäfa".
// Zeiten in Sekunden. Lautstärken in dB (0 = unverändert, negativ = leiser).
//
// Zeitangaben können eine Zahl sein oder ein Bezug auf eine Stimm-Zeile:
//   { ref: 'v3.c', edge: 'start' | 'end', offset: 0.5 }
// 'v3.c' ist Zeile v3, Teilstück c. Alle Animationen und Soundeffekte hängen an diesen Zeiten.

module.exports = {
  format: {
    width: 1080,
    height: 1920,
    fps: 30,
    tail: 1.8,          // Sekunden Ausklang nach dem letzten gesprochenen Wort
    maxDuration: 40,    // Abbruch, falls das Video länger wird
    safeTop: 0.15,      // Anteil der Höhe, der frei bleibt (Plattform-Einblendungen)
    safeBottom: 0.15,
    marginX: 84,
  },

  video: {
    crf: 14,            // Qualität (kleiner = besser, grösser = kleinere Datei)
    maxrate: null,      // z. B. '10M' begrenzt die Bitrate (nötig bei Filmkorn)
    bufsize: null,
  },

  colors: {
    bg: '#070806',
    text: '#F4F2EA',
    dim: '#A9ABA0',
    green: '#0E8A4F',   // Streifen aus dem Flyer, aufgehellt für Lesbarkeit
    blue: '#1457C7',
    yellow: '#E0B22E',
    red: '#B3261E',
    pill: '#E5EBFA',    // Button-Farbe der Website
    pillText: '#0A0A0A',
    qrBg: '#FFFFFF',
    qrFg: '#000000',
    flash: '#F4F2EA',   // Hintergrund beim Schlag auf "Burnout."
    flashText: '#070806',
  },

  fonts: {
    family: 'Bai Jamjuree',        // Schrift der Website
    files: { 500: 'assets/fonts/bai-jamjuree-latin-500-normal.woff2', 700: 'assets/fonts/bai-jamjuree-latin-700-normal.woff2' },
  },

  // Foto-Textur: Flyer, verpixelt. Blockgrösse in Pixeln, grob = Stille, fein = Dialog.
  mosaic: {
    image: 'assets/flyer.png',
    steps: [200, 150, 112, 84, 64, 50],   // Stufen von "stumm" bis "Dialog"
    startStep: 0,
    stepDuration: 0.22,                   // Sekunden pro Stufe beim Auflösen
    fadeIn: 1.4,                          // Einblenden am Anfang
    alphaStart: 0.0,
    alpha: 1.0,                           // Deckkraft der Mosaik-Fläche
    gain: 0.5,                            // Helligkeit der Mosaik-Farben (Lesbarkeit der Schrift)
    dim: 0.2,                             // schwarze Abdunklung über dem Mosaik
    clear: false,                         // true: nach der letzten Stufe erscheint das Foto scharf
    kenBurns: 0,                          // Zoom über die Restdauer (0.10 = 10 %)
    drift: 0,                             // seitliche Drift in Bildpixeln
    grain: 0,                             // Filmkorn (0 bis 1)
    textShadow: 0,                        // weicher dunkler Schatten hinter der Schrift (Blur in px)
  },

  // Sichtbare Texte
  text: {
    s1: [['Psychische', 'Gesundheit'], ['wird oft', 'verdrängt.']],     // je Teilstück von v1
    tag: '3. MentalHealth Forum Stäfa',   // kleine Kennung oben ab "Dialog."
    s2: 'Burnout.',
    s3: [['Wenn Arbeit', 'krank macht,'], ['braucht es'], ['Dialog.']], // je Teilstück von v3
    s4head: ['Ein Podiumsgespräch', 'mit Betroffenen,', 'Experten', 'und Führungskräften.'],
    names: [
      { name: 'Michel Bamert', role: 'Einführung und Moderation', color: 'green' },
      { name: 'Melanie Sudan', role: 'Expertin für berufliche Reintegration', color: 'blue' },
      { name: 'Bettina Wolgensinger', role: 'Perspektive aus eigener Erfahrung', color: 'yellow' },
      { name: 'Marcel Biegger', role: 'Führungsperson im Gesundheitswesen', color: 'red' },
    ],
    s5: {
      weekday: 'Donnerstag',
      date: '05.11.',
      year: '2026',
      time: '19 bis 21 Uhr',
      venue: 'Hellraum Galerie',
      address: ['Bergstrasse 1, 8712 Stäfa', 'beim Bahnhof Stäfa'],
    },
    s6: {
      title: ['3.', 'MentalHealth', 'Forum Stäfa'],
      tag: 'STOP SILENCE',
      open: 'Offen für alle',
      price: 'Abendkasse sFr. 15.-',
      qrCaption: 'Infos und Anmeldung',
      url: 'mentalhealth-forum.ch',
      button: 'Ticket sichern',
    },
  },

  qr: { url: 'https://www.mentalhealth-forum.ch/event-details/3-mentalhealth-forum-stafa' },

  // Schriftgrössen in Pixeln
  sizes: {
    s1: 164, s2: 196, s3: 150, s3dialog: 176,
    s4head: 76, tag: 36, nameName: 74, nameRole: 40,
    s5weekday: 56, s5date: 290, s5year: 120, s5time: 84, s5venue: 84, s5address: 44,
    s6title: 138, s6tag: 60, s6open: 52, s6price: 48, s6caption: 36, s6url: 56, s6button: 56,
  },

  // Gesprochener Text. "say" darf anders geschrieben sein als der Text im Bild (Aussprache).
  // lang 'en' liest das Teilstück mit englischer Stimme.
  voice: {
    enabled: false,              // false = ohne Stimme (Texte und Zeiten bleiben, Ton fällt weg)
    engine: 'espeak-mbrola',
    voice: 'mb-de2',             // Vergleichsstimmen: mb-de4, mb-de6, mb-de8 (siehe out/stimmen/)
    samplesVoices: ['mb-de2', 'mb-de4', 'mb-de6'],
    speed: 160,                  // Wörter pro Minute
    pitch: 42,
    enVoice: 'en-gb',
    enSpeed: 135,
    enPitch: 40,
    gap: 0.14,                   // Pause zwischen Teilstücken in Sekunden
    reverbWet: 0.10,
    gainDb: 0,
    // Eigene Aufnahme: Datei assets/voice/<zeile>.wav (z. B. v3.wav) ersetzt die ganze Zeile.
    lines: [
      { id: 'v1', at: 1.1, chunks: [
        { id: 'a', say: 'Psychische Gesundheit' },
        { id: 'b', say: 'wird oft verdrängt.' } ] },
      { id: 'v2', at: { ref: 'v1.b', edge: 'end', offset: 1.5 }, chunks: [
        { id: 'a', say: 'Burnout.' } ] },
      { id: 'v3', at: { ref: 'v2.a', edge: 'end', offset: 1.5 }, chunks: [
        { id: 'a', say: 'Wenn Arbeit krank macht,' },
        { id: 'b', say: 'braucht es' },
        { id: 'c', say: 'Dialog.', pauseBefore: 0.55 } ] },
      { id: 'v4', at: { ref: 'v3.c', edge: 'end', offset: 1.2 }, chunks: [
        { id: 'a', say: 'Ein Podiumsgespräch' },
        { id: 'b', say: 'mit Betroffenen,' },
        { id: 'c', say: 'Experten' },
        { id: 'd', say: 'und Führungskräften.' } ] },
      { id: 'v5', at: { ref: 'v4.d', edge: 'end', offset: 5.3 }, chunks: [
        { id: 'a', say: 'Donnerstag, 5. November.' },
        { id: 'b', say: '19 bis 21 Uhr.' },
        { id: 'c', say: 'Hellraum Galerie, Stäfa.' } ] },
      { id: 'v6', at: { ref: 'v5.c', edge: 'end', offset: 0.8 }, chunks: [
        { id: 'a', say: 'Stop Silence.', lang: 'en' },
        { id: 'c', say: 'Ticket sichern auf Mentalhelth Forum Punkt C H.' } ] },
    ],
  },

  // Benannte Zeitpunkte für Bild und Ton
  cues: {
    censor: { ref: 'v1.b', edge: 'end', offset: 0.45 },    // Satz wird verpixelt
    names0: { ref: 'v4.d', edge: 'end', offset: 0.9 },
    names1: { ref: 'v4.d', edge: 'end', offset: 1.9 },
    names2: { ref: 'v4.d', edge: 'end', offset: 2.9 },
    names3: { ref: 'v4.d', edge: 'end', offset: 3.9 },
  },

  // Ton
  audio: {
    sampleRate: 48000,
    bpm: 72,
    loudnessLUFS: -16,
    truePeakDb: -1.5,
    // Lautstärke pro Spur (dB, vor der Gesamtnormalisierung)
    tracks: {
      voice: 0,
      pad: -17,
      bass: -15,
      bells: -22,
      hat: -30,
      tension: -22,        // leises Ansteigen vor "Dialog."
      roomtone: -80,       // -80 = aus. Absichtlich echte Stille am Anfang.
    },
    duckDb: -9,            // Musik unter der Sprache
    duckAttack: 0.04,
    duckRelease: 0.45,
    musicFadeOut: 1.8,
    // Soundeffekte: type, Zeitpunkt (cue/Zeile), Lautstärke
    sfx: {
      tick: -16,           // Klick bei jedem neuen Text
      nameTick: -12,
      glitch: -17,
      boom: -10,
      bloom: -11,
      hit: -13,
    },
    // Ticks bei jedem Teilstück dieser Zeilen (ausser den Ausnahmen)
    tickLines: ['v1', 'v3', 'v4', 'v5', 'v6'],
    tickSkip: ['v3.c', 'v6.a'],
    events: [
      { type: 'glitch', cue: 'censor' },
      { type: 'boom', ref: 'v2.a', edge: 'start' },
      { type: 'bloom', ref: 'v3.c', edge: 'start' },
      { type: 'nameTick', cue: 'names0' },
      { type: 'nameTick', cue: 'names1' },
      { type: 'nameTick', cue: 'names2' },
      { type: 'nameTick', cue: 'names3' },
      { type: 'hit', ref: 'v6.a', edge: 'start' },
    ],
    musicStart: { ref: 'v3.c', edge: 'start', offset: 0 },   // Musik setzt bei "Dialog." ein
  },

  // Zweitversion: echtes Foto statt Mosaik-Look. Überschreibt Werte oben.
  // Aufruf: ./build.sh foto   (Ausgabe out/mhf-promo-foto.mp4, gleicher Ton)
  variants: {
    foto: {
      output: 'mhf-promo-foto',
      video: { crf: 21, maxrate: '4M', bufsize: '8M' },     // Filmkorn braucht sonst über 300 MB
      colors: { dim: '#E8EADF' },               // hellere Nebentexte auf dem Foto
      mosaic: {
        image: 'assets/flyer_clean.png',        // Flyer-Foto ohne Schrift (tools/clean_flyer.py)
        steps: [200, 150, 112, 84, 64, 48, 34, 22, 14, 8],
        stepDuration: 0.17,
        gain: 1.0,
        dim: 0.3,
        clear: true,
        kenBurns: 0.12,
        drift: -110,
        grain: 0.16,
        textShadow: 30,
      },
    },
  },
};
