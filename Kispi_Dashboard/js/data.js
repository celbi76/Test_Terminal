// ============================================================
// KISPI DASHBOARD — Datenkonfiguration & Datengenerierung
// ============================================================

// Bettenkapazität: IPS 25 | IMC/Neo = Intensiv | Normalbetten gesamt 200
// Normalbetten: Notfall 20 + Onko 30 + Chir 45 + Med A 35 + Med B 35 + Neuro 35 = 200
const DEPARTMENTS = [
  { id: 'ips',    name: 'IPS',        fullName: 'Intensivpflegestation',      beds: 25, type: 'icu',       floor: 'K1',  color: '#E63946' },
  { id: 'imc',    name: 'IMC',        fullName: 'Intermediate Care',           beds: 12, type: 'imc',       floor: 'K1',  color: '#F7941D' },
  { id: 'notfall',name: 'Notfall',    fullName: 'Notfallstation',              beds: 20, type: 'emergency', floor: 'EG',  color: '#FF6B35' },
  { id: 'neo',    name: 'Neo',        fullName: 'Neonatologie',                beds: 16, type: 'nicu',      floor: '1',   color: '#9B59B6' },
  { id: 'onko',   name: 'Onkologie',  fullName: 'Onkologie / Hämatologie',     beds: 30, type: 'ward',      floor: '2',   color: '#2980B9' },
  { id: 'chir',   name: 'Chirurgie',  fullName: 'Chirurgie',                   beds: 45, type: 'ward',      floor: '3',   color: '#27AE60' },
  { id: 'med_a',  name: 'Medizin A',  fullName: 'Medizin A (Allgemein)',        beds: 35, type: 'ward',      floor: '4',   color: '#16A085' },
  { id: 'med_b',  name: 'Medizin B',  fullName: 'Medizin B (Spezial)',          beds: 35, type: 'ward',      floor: '5',   color: '#1E8BC3' },
  { id: 'neuro',  name: 'Neurologie', fullName: 'Neurologie / Neuropädiatrie', beds: 35, type: 'ward',      floor: '6',   color: '#8E44AD' },
];

const SHIFTS = [
  { id: 'F', label: 'Frühdienst',  time: '07:00–14:00', icon: '🌅' },
  { id: 'S', label: 'Spätdienst',  time: '14:00–22:00', icon: '🌆' },
  { id: 'N', label: 'Nachtdienst', time: '22:00–07:00', icon: '🌙' },
];

// EPA-AC Kids Version 2.0 — Pädiatrisch validiertes Pflegeaufwand-Assessment
// Quelle: Universitätskinderspital Zürich / LEP AG
// IPS und IMC werden mit NEMS bewertet, nicht mit EPA-AC Kids
const EPA_LEVELS = [
  { level: 1, label: 'Stufe 1 – Gering',     shortLabel: 'Gering',    color: '#2DC653', ratio: '1:8',   weight: 1.0,
    desc: 'Kind/Jugendliche·r weitgehend selbständig, minimale Pflegeunterstützung' },
  { level: 2, label: 'Stufe 2 – Teilweise',  shortLabel: 'Teilweise', color: '#7BC67E', ratio: '1:5',   weight: 1.6,
    desc: 'Teilassistenz, entwicklungsgerechte Unterstützung bei Alltagsaktivitäten' },
  { level: 3, label: 'Stufe 3 – Vollständig',shortLabel: 'Vollständig',color: '#F7941D', ratio: '1:3',   weight: 2.8,
    desc: 'Vollassistenz, Kind vollständig pflegeabhängig, inkl. Familiensupport' },
  { level: 4, label: 'Stufe 4 – Komplex',    shortLabel: 'Komplex',   color: '#E67E22', ratio: '1:1.5', weight: 4.5,
    desc: 'Erhöhter/komplexer Pflegebedarf, multidisziplinäre Interventionen' },
  { level: 5, label: 'Stufe 5 – Intensiv',   shortLabel: 'Intensiv',  color: '#E63946', ratio: '2:1',   weight: 7.0,
    desc: 'Maximaler Pflegebedarf, hochintensive Betreuung (prä-IPS / krisenhafte Situation)' },
];

