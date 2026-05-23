// ============================================================
// KISPI DASHBOARD — Datenkonfiguration & Datengenerierung
// ============================================================

// Bettenkapazität:
// Spezialabteilungen: IPS 25 | IMC 12 | Neo 16 | Notfall 20 = 73
// Bettenabteilungen: Onko 30 + Chir 50 + MedA 40 + MedB 40 + Neuro 40 = 200
// Gesamt: 273

const DEPARTMENTS = [
  { id: 'ips',    name: 'IPS',        fullName: 'Intensivpflegestation',      beds: 25, type: 'icu',       floor: 'K1', color: '#E63946', gruppe: 'spezial' },
  { id: 'imc',    name: 'IMC',        fullName: 'Intermediate Care',           beds: 12, type: 'imc',       floor: 'K1', color: '#F7941D', gruppe: 'spezial' },
  { id: 'neo',    name: 'Neo',        fullName: 'Neonatologie',                beds: 16, type: 'nicu',      floor: '1',  color: '#9B59B6', gruppe: 'spezial' },
  { id: 'notfall',name: 'Notfall',    fullName: 'Notfallstation',              beds: 20, type: 'emergency', floor: 'EG', color: '#FF6B35', gruppe: 'spezial' },
  { id: 'onko',   name: 'Onkologie',  fullName: 'Onkologie / Hämatologie',     beds: 30, type: 'ward',      floor: '2',  color: '#2980B9', gruppe: 'betten' },
  { id: 'chir',   name: 'Chirurgie',  fullName: 'Chirurgie',                   beds: 50, type: 'ward',      floor: '3',  color: '#27AE60', gruppe: 'betten' },
  { id: 'med_a',  name: 'Medizin A',  fullName: 'Medizin A (Allgemein)',        beds: 40, type: 'ward',      floor: '4',  color: '#16A085', gruppe: 'betten' },
  { id: 'med_b',  name: 'Medizin B',  fullName: 'Medizin B (Spezial)',          beds: 40, type: 'ward',      floor: '5',  color: '#1E8BC3', gruppe: 'betten' },
  { id: 'neuro',  name: 'Neurologie', fullName: 'Neurologie / Neuropädiatrie', beds: 40, type: 'ward',      floor: '6',  color: '#8E44AD', gruppe: 'betten' },
];

const DEPT_GROUPS = [
  { id: 'spezial', label: 'Spezialabteilungen', depts: ['ips', 'imc', 'neo', 'notfall'] },
  { id: 'betten',  label: 'Bettenabteilungen',  depts: ['onko', 'chir', 'med_a', 'med_b', 'neuro'] },
];

const SHIFTS = [
  { id: 'F', label: 'Frühdienst',  time: '07:00–16:00', icon: '🌅' },
  { id: 'S', label: 'Spätdienst',  time: '15:30–23:15', icon: '🌆' },
  { id: 'N', label: 'Nachtdienst', time: '22:45–07:15', icon: '🌙' },
];

// Barthel-Index — Pflegeaufwand-Assessment (4 Kategorien)
// IPS wird mit NEMS bewertet, nicht mit Barthel
const BARTHEL_LEVELS = [
  { level: 1, range: '0–30',   label: 'Vollständig hilfsbedürftig', color: '#E63946', minScore: 0,   maxScore: 30  },
  { level: 2, range: '35–80',  label: 'Überwiegend hilfsbedürftig', color: '#F7941D', minScore: 35,  maxScore: 80  },
  { level: 3, range: '85–95',  label: 'Punktuell hilfsbedürftig',   color: '#7BC67E', minScore: 85,  maxScore: 95  },
  { level: 4, range: '100',    label: 'Selbständig',                color: '#2DC653', minScore: 100, maxScore: 100 },
];