// NEMS Score (Nine Equivalents of nursing Manpower use Score) — ICU only
const NEMS_ITEMS = [
  { id: 'monitoring',     label: 'Basis-Monitoring',            score: 1.2 },
  { id: 'lab',            label: 'Laboruntersuchungen',          score: 4.5 },
  { id: 'ventilation',    label: 'Mechanische Beatmung',         score: 5.2 },
  { id: 'ventsupp',       label: 'Ventilationsunterstützung',    score: 1.4 },
  { id: 'vaso_single',    label: 'Vasoaktive Medikamente (1)',   score: 1.7 },
  { id: 'vaso_multi',     label: 'Vasoaktive Medikamente (>1)',  score: 10.9 },
  { id: 'dialysis',       label: 'Nierenersatztherapie',         score: 7.7 },
  { id: 'interv_icu',     label: 'Interventionen (ICU)',         score: 1.8 },
  { id: 'interv_ext',     label: 'Interventionen (extern)',      score: 4.5 },
];

// Skill-Grade-Mix Targets (% per role)
const SKILL_MIX_TARGET = {
  pflegefachpersonen: 60,
  pflegeassistenz:    25,
  auszubildende:      15,
};

// Pool & Threshold Configuration
const THRESHOLDS = {
  occupancy_warning:    80,
  occupancy_critical:   95,
  staff_coverage_min:   90,
  epa_complexity_high:  3.5,
  pool_request_trigger: 0.85,
  pool_release_trigger: 0.70,
};

// ── Hilfsfunktionen ──────────────────────────────────────────

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomFloat(min, max, decimals = 1) {
  return parseFloat((Math.random() * (max - min) + min).toFixed(decimals));
}

function getCurrentShift() {
  const h = new Date().getHours();
  if (h >= 7  && h < 14) return 'F';
  if (h >= 14 && h < 22) return 'S';
  return 'N';
}

// ── Aktuelle Schichtdaten (Live-Demo-Daten) ──────────────────

function generateCurrentShiftData() {
  const now = new Date();
  const shift = getCurrentShift();

  return DEPARTMENTS.map(dept => {
    const isICU      = dept.type === 'icu'  || dept.type === 'nicu';
    const isIMC      = dept.type === 'imc';
    const isEmerg    = dept.type === 'emergency';
    const occupied   = randomInt(Math.floor(dept.beds * 0.55), Math.floor(dept.beds * 0.97));
    const reserved   = isICU ? randomInt(0, 2) : randomInt(0, 3);

    // EPA-AC Kids V2.0 — IPS wird NICHT mit EPA-AC bewertet (nur NEMS)
    // IMC bekommt EPA-AC UND NEMS
    const isIPS      = dept.id === 'ips';
    let epaScores    = [];
    if (!isIPS) {
      for (let i = 0; i < occupied; i++) {
        if (isIMC)       epaScores.push(randomInt(3, 5));
        else if (isEmerg)epaScores.push(randomInt(2, 4));
        else             epaScores.push(randomInt(1, 4));
      }
    }
    const epaAvg = epaScores.length > 0
      ? parseFloat((epaScores.reduce((a, b) => a + b, 0) / epaScores.length).toFixed(1))
      : null;
    const epaDistrib = [1,2,3,4,5].map(lvl => epaScores.filter(s => s === lvl).length);

    // NEMS: IPS (icu/nicu) UND IMC
    const showNems = isICU || isIMC;
    const nemsAvg  = showNems
      ? (isIPS ? randomFloat(16, 32, 1) : isIMC ? randomFloat(10, 20, 1) : randomFloat(12, 28, 1))
      : null;

    // Staff
    const staffTarget = isICU
      ? Math.ceil(occupied / 1.2)
      : isIMC
        ? Math.ceil(occupied / 2.5)
        : isEmerg
          ? randomInt(4, 8)
          : Math.ceil(occupied / 4.5);
    const staffActual    = Math.max(1, staffTarget + randomInt(-2, 2));
    const staffCoverage  = Math.round((staffActual / staffTarget) * 100);

    const pfn  = Math.round(staffActual * randomFloat(0.55, 0.70));
    const pa   = Math.round(staffActual * randomFloat(0.20, 0.30));
    const ausb = Math.max(0, staffActual - pfn - pa);

    const poolRequest = staffActual < staffTarget * THRESHOLDS.pool_request_trigger;
    const poolRelease = staffActual > staffTarget && (occupied / dept.beds) < 0.65;

    return {
      department_id:   dept.id,
      timestamp:       now.toISOString(),
      shift,
      beds_total:      dept.beds,
      beds_occupied:   occupied,
      beds_reserved:   reserved,
      occupancy_pct:   Math.round((occupied / dept.beds) * 100),
      epa_scores:      epaScores,
      epa_average:     epaAvg,
      epa_distribution:epaDistrib,
      nems_average:    nemsAvg,
      staff: {
        actual:  { pflegefachpersonen: pfn, pflegeassistenz: pa, auszubildende: ausb, leitend: 1 },
        target:  {
          pflegefachpersonen: Math.round(staffTarget * 0.62),
          pflegeassistenz:    Math.round(staffTarget * 0.25),
          auszubildende:      Math.max(0, staffTarget - Math.round(staffTarget * 0.62) - Math.round(staffTarget * 0.25)),
          leitend:            1,
        },
      },
      staff_actual_total:  staffActual,
      staff_target_total:  staffTarget,
      staff_coverage_pct:  staffCoverage,
      pool_request:        poolRequest,
      pool_request_count:  poolRequest ? randomInt(1, 3) : 0,
      pool_release:        poolRelease,
      pool_release_count:  poolRelease ? randomInt(1, 2) : 0,
      notes:               '',
    };
  });
}