// NEMS Score (Nine Equivalents of nursing Manpower use Score) — ICU/IMC only
const NEMS_ITEMS = [
  { id: 'monitoring',   label: 'Basis-Monitoring',           score: 1.2 },
  { id: 'lab',          label: 'Laboruntersuchungen',         score: 4.5 },
  { id: 'ventilation',  label: 'Mechanische Beatmung',        score: 5.2 },
  { id: 'ventsupp',     label: 'Ventilationsunterstützung',   score: 1.4 },
  { id: 'vaso_single',  label: 'Vasoaktive Medikamente (1)',  score: 1.7 },
  { id: 'vaso_multi',   label: 'Vasoaktive Medikamente (>1)', score: 10.9 },
  { id: 'dialysis',     label: 'Nierenersatztherapie',        score: 7.7 },
  { id: 'interv_icu',   label: 'Interventionen (ICU)',        score: 1.8 },
  { id: 'interv_ext',   label: 'Interventionen (extern)',     score: 4.5 },
];

// Berufsrollen nach Abteilungstyp
const STAFF_ROLES_BY_TYPE = {
  ward: [
    { id: 'pfn_hf',   label: 'Dipl. Pflegefachperson HF' },
    { id: 'stud_hf1', label: 'Student·in HF 1. Jahr' },
    { id: 'stud_hf2', label: 'Student·in HF 2. Jahr' },
    { id: 'stud_hf3', label: 'Student·in HF 3. Jahr' },
    { id: 'fage_efz', label: 'FaGe EFZ' },
    { id: 'lern_fa1', label: 'Lernende FaGe 1. Jahr' },
    { id: 'lern_fa2', label: 'Lernende FaGe 2. Jahr' },
    { id: 'pfh_ags',  label: 'Pflegehilfe / AGS' },
  ],
  emergency: [
    { id: 'exp_nf',   label: 'Dipl. Experte/in NDS HF Notfall' },
    { id: 'stud_nf',  label: 'Student·in NDS Notfall' },
    { id: 'pfn_hf',   label: 'Dipl. Pflegefachperson HF' },
    { id: 'fage_efz', label: 'FaGe EFZ' },
    { id: 'pfh_ags',  label: 'Pflegehilfe / AGS' },
    { id: 'disp_mpa', label: 'Disponent / MPA' },
  ],
  icu: [
    { id: 'exp_int',  label: 'Dipl. Experte/in NDS HF Intensiv' },
    { id: 'stud_int', label: 'Student·in NDS Intensiv' },
    { id: 'pfn_hf',   label: 'Dipl. Pflegefachperson HF' },
    { id: 'fage_efz', label: 'FaGe EFZ' },
    { id: 'pfh_ags',  label: 'Pflegehilfe / AGS' },
    { id: 'disp_mpa', label: 'Disponent / MPA' },
  ],
};

STAFF_ROLES_BY_TYPE.imc  = STAFF_ROLES_BY_TYPE.icu;
STAFF_ROLES_BY_TYPE.nicu = STAFF_ROLES_BY_TYPE.icu;

function getRoleType(dept) {
  if (dept.type === 'ward')      return 'ward';
  if (dept.type === 'emergency') return 'emergency';
  return 'icu';
}