// ── Historische Daten (90 Tage) ──────────────────────────────

function generateHistoricalData() {
  const records = [];
  const today   = new Date();

  for (let dayOffset = 89; dayOffset >= 0; dayOffset--) {
    const date = new Date(today);
    date.setDate(today.getDate() - dayOffset);
    const dow = date.getDay(); // 0=Sun, 6=Sat
    const isWeekend = dow === 0 || dow === 6;

    DEPARTMENTS.forEach(dept => {
      ['F', 'S', 'N'].forEach(shiftId => {
        const baseOcc = isWeekend ? 0.62 : 0.78;
        const occupied = Math.min(dept.beds,
          Math.round(dept.beds * (baseOcc + randomFloat(-0.12, 0.12))));

        const isICU = dept.type === 'icu' || dept.type === 'nicu';
        const epaAvg = isICU
          ? randomFloat(3.5, 4.8, 1)
          : randomFloat(1.5, 3.2, 1);
        const nemsAvg = isICU ? randomFloat(14, 26, 1) : null;

        const staffTarget = isICU
          ? Math.ceil(occupied / 1.2)
          : Math.ceil(occupied / 4.5);
        const staffActual = Math.max(1, staffTarget + randomInt(-2, 2));

        records.push({
          date:          date.toISOString().split('T')[0],
          shift:         shiftId,
          department_id: dept.id,
          beds_total:    dept.beds,
          beds_occupied: occupied,
          occupancy_pct: Math.round((occupied / dept.beds) * 100),
          epa_average:   epaAvg,
          nems_average:  nemsAvg,
          staff_actual:  staffActual,
          staff_target:  staffTarget,
          pool_request:  staffActual < staffTarget * THRESHOLDS.pool_request_trigger,
          pool_release:  staffActual > staffTarget,
        });
      });
    });
  }
  return records;
}

// ── OP-Planung ───────────────────────────────────────────────

const PROCEDURES_LIST = [
  'Appendektomie', 'Hüftdysplasiekorrektur', 'Hernienreparation', 'Tonsillektomie',
  'Adenotomie', 'Osteosynthese', 'VSD-Verschluss', 'Leberresektion',
  'Fundoplikatio', 'Cochlea-Implantat', 'Nephrektomie', 'Splenektomie',
  'Kyphoskoliose-Korrektur', 'Pyloromyotomie', 'Cholangiografie',
];

function generateORProcedures() {
  const procedures = [];
  const today = new Date();

  for (let dayOffset = -1; dayOffset <= 4; dayOffset++) {
    const date = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dow  = date.getDay();
    if (dow === 0 || dow === 6) continue;

    const count = randomInt(3, 9);
    for (let i = 0; i < count; i++) {
      const startH  = randomInt(7, 15);
      const startM  = [0, 15, 30, 45][randomInt(0, 3)];
      const duration = randomInt(45, 240);
      const dest    = Math.random() < 0.35 ? 'IPS' : Math.random() < 0.5 ? 'IMC' : 'Abteilung';
      procedures.push({
        id:                  `OR-${date.toISOString().split('T')[0]}-${i+1}`,
        date:                date.toISOString().split('T')[0],
        time:                `${String(startH).padStart(2,'0')}:${String(startM).padStart(2,'0')}`,
        procedure:            PROCEDURES_LIST[randomInt(0, PROCEDURES_LIST.length - 1)],
        age_years:            randomInt(0, 17),
        duration_min:         duration,
        or_room:              randomInt(1, 8),
        postop_destination:   dest,
        postop_duration_days: dest === 'IPS' ? randomInt(1, 5) : dest === 'IMC' ? randomInt(1, 3) : randomInt(0, 2),
        status:               dayOffset < 0 ? 'completed' : dayOffset === 0 && startH < new Date().getHours() ? 'completed' : 'planned',
        surgeon:              ['Dr. Müller', 'Prof. Zimmermann', 'Dr. Baumann', 'Dr. Schneider', 'PD Dr. Fischer'][randomInt(0, 4)],
      });
    }
  }
  return procedures.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// ── Antizipierte Belegung (nächste 5 Tage) ──────────────────

function generateAnticipatedOccupancy() {
  const days = [];
  const today = new Date();

  for (let i = 0; i <= 5; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + i);
    const label = i === 0 ? 'Heute' : i === 1 ? 'Morgen' : date.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' });

    const orPlan = generateORProcedures().filter(p => p.date === date.toISOString().split('T')[0] && p.status === 'planned');
    const ipsPostop = orPlan.filter(p => p.postop_destination === 'IPS').length;
    const imcPostop = orPlan.filter(p => p.postop_destination === 'IMC').length;

    days.push({
      label,
      date: date.toISOString().split('T')[0],
      elective:   orPlan.length,
      ips_postop: ipsPostop,
      imc_postop: imcPostop,
      emergency_forecast: randomInt(8, 20),
      total_anticipated:  randomInt(130, 165),
      baseline_avg:       152,
    });
  }
  return days;
}