// Kompetenzen der Berufsgruppen (editierbar via localStorage)
const DEFAULT_COMPETENCIES = {
  pfn_hf: {
    label: 'Dipl. Pflegefachperson HF',
    items: [
      'Selbstständige Durchführung aller pflegerischen Massnahmen',
      'Medikamentenvorbereitung und -verabreichung inkl. i.v. Medikamente',
      'Betreuung und Beratung von Patienten und Angehörigen',
      'Wundversorgung und Verbandwechsel',
      'Überwachung und Interpretation von Vitalparametern',
      'Dokumentation und Pflegeplanung gemäss LEP',
      'Anleitung und Supervision von Lernenden und Assistenzen',
      'Teilnahme an interdisziplinären Visiten',
    ],
  },
  stud_hf1: {
    label: 'Student·in HF 1. Jahr',
    items: [
      'Grundpflege unter Aufsicht (Körperpflege, Lagerung, Mobilisation)',
      'Vitalzeichenmessung und -dokumentation',
      'Mitarbeit bei einfachen pflegerischen Massnahmen',
      'Vorbereitung des Pflegematerials',
      'Beobachtung des Patientenzustands und Meldung an Bezugsperson',
    ],
  },
  stud_hf2: {
    label: 'Student·in HF 2. Jahr',
    items: [
      'Selbstständige Grundpflege (Körperpflege, Lagerung)',
      'Wundversorgung einfacher Art unter Aufsicht',
      'Subkutane Injektionen unter Aufsicht',
      'Pflegeplanung erstellen und anpassen',
      'Angehörigenberatung unter Aufsicht',
    ],
  },
  stud_hf3: {
    label: 'Student·in HF 3. Jahr',
    items: [
      'Selbstständige Durchführung der meisten Pflegemassnahmen',
      'Medikamentenvorbereitung unter Aufsicht',
      'Venenpunktion und Blutentnahme unter Aufsicht',
      'Eigenständige Pflegeplanung und -dokumentation',
      'Anleitung von Lernenden FaGe',
    ],
  },
  fage_efz: {
    label: 'FaGe EFZ',
    items: [
      'Grundpflege selbstständig (Körperpflege, Betten, Lagerung)',
      'Mobilisation und Transfer von Patienten',
      'Vitalzeichenmessung und -dokumentation',
      'Essensverteilung und Unterstützung bei der Nahrungsaufnahme',
      'Einfache Verbandwechsel nach Anweisung',
    ],
  },
  lern_fa1: {
    label: 'Lernende FaGe 1. Jahr',
    items: [
      'Unterstützung bei der Grundpflege unter Aufsicht',
      'Betten machen und Zimmer aufbereiten',
      'Essensverteilung unter Aufsicht',
      'Materialbeschaffung und Lagerhaltung',
    ],
  },
  lern_fa2: {
    label: 'Lernende FaGe 2. Jahr',
    items: [
      'Grundpflege einfacherer Art unter Aufsicht',
      'Mobilisation unter Aufsicht',
      'Vitalzeichenmessung unter Aufsicht',
      'Essensverteilung selbstständig',
    ],
  },
  pfh_ags: {
    label: 'Pflegehilfe / AGS',
    items: [
      'Unterstützung bei einfachsten Pflegemassnahmen',
      'Betten beziehen und Zimmer reinigen',
      'Essensverteilung und Getränke reichen',
      'Materialtransport und Botengänge',
    ],
  },
  exp_nf: {
    label: 'Dipl. Experte/in NDS HF Notfall',
    items: [
      'Ersteinschätzung (Triage) nach Manchester Triage System',
      'Initiierung und Durchführung notfallmedizinischer Massnahmen',
      'Kardiopulmonale Reanimation und erweiterte Massnahmen (ACLS)',
      'Venöser Zugang, Blutentnahme, i.v. Medikamente selbstständig',
      'EKG-Ableitung und Erstinterpretation',
      'Koordination der Patientenversorgung im Schockraum',
      'Anleitung und Supervision des Notfallteams',
    ],
  },
  stud_nf: {
    label: 'Student·in NDS Notfall',
    items: [
      'Triage unter Aufsicht durchführen',
      'Venöser Zugang unter Aufsicht',
      'Vitalzeichenmessung und Monitoring',
      'Mitarbeit bei notfallmedizinischen Massnahmen',
    ],
  },
  exp_int: {
    label: 'Dipl. Experte/in NDS HF Intensiv',
    items: [
      'Überwachung und Pflege beatmeter Patienten',
      'Bedienung und Überwachung von Beatmungsgeräten',
      'Hämodynamisches Monitoring (ZVK, Arterie, PAK)',
      'Titration vasoaktiver Substanzen',
      'Kontinuierliche Nierenersatztherapie (CRRT)',
      'Angehörigenbetreuung in Ausnahmesituationen',
      'Führen und Koordinieren von Schichtteams',
    ],
  },
  stud_int: {
    label: 'Student·in NDS Intensiv',
    items: [
      'Monitoring und Überwachung unter Aufsicht',
      'Pflegerische Grundversorgung von Intensivpatienten',
      'Medikamentenvorbereitung unter Aufsicht',
      'Beatmungsüberwachung unter Anleitung',
    ],
  },
  disp_mpa: {
    label: 'Disponent / MPA',
    items: [
      'Telefonische und persönliche Patientenanmeldung',
      'Administrative Aufnahme und Patientenregistrierung',
      'Koordination von Terminen und Ressourcen',
      'Kommunikation mit externen Stellen (Rettungsdienst, Hausarzt)',
      'Empfang und Betreuung von Angehörigen',
    ],
  },
};