// ── Globaler App-State ───────────────────────────────────────

const AppState = {
  currentShiftData:  [],
  historicalData:    [],
  orProcedures:      [],
  anticipated:       [],
  poolRequests:      [],
  alerts:            [],
  lastRefresh:       null,

  init() {
    this.currentShiftData = generateCurrentShiftData();
    this.historicalData   = generateHistoricalData();
    this.orProcedures     = generateORProcedures();
    this.anticipated      = generateAnticipatedOccupancy();
    this.lastRefresh      = new Date();
    this.buildAlerts();
    return this;
  },

  refresh() {
    this.currentShiftData = generateCurrentShiftData();
    this.lastRefresh      = new Date();
    this.buildAlerts();
  },

  buildAlerts() {
    this.alerts = [];
    this.currentShiftData.forEach(d => {
      const dept = DEPARTMENTS.find(x => x.id === d.department_id);
      if (d.occupancy_pct >= THRESHOLDS.occupancy_critical) {
        this.alerts.push({ level: 'danger', dept: dept.name, msg: `Kritische Belegung: ${d.occupancy_pct}%` });
      } else if (d.occupancy_pct >= THRESHOLDS.occupancy_warning) {
        this.alerts.push({ level: 'warning', dept: dept.name, msg: `Hohe Belegung: ${d.occupancy_pct}%` });
      }
      if (d.pool_request) {
        this.alerts.push({ level: 'warning', dept: dept.name, msg: `Pool-Anfrage: ${d.pool_request_count} Pflegeperson(en)` });
      }
      if (d.epa_average >= THRESHOLDS.epa_complexity_high) {
        this.alerts.push({ level: 'info', dept: dept.name, msg: `Hohe Komplexität: Ø EPA-AC ${d.epa_average}` });
      }
    });
  },

  submitShiftEntry(entry) {
    const idx = this.currentShiftData.findIndex(d => d.department_id === entry.department_id);
    if (idx >= 0) {
      this.currentShiftData[idx] = { ...this.currentShiftData[idx], ...entry, timestamp: new Date().toISOString() };
    }
    this.buildAlerts();
  },

  getKPIs() {
    const total_beds     = DEPARTMENTS.reduce((s, d) => s + d.beds, 0);
    const total_occupied = this.currentShiftData.reduce((s, d) => s + d.beds_occupied, 0);
    // EPA-AC Ø nur für Stationen mit EPA-AC Kids V2.0 (IPS ausgeschlossen)
    const epaRecs  = this.currentShiftData.filter(d => d.epa_average !== null);
    const avg_epa  = epaRecs.length
      ? parseFloat((epaRecs.reduce((s, d) => s + d.epa_average, 0) / epaRecs.length).toFixed(1))
      : 0;
    const total_staff_a  = this.currentShiftData.reduce((s, d) => s + d.staff_actual_total, 0);
    const total_staff_t  = this.currentShiftData.reduce((s, d) => s + d.staff_target_total, 0);
    const pool_reqs      = this.currentShiftData.filter(d => d.pool_request).reduce((s, d) => s + d.pool_request_count, 0);
    const pool_rels      = this.currentShiftData.filter(d => d.pool_release).reduce((s, d) => s + d.pool_release_count, 0);

    return {
      total_beds,
      total_occupied,
      occupancy_pct: Math.round((total_occupied / total_beds) * 100),
      avg_epa,
      staff_actual:   total_staff_a,
      staff_target:   total_staff_t,
      staff_coverage: Math.round((total_staff_a / total_staff_t) * 100),
      pool_requests:  pool_reqs,
      pool_releases:  pool_rels,
      alerts_count:   this.alerts.length,
    };
  },
};