// OP-Säle Konfiguration
const OR_ROOMS = [
  { id: 1, label: 'Saal 1', standardEnd: '16:00', extendedEnd: null,   notfall: false },
  { id: 2, label: 'Saal 2', standardEnd: '16:00', extendedEnd: null,   notfall: false },
  { id: 3, label: 'Saal 3', standardEnd: '16:00', extendedEnd: null,   notfall: true  },
  { id: 4, label: 'Saal 4', standardEnd: '16:00', extendedEnd: null,   notfall: false },
  { id: 5, label: 'Saal 5', standardEnd: '16:00', extendedEnd: '20:00', notfall: false },
  { id: 6, label: 'Saal 6', standardEnd: '16:00', extendedEnd: '20:00', notfall: false },
];

const THRESHOLDS = {
  occupancy_warning:    80,
  occupancy_critical:   95,
  staff_coverage_min:   90,
  barthel_high:         40,
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
  const now   = new Date();
  const total = now.getHours() * 60 + now.getMinutes();
  if (total >= 7 * 60 && total < 15 * 60 + 30) return 'F';
  if (total >= 15 * 60 + 30 && total < 22 * 60 + 45) return 'S';
  return 'N';
}

function barthelColor(score) {
  if (score <= 30) return '#E63946';
  if (score <= 80) return '#F7941D';
  if (score <= 95) return '#7BC67E';
  return '#2DC653';
}

// ── Aktuelle Schichtdaten ────────────────────────────────────

function generateCurrentShiftData() {
  const now   = new Date();
  const shift = getCurrentShift();

  return DEPARTMENTS.map(dept => {
    const isICU   = dept.type === 'icu' || dept.type === 'nicu';
    const isIMC   = dept.type === 'imc';
    const isEmerg = dept.type === 'emergency';
    const isIPS   = dept.id === 'ips';

    const occupied    = randomInt(Math.floor(dept.beds * 0.55), Math.floor(dept.beds * 0.97));
    const closedBeds  = randomInt(0, Math.floor(dept.beds * 0.08));
    const operational = dept.beds - closedBeds;
    const reserved    = isICU ? randomInt(0, 2) : randomInt(0, 3);

    // Barthel — IPS nicht mit Barthel bewertet
    let barthelDistrib  = [0, 0, 0, 0];
    let barthelAvgScore = null;

    if (!isIPS) {
      for (let i = 0; i < occupied; i++) {
        let lvl;
        if (isICU || isIMC) lvl = randomInt(1, 2);
        else if (isEmerg)   lvl = randomInt(1, 3);
        else                lvl = randomInt(1, 4);
        barthelDistrib[lvl - 1]++;
      }
      const midpoints = [15, 57.5, 90, 100];
      const total     = barthelDistrib.reduce((a, b) => a + b, 0);
      barthelAvgScore = total > 0
        ? parseFloat((barthelDistrib.reduce((s, c, i) => s + c * midpoints[i], 0) / total).toFixed(1))
        : null;
    }

    // NEMS: IPS und IMC
    const showNems = isICU || isIMC;
    const nemsAvg  = showNems
      ? (isIPS ? randomFloat(16, 34, 1) : randomFloat(10, 22, 1))
      : null;

    // Staff by role
    const roleType = getRoleType(dept);
    const roles    = STAFF_ROLES_BY_TYPE[roleType];

    const staffTargetTotal = isICU
      ? Math.ceil(occupied / 1.2)
      : isIMC
        ? Math.ceil(occupied / 2.5)
        : isEmerg
          ? randomInt(4, 8)
          : Math.ceil(occupied / 4.5);

    const staffActualTotal = Math.max(1, staffTargetTotal + randomInt(-2, 2));

    const ROLE_WEIGHTS = {
      exp_int: 0.35, exp_nf: 0.35, pfn_hf: 0.40, stud_hf3: 0.10, stud_hf2: 0.08,
      stud_hf1: 0.05, stud_int: 0.10, stud_nf: 0.10, fage_efz: 0.15,
      lern_fa1: 0.04, lern_fa2: 0.05, pfh_ags: 0.06, disp_mpa: 0.05,
    };

    const staff_actual_by_role = {};
    const staff_target_by_role = {};
    let remA = staffActualTotal, remT = staffTargetTotal;

    roles.forEach((role, idx) => {
      if (idx === roles.length - 1) {
        staff_actual_by_role[role.id] = Math.max(0, remA);
        staff_target_by_role[role.id] = Math.max(0, remT);
      } else {
        const w = ROLE_WEIGHTS[role.id] || 0.05;
        const a = Math.min(Math.max(0, Math.round(staffActualTotal * w)), remA);
        const t = Math.min(Math.max(0, Math.round(staffTargetTotal * w)), remT);
        staff_actual_by_role[role.id] = a;
        staff_target_by_role[role.id] = t;
        remA -= a;
        remT -= t;
      }
    });

    const staffCoverage = Math.round((staffActualTotal / Math.max(staffTargetTotal, 1)) * 100);
    const poolRequest   = staffActualTotal < staffTargetTotal * THRESHOLDS.pool_request_trigger;
    const poolRelease   = staffActualTotal > staffTargetTotal && (occupied / dept.beds) < 0.65;

    const pfn  = Math.round(staffActualTotal * randomFloat(0.55, 0.70));
    const pa   = Math.round(staffActualTotal * randomFloat(0.20, 0.30));
    const ausb = Math.max(0, staffActualTotal - pfn - pa);

    return {
      department_id:        dept.id,
      timestamp:            now.toISOString(),
      shift,
      beds_total:           dept.beds,
      beds_operational:     operational,
      beds_occupied:        occupied,
      beds_reserved:        reserved,
      occupancy_pct:        Math.round((occupied / dept.beds) * 100),
      barthel_distrib:      barthelDistrib,
      barthel_avg_score:    barthelAvgScore,
      nems_average:         nemsAvg,
      staff_actual_by_role,
      staff_target_by_role,
      staff: {
        actual: { pflegefachpersonen: pfn, pflegeassistenz: pa, auszubildende: ausb, leitend: 1 },
        target: {
          pflegefachpersonen: Math.round(staffTargetTotal * 0.62),
          pflegeassistenz:    Math.round(staffTargetTotal * 0.25),
          auszubildende:      Math.max(0, staffTargetTotal - Math.round(staffTargetTotal * 0.62) - Math.round(staffTargetTotal * 0.25)),
          leitend:            1,
        },
      },
      staff_actual_total:  staffActualTotal,
      staff_target_total:  staffTargetTotal,
      staff_coverage_pct:  staffCoverage,
      pool_request:        poolRequest,
      pool_request_count:  poolRequest ? randomInt(1, 3) : 0,
      pool_release:        poolRelease,
      pool_release_count:  poolRelease ? randomInt(1, 2) : 0,
      notes: '',
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
    const isWeekend = date.getDay() === 0 || date.getDay() === 6;

    DEPARTMENTS.forEach(dept => {
      ['F', 'S', 'N'].forEach(shiftId => {
        const baseOcc  = isWeekend ? 0.62 : 0.78;
        const occupied = Math.min(dept.beds, Math.round(dept.beds * (baseOcc + randomFloat(-0.12, 0.12))));
        const isICU    = dept.type === 'icu' || dept.type === 'nicu';
        const nemsAvg  = (isICU || dept.type === 'imc') ? randomFloat(14, 26, 1) : null;
        const barthelAvg = dept.id === 'ips' ? null : randomFloat(20, 75, 1);
        const staffTarget = isICU ? Math.ceil(occupied / 1.2) : Math.ceil(occupied / 4.5);
        const staffActual = Math.max(1, staffTarget + randomInt(-2, 2));

        records.push({
          date:          date.toISOString().split('T')[0],
          shift:         shiftId,
          department_id: dept.id,
          beds_total:    dept.beds,
          beds_occupied: occupied,
          occupancy_pct: Math.round((occupied / dept.beds) * 100),
          barthel_avg:   barthelAvg,
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
  'Zystoskopie', 'Orchidopexie', 'Hypospadiekorrektur',
];

const SURGEONS = ['Dr. Müller', 'Prof. Zimmermann', 'Dr. Baumann', 'Dr. Schneider', 'PD Dr. Fischer'];

function generateORProcedures() {
  const procedures = [];
  const today      = new Date();

  for (let dayOffset = -1; dayOffset <= 4; dayOffset++) {
    const date    = new Date(today);
    date.setDate(today.getDate() + dayOffset);
    const dow     = date.getDay();
    if (dow === 0 || dow === 6) continue;

    const dateStr = date.toISOString().split('T')[0];

    OR_ROOMS.forEach(room => {
      const maxEndMin = room.extendedEnd
        ? parseInt(room.extendedEnd) * 60
        : 16 * 60;

      let curMin = 7 * 60;

      for (let i = 0; i < randomInt(1, 4); i++) {
        if (curMin >= maxEndMin) break;
        const duration = randomInt(45, 180);
        const dest     = Math.random() < 0.30 ? 'IPS' : Math.random() < 0.45 ? 'IMC' : 'Abteilung';
        const startH   = Math.floor(curMin / 60);
        const startM   = curMin % 60;
        const isNF     = false;

        procedures.push({
          id:                   `OR-${dateStr}-S${room.id}-${i + 1}`,
          date:                 dateStr,
          time:                 `${String(startH).padStart(2, '0')}:${String(startM).padStart(2, '0')}`,
          duration_min:         duration,
          or_room:              room.id,
          procedure:            PROCEDURES_LIST[randomInt(0, PROCEDURES_LIST.length - 1)],
          surgeon:              SURGEONS[randomInt(0, SURGEONS.length - 1)],
          age_years:            randomInt(0, 17),
          postop_destination:   dest,
          postop_duration_days: dest === 'IPS' ? randomInt(1, 5) : dest === 'IMC' ? randomInt(1, 3) : randomInt(0, 2),
          dringlichkeit:        Math.random() < 0.12 ? 'Dringlich' : 'Elektiv',
          status:               dayOffset < 0 ? 'completed'
                              : dayOffset === 0 && startH < new Date().getHours() ? 'completed'
                              : 'planned',
          is_notfall_spur:      false,
        });

        curMin += duration + randomInt(15, 30);
      }

      // Saal 3 Notfall-Spur 20:00–07:00 (immer)
      if (room.id === 3) {
        procedures.push({
          id:                   `OR-${dateStr}-S3-NFS`,
          date:                 dateStr,
          time:                 '20:00',
          duration_min:         660,
          or_room:              3,
          procedure:            'Notfall-Spur (reserviert)',
          surgeon:              'Dienstchirurg·in',
          age_years:            null,
          postop_destination:   'IPS',
          postop_duration_days: 0,
          dringlichkeit:        'Notfall',
          status:               'reserved',
          is_notfall_spur:      true,
        });
      }
    });
  }

  return procedures.sort((a, b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
}

// ── Antizipierte Belegung ────────────────────────────────────

function generateAnticipatedOccupancy() {
  const days  = [];
  const today = new Date();

  for (let i = 0; i <= 5; i++) {
    const date  = new Date(today);
    date.setDate(today.getDate() + i);
    const label = i === 0 ? 'Heute' : i === 1 ? 'Morgen'
      : date.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' });

    const orPlan    = generateORProcedures().filter(p => p.date === date.toISOString().split('T')[0] && p.status === 'planned');
    const ipsPostop = orPlan.filter(p => p.postop_destination === 'IPS').length;
    const imcPostop = orPlan.filter(p => p.postop_destination === 'IMC').length;

    days.push({
      label,
      date:               date.toISOString().split('T')[0],
      elective:           orPlan.filter(p => p.dringlichkeit === 'Elektiv').length,
      ips_postop:         ipsPostop,
      imc_postop:         imcPostop,
      emergency_forecast: randomInt(8, 20),
      total_anticipated:  randomInt(130, 165),
      baseline_avg:       152,
    });
  }
  return days;
}

// ── Globaler App-State ───────────────────────────────────────

const AppState = {
  currentShiftData: [],
  historicalData:   [],
  orProcedures:     [],
  anticipated:      [],
  alerts:           [],
  lastRefresh:      null,

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
    this.orProcedures     = generateORProcedures();
    this.anticipated      = generateAnticipatedOccupancy();
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
      if (d.barthel_avg_score !== null && d.barthel_avg_score < THRESHOLDS.barthel_high) {
        this.alerts.push({ level: 'info', dept: dept.name, msg: `Hohe Pflegeabhängigkeit: Ø Barthel ${Math.round(d.barthel_avg_score)}` });
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
    const all     = this.currentShiftData;

    const sumGroup = ids => {
      const recs  = all.filter(d => ids.includes(d.department_id));
      const depts = DEPARTMENTS.filter(d => ids.includes(d.id));
      return {
        beds_total:       depts.reduce((s, d) => s + d.beds, 0),
        beds_operational: recs.reduce((s, d) => s + (d.beds_operational ?? d.beds_total), 0),
        beds_occupied:    recs.reduce((s, d) => s + d.beds_occupied, 0),
      };
    };

    const bettenIds  = DEPT_GROUPS.find(g => g.id === 'betten').depts;
    const spezialIds = DEPT_GROUPS.find(g => g.id === 'spezial').depts;

    const belegung = {
      ips:    sumGroup(['ips']),
      imc:    sumGroup(['imc']),
      neo:    sumGroup(['neo']),
      notfall:sumGroup(['notfall']),
      betten: sumGroup(bettenIds),
      total:  sumGroup([...spezialIds, ...bettenIds]),
    };

    const barthelRecs = all.filter(d => d.barthel_avg_score !== null);
    const avg_barthel = barthelRecs.length
      ? parseFloat((barthelRecs.reduce((s, d) => s + d.barthel_avg_score, 0) / barthelRecs.length).toFixed(1))
      : null;

    const total_staff_a = all.reduce((s, d) => s + d.staff_actual_total, 0);
    const total_staff_t = all.reduce((s, d) => s + d.staff_target_total, 0);
    const pool_reqs     = all.filter(d => d.pool_request).reduce((s, d) => s + d.pool_request_count, 0);
    const pool_rels     = all.filter(d => d.pool_release).reduce((s, d) => s + d.pool_release_count, 0);

    return {
      belegung,
      avg_barthel,
      staff_actual:   total_staff_a,
      staff_target:   total_staff_t,
      staff_coverage: Math.round((total_staff_a / Math.max(total_staff_t, 1)) * 100),
      pool_requests:  pool_reqs,
      pool_releases:  pool_rels,
      alerts_count:   this.alerts.length,
    };
  },

  getCompetencies() {
    try {
      const stored = localStorage.getItem('kispi_competencies');
      if (!stored) return DEFAULT_COMPETENCIES;
      const overrides = JSON.parse(stored);
      const merged = {};
      Object.keys(DEFAULT_COMPETENCIES).forEach(k => {
        merged[k] = overrides[k]
          ? { ...DEFAULT_COMPETENCIES[k], items: overrides[k].items }
          : DEFAULT_COMPETENCIES[k];
      });
      return merged;
    } catch {
      return DEFAULT_COMPETENCIES;
    }
  },

  saveCompetency(roleId, items) {
    try {
      const stored = JSON.parse(localStorage.getItem('kispi_competencies') || '{}');
      stored[roleId] = { items };
      localStorage.setItem('kispi_competencies', JSON.stringify(stored));
    } catch { /* ignore */ }
  },

  resetCompetencies() {
    localStorage.removeItem('kispi_competencies');
  },
};
