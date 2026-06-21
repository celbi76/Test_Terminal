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

    // Barthel — IPS und IMC werden mit NEMS bewertet, nicht Barthel
    let barthelDistrib  = [0, 0, 0, 0];
    let barthelAvgScore = null;

    if (!isIPS && !isIMC) {
      for (let i = 0; i < occupied; i++) {
        let lvl;
        if (isICU)        lvl = randomInt(1, 2);
        else if (isEmerg) lvl = randomInt(1, 3);
        else              lvl = randomInt(1, 4);
        barthelDistrib[lvl - 1]++;
      }
      const midpoints = [15, 57.5, 90, 100];
      const total     = barthelDistrib.reduce((a, b) => a + b, 0);
      barthelAvgScore = total > 0
        ? parseFloat((barthelDistrib.reduce((s, c, i) => s + c * midpoints[i], 0) / total).toFixed(1))
        : null;
    }

    // NEMS: nur IPS und IMC (Neo/NICU wird mit Barthel-Index bewertet)
    const showNems = dept.type === 'icu' || isIMC;
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
          patient_name:         '',
          birth_date:           '',
          gender:               '',
          weight:               null,
          height:               null,
          asa_class:            'II',
          anesthesia:           'Allgemeinanästhesie',
          instruments:          '',
          equipment:            '',
          emergency_level:      '',
          notes:                '',
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

function generateAnticipatedOccupancy(historicalData, orProcedures) {
  const days  = [];
  const today = new Date();
  const fmtD  = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

  // Build historical DOW baseline per key dept (last 30 days)
  const cutoff30 = new Date(today); cutoff30.setDate(today.getDate() - 30);
  const c30Str   = fmtD(cutoff30);
  const hist30   = (historicalData || []).filter(r => r.date >= c30Str);

  const dowBeds = {}; // dowBeds[deptId][dow] = { sum, count }
  ['notfall', 'ips', 'imc'].forEach(id => {
    dowBeds[id] = Array.from({length: 7}, () => ({ sum: 0, count: 0 }));
  });
  hist30.forEach(r => {
    if (!dowBeds[r.department_id]) return;
    const dow  = new Date(r.date).getDay();
    const dept = DEPARTMENTS.find(d => d.id === r.department_id);
    if (!dept) return;
    const beds = Math.round(dept.beds * ((r.occupancy_pct || r.beds_occupied || 0) / (r.occupancy_pct ? 1 : dept.beds)));
    dowBeds[r.department_id][dow].sum += (r.beds_occupied != null ? r.beds_occupied : beds);
    dowBeds[r.department_id][dow].count++;
  });

  // Compute a stable baseline from historical totals
  const dateOccMap = {};
  hist30.filter(r => r.shift === 'F').forEach(r => {
    const dept = DEPARTMENTS.find(d => d.id === r.department_id);
    if (!dept) return;
    const beds = r.beds_occupied != null ? r.beds_occupied : Math.round(dept.beds * (r.occupancy_pct || 0) / 100);
    if (!dateOccMap[r.date]) dateOccMap[r.date] = 0;
    dateOccMap[r.date] += beds;
  });
  const totals     = Object.values(dateOccMap);
  const baselineAvg = totals.length ? Math.round(totals.reduce((s, v) => s + v, 0) / totals.length) : 152;

  const allProcs = orProcedures || generateORProcedures();

  for (let i = 0; i <= 5; i++) {
    const date    = new Date(today);
    date.setDate(today.getDate() + i);
    const dateStr = fmtD(date);
    const dow     = date.getDay();
    const label   = i === 0 ? 'Heute' : i === 1 ? 'Morgen'
      : date.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' });

    // OR postop from actual plan (IPS/IMC separately)
    const orPlan    = allProcs.filter(p => p.date === dateStr && p.status === 'planned');
    const ipsPostop = orPlan.filter(p => p.postop_destination === 'IPS').length;
    const imcPostop = orPlan.filter(p => p.postop_destination === 'IMC').length;

    // Historical-based emergency (notfall avg for same DOW)
    const nfDOW  = dowBeds['notfall'][dow];
    const nfAvg  = nfDOW.count > 0 ? Math.round(nfDOW.sum / nfDOW.count) : randomInt(9, 15);

    // Historical IPS/IMC avg for same DOW
    const ipsDOW    = dowBeds['ips'][dow];
    const ipsHistAvg = ipsDOW.count > 0 ? Math.round(ipsDOW.sum / ipsDOW.count) : 18;
    const imcDOW    = dowBeds['imc'][dow];
    const imcHistAvg = imcDOW.count > 0 ? Math.round(imcDOW.sum / imcDOW.count) : 8;

    const totalAnt = Math.min(273, Math.max(100, baselineAvg + (ipsPostop + imcPostop) * 1 + randomInt(-4, 8)));

    days.push({
      label,
      date:               dateStr,
      ips_postop:         ipsPostop,
      imc_postop:         imcPostop,
      ips_hist_avg:       ipsHistAvg,
      imc_hist_avg:       imcHistAvg,
      emergency_forecast: nfAvg,
      total_anticipated:  totalAnt,
      baseline_avg:       baselineAvg,
    });
  }
  return days;
}

// ── Bedarfsmeldungen — Konfiguration ─────────────────────────

const BEDARFSMELDUNG_KATEGORIEN = [
  { id: 'personal', label: 'Personalbedarf', icon: 'bi-person-plus-fill', color: '#2980B9' },
];

const BEDARFSMELDUNG_PRIORITAETEN = [
  { id: 'sofort',    label: 'Sofort',    color: '#E63946', bg: '#FDE8EA' },
  { id: 'dringlich', label: 'Dringlich', color: '#F7941D', bg: '#FEF3E2' },
  { id: 'normal',    label: 'Normal',    color: '#2980B9', bg: '#E8F4FD' },
  { id: 'geplant',   label: 'Geplant',   color: '#718096', bg: '#F0F4F8' },
];

const BEDARFSMELDUNG_STATUS_LIST = [
  { id: 'offen',       label: 'Offen',          color: '#E63946', bg: '#FDE8EA' },
  { id: 'bearbeitung', label: 'In Bearbeitung',  color: '#F7941D', bg: '#FEF3E2' },
  { id: 'erledigt',    label: 'Erledigt',        color: '#2DC653', bg: '#E8F8EE' },
  { id: 'abgelehnt',   label: 'Abgelehnt',       color: '#718096', bg: '#F0F4F8' },
];

function getDefaultBedarfsmeldungen() {
  const now = new Date();
  const d = (offset, timeStr) => {
    const dt = new Date(now);
    dt.setDate(now.getDate() - offset);
    const ds = `${dt.getFullYear()}-${String(dt.getMonth()+1).padStart(2,'0')}-${String(dt.getDate()).padStart(2,'0')}`;
    return timeStr ? `${ds}T${timeStr}.000Z` : ds;
  };
  return [
    {
      id: 'BM-001', department_id: 'ips', kategorie: 'personal', prioritaet: 'sofort',
      status: 'offen',
      titel: 'Dipl. Experte/in NDS HF Intensiv',
      beschreibung: 'Erhöhte Belegung (92%) und hohe Pflegekomplexität (NEMS Ø 28). Für die kommende Nachtschicht wird dringend eine zusätzliche Fachperson benötigt.',
      menge: '1 Pflegefachperson', gewuenschtes_datum: d(0),
      erstellt_von: 'Pflegeleitung IPS', erstellt_am: d(0, '06:30:00'), updated_at: null, notizen: '',
    },
    {
      id: 'BM-002', department_id: 'notfall', kategorie: 'personal', prioritaet: 'dringlich',
      status: 'bearbeitung',
      titel: 'Dipl. Pflegefachperson HF',
      beschreibung: 'Aufgrund erhöhter Ausfälle am Wochenende sind Frühdienst Sa/So unterbesetzt. Zwei zusätzliche Pflegepersonen aus dem Pool benötigt.',
      menge: '2 Pflegefachpersonen', gewuenschtes_datum: d(0),
      erstellt_von: 'Pflegeleitung Notfall', erstellt_am: d(1, '14:20:00'), updated_at: d(0, '09:00:00'), notizen: 'Pool-Koordination informiert, Rückmeldung ausstehend.',
    },
    {
      id: 'BM-003', department_id: 'chir', kategorie: 'personal', prioritaet: 'normal',
      status: 'offen',
      titel: 'Dipl. Pflegefachperson HF',
      beschreibung: 'Neue Fachperson tritt in 2 Wochen an. Für strukturierte Einarbeitung wird eine erfahrene Pflegefachperson als Mentorin/Mentor benötigt (50%, 4 Wochen).',
      menge: '1 Pflegefachperson (50%)', gewuenschtes_datum: d(-14),
      erstellt_von: 'Pflegeleitung Chirurgie', erstellt_am: d(2, '11:00:00'), updated_at: null, notizen: '',
    },
    {
      id: 'BM-004', department_id: 'onko', kategorie: 'personal', prioritaet: 'dringlich',
      status: 'offen',
      titel: 'Dipl. Pflegefachperson HF',
      beschreibung: 'Zwei Pflegefachpersonen erkrankt. Spätdienst Donnerstag und Freitag mit nur 60% Abdeckung geplant.',
      menge: '2 Pflegefachpersonen', gewuenschtes_datum: d(-1),
      erstellt_von: 'Pflegeleitung Onkologie', erstellt_am: d(2, '08:15:00'), updated_at: null, notizen: '',
    },
    {
      id: 'BM-005', department_id: 'neo', kategorie: 'personal', prioritaet: 'normal',
      status: 'erledigt',
      titel: 'Dipl. Experte/in NDS HF Intensiv',
      beschreibung: 'Aufgrund erhöhter Frühgeborenen-Belegung war temporär eine dritte Pflegeperson im Nachtdienst erforderlich.',
      menge: '1 Pflegefachperson', gewuenschtes_datum: d(5),
      erstellt_von: 'Pflegeleitung Neo', erstellt_am: d(5, '07:00:00'), updated_at: d(3, '16:30:00'), notizen: 'Pool konnte abgedeckt werden. Situation stabilisiert.',
    },
    {
      id: 'BM-006', department_id: 'imc', kategorie: 'personal', prioritaet: 'geplant',
      status: 'offen',
      titel: 'Dipl. Pflegefachperson HF',
      beschreibung: 'Im August fehlen durch Ferienabwesenheiten 3 Vollzeitstellen. Frühzeitige Pool-Reservierung oder befristete Anstellung notwendig.',
      menge: '3 VZÄ (Aug.)', gewuenschtes_datum: d(-60),
      erstellt_von: 'Pflegeleitung IMC', erstellt_am: d(4, '13:45:00'), updated_at: null, notizen: '',
    },
    {
      id: 'BM-007', department_id: 'med_a', kategorie: 'personal', prioritaet: 'normal',
      status: 'abgelehnt',
      titel: 'Pflegehilfe / AGS',
      beschreibung: 'Zur Entlastung der Pflegefachpersonen bei administrativen und hauswirtschaftlichen Tätigkeiten wäre eine zusätzliche Pflegeassistenz (20%) sinnvoll.',
      menge: '1 Pflegeassistenz (20%)', gewuenschtes_datum: d(14),
      erstellt_von: 'Pflegeleitung Medizin A', erstellt_am: d(14, '09:30:00'), updated_at: d(10, '11:00:00'), notizen: 'Stellenplan gibt keine Aufstockung her. Überprüfung im nächsten Budget.',
    },
  ];
}

// ── OP-Zusatzkonstanten ──────────────────────────────────────

const POSTOP_DESTINATIONS = ['IPS', 'IMC', 'AWR', 'Abteilung'];
const ASA_CLASSES = ['I', 'II', 'III', 'IV', 'V'];
const ANESTHESIA_TYPES = ['Allgemeinanästhesie', 'Regionalanästhesie', 'Lokalanästhesie', 'Kombiniert', 'Spinalanästhesie'];
const EMERGENCY_LEVELS = ['Sofort (S0)', 'Dringlich (S1)', 'Nicht-dringlich (S2)'];

// ── Pool-Ressourcen Generator ────────────────────────────────

const POOL_ROLE_GROUPS = [
  {
    id: 'qual', label: 'Qualifizierte Pflege',
    roles: [
      { id: 'pfn_hf',  label: 'Dipl. Pflegefachperson HF', shortLabel: 'PFP HF' },
      { id: 'exp_int', label: 'Experte/in NDS HF Intensiv',  shortLabel: 'Exp. Int.' },
      { id: 'exp_nf',  label: 'Experte/in NDS HF Notfall',   shortLabel: 'Exp. NF' },
    ]
  },
  {
    id: 'ausb', label: 'Ausbildung',
    roles: [
      { id: 'stud_hf3', label: 'Student·in HF 3. Jahr', shortLabel: 'Stud. HF 3.J' },
      { id: 'stud_hf2', label: 'Student·in HF 2. Jahr', shortLabel: 'Stud. HF 2.J' },
      { id: 'stud_hf1', label: 'Student·in HF 1. Jahr', shortLabel: 'Stud. HF 1.J' },
    ]
  },
  {
    id: 'asst', label: 'Assistenz',
    roles: [
      { id: 'fage_efz', label: 'FaGe EFZ',              shortLabel: 'FaGe EFZ' },
      { id: 'lern_fa2', label: 'Lernende FaGe 2. Jahr', shortLabel: 'Lern. FaGe 2.J' },
      { id: 'pfh_ags',  label: 'Pflegehilfe / AGS',     shortLabel: 'PFH / AGS' },
    ]
  }
];

// Base pool availability per role per shift type
const POOL_BASE = {
  pfn_hf:   { F: 5, S: 4, N: 2 },
  exp_int:  { F: 2, S: 1, N: 1 },
  exp_nf:   { F: 1, S: 1, N: 0 },
  stud_hf3: { F: 3, S: 2, N: 1 },
  stud_hf2: { F: 2, S: 2, N: 0 },
  stud_hf1: { F: 2, S: 1, N: 0 },
  fage_efz: { F: 3, S: 2, N: 1 },
  lern_fa2: { F: 2, S: 1, N: 0 },
  pfh_ags:  { F: 2, S: 2, N: 1 },
};

function generatePoolResources() {
  const today  = new Date();
  const weekdays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
  const allRoles = POOL_ROLE_GROUPS.flatMap(g => g.roles);
  const days = [];

  for (let i = 0; i < 7; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const dateStr   = d.toISOString().split('T')[0];
    const dateLabel = `${weekdays[d.getDay()]} ${d.getDate()}.${d.getMonth() + 1}.`;

    const shifts = {};
    ['F', 'S', 'N'].forEach(shiftId => {
      const byRole = {};
      let totalAvail = 0, totalAssigned = 0;
      allRoles.forEach((role, ri) => {
        let base = POOL_BASE[role.id]?.[shiftId] ?? 0;
        if (isWeekend) base = Math.floor(base * 0.6);
        // Deterministic variance using day+shift+role index
        const seed = ((i * 3 + ['F','S','N'].indexOf(shiftId)) * allRoles.length + ri) % 5;
        const avail    = Math.max(0, base + (seed === 4 ? 1 : seed === 0 ? -1 : 0));
        const assigned = Math.min(avail, Math.floor(avail * 0.25) + (seed === 2 && avail > 0 ? 1 : 0));
        byRole[role.id] = { available: avail, assigned };
        totalAvail    += avail;
        totalAssigned += assigned;
      });
      shifts[shiftId] = { byRole, total_available: totalAvail, total_assigned: totalAssigned };
    });

    days.push({ date: dateStr, dateLabel, isWeekend, dayIndex: i, shifts });
  }

  return { roleGroups: POOL_ROLE_GROUPS, days };
}

// ── Globaler App-State ───────────────────────────────────────

const AppState = {
  currentShiftData: [],
  historicalData:   [],
  orProcedures:     [],
  anticipated:      [],
  alerts:           [],
  poolResources:    null,
  lastRefresh:      null,

  init() {
    this.currentShiftData = generateCurrentShiftData();
    this.historicalData   = generateHistoricalData();
    this.orProcedures     = generateORProcedures();
    this.poolResources    = generatePoolResources();
    this.lastRefresh      = new Date();
    // Merge custom/modified procedures from localStorage
    const custom = this.getCustomProcedures();
    custom.forEach(cp => {
      const i = this.orProcedures.findIndex(p => p.id === cp.id);
      if (i >= 0) this.orProcedures[i] = cp; else this.orProcedures.push(cp);
    });
    this.orProcedures.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    // Merge manually-submitted shift history into historicalData
    this._mergeShiftHistory();
    // Compute anticipated AFTER all data is merged (uses historicalData + orProcedures)
    this.anticipated = generateAnticipatedOccupancy(this.historicalData, this.orProcedures);
    this.buildAlerts();
    return this;
  },

  refresh() {
    this.currentShiftData = generateCurrentShiftData();
    this.orProcedures     = generateORProcedures();
    // Merge custom/modified procedures from localStorage
    const custom = this.getCustomProcedures();
    custom.forEach(cp => {
      const i = this.orProcedures.findIndex(p => p.id === cp.id);
      if (i >= 0) this.orProcedures[i] = cp; else this.orProcedures.push(cp);
    });
    this.orProcedures.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
    this.historicalData   = generateHistoricalData();
    this._mergeShiftHistory();
    this.anticipated      = generateAnticipatedOccupancy(this.historicalData, this.orProcedures);
    this.poolResources    = generatePoolResources();
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
      if (d.barthel_avg_score !== null && d.barthel_avg_score < THRESHOLDS.barthel_high) {
        this.alerts.push({ level: 'info', dept: dept.name, msg: `Hohe Pflegeabhängigkeit: Ø Barthel ${Math.round(d.barthel_avg_score)}` });
      }
    });
  },

  submitShiftEntry(entry) {
    // Persist to shift history regardless of date
    this.saveShiftEntry(entry);

    // Only update live dashboard for today's entries
    const today = new Date();
    const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
    if (entry.date === todayStr) {
      const idx = this.currentShiftData.findIndex(d => d.department_id === entry.department_id);
      if (idx >= 0) {
        this.currentShiftData[idx] = { ...this.currentShiftData[idx], ...entry, timestamp: new Date().toISOString() };
      }
    }

    // Always merge into historicalData so charts reflect real data immediately
    this._mergeShiftHistory();
    this.buildAlerts();
  },

  // ── Pool-Reservationen (localStorage) ───────────────────────

  getPoolReservations() {
    try { return JSON.parse(localStorage.getItem('kispi_pool_reservations') || '[]'); } catch { return []; }
  },

  savePoolReservation(entry) {
    const list = this.getPoolReservations();
    const i    = list.findIndex(r => r.id === entry.id);
    if (i >= 0) list[i] = entry; else list.push(entry);
    localStorage.setItem('kispi_pool_reservations', JSON.stringify(list));
  },

  releasePoolReservation(id) {
    const list  = this.getPoolReservations();
    const entry = list.find(r => r.id === id);
    if (entry) {
      entry.status      = 'freigegeben';
      entry.released_at = new Date().toISOString();
      localStorage.setItem('kispi_pool_reservations', JSON.stringify(list));
    }
  },

  deletePoolReservation(id) {
    const list = this.getPoolReservations().filter(r => r.id !== id);
    localStorage.setItem('kispi_pool_reservations', JSON.stringify(list));
  },

  // ── Shift History (localStorage) ────────────────────────────

  getShiftHistory() {
    try { return JSON.parse(localStorage.getItem('kispi_shift_history') || '[]'); } catch { return []; }
  },

  saveShiftEntry(entry) {
    const list = this.getShiftHistory();
    const key  = `${entry.date}-${entry.shift}-${entry.department_id}`;
    const i    = list.findIndex(e => `${e.date}-${e.shift}-${e.department_id}` === key);
    const record = { ...entry, saved_at: new Date().toISOString() };
    if (i >= 0) list[i] = record; else list.push(record);
    localStorage.setItem('kispi_shift_history', JSON.stringify(list));
  },

  _mergeShiftHistory() {
    this.getShiftHistory().forEach(entry => {
      const i = this.historicalData.findIndex(
        r => r.date === entry.date && r.department_id === entry.department_id
      );
      const merged = { ...entry, is_manual: true };
      if (i >= 0) this.historicalData[i] = { ...this.historicalData[i], ...merged };
      else        this.historicalData.push(merged);
    });
    this.historicalData.sort((a, b) => a.date.localeCompare(b.date));
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

  getCustomProcedures() {
    try { return JSON.parse(localStorage.getItem('kispi_or_custom') || '[]'); } catch { return []; }
  },

  saveCustomProcedure(proc) {
    const list = this.getCustomProcedures();
    const idx  = list.findIndex(p => p.id === proc.id);
    if (idx >= 0) list[idx] = proc; else list.push(proc);
    localStorage.setItem('kispi_or_custom', JSON.stringify(list));
    // Also update in-memory
    const i = this.orProcedures.findIndex(p => p.id === proc.id);
    if (i >= 0) this.orProcedures[i] = proc; else this.orProcedures.push(proc);
    this.orProcedures.sort((a,b) => a.date.localeCompare(b.date) || a.time.localeCompare(b.time));
  },

  deleteCustomProcedure(id) {
    const list = this.getCustomProcedures().filter(p => p.id !== id);
    localStorage.setItem('kispi_or_custom', JSON.stringify(list));
    this.orProcedures = this.orProcedures.filter(p => p.id !== id);
  },

  // ── Bedarfsmeldungen (localStorage) ─────────────────────────

  getBedarfsmeldungen() {
    try {
      const stored = localStorage.getItem('kispi_bedarfsmeldungen');
      if (!stored) {
        const defaults = getDefaultBedarfsmeldungen();
        localStorage.setItem('kispi_bedarfsmeldungen', JSON.stringify(defaults));
        return defaults;
      }
      return JSON.parse(stored);
    } catch { return []; }
  },

  saveBedarfsmeldung(entry) {
    const list = this.getBedarfsmeldungen();
    const i = list.findIndex(e => e.id === entry.id);
    if (i >= 0) list[i] = entry; else list.unshift(entry);
    localStorage.setItem('kispi_bedarfsmeldungen', JSON.stringify(list));
  },

  updateBedarfsmeldungStatus(id, status) {
    const list = this.getBedarfsmeldungen();
    const i = list.findIndex(e => e.id === id);
    if (i >= 0) {
      list[i].status = status;
      list[i].updated_at = new Date().toISOString();
      localStorage.setItem('kispi_bedarfsmeldungen', JSON.stringify(list));
    }
  },

  deleteBedarfsmeldung(id) {
    const list = this.getBedarfsmeldungen().filter(e => e.id !== id);
    localStorage.setItem('kispi_bedarfsmeldungen', JSON.stringify(list));
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

  // ── Prognose / Predictive Analytics ─────────────────────────

  getForecast(mode, horizon) {
    const fmtDate = d => `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
    const today    = new Date();
    const todayStr = fmtDate(today);

    // Baseline window: short = 30 days, long = full 90 days (with seasonal adjustment)
    const cutoffDays = mode === 'long' ? 90 : 30;
    const cutoff     = new Date(today);
    cutoff.setDate(today.getDate() - cutoffDays);
    const cutoffStr  = fmtDate(cutoff);

    const histSlice = this.historicalData.filter(r => r.date >= cutoffStr && r.date < todayStr);

    // Accumulate per-dept, per-DOW averages
    const baseline = {};
    DEPARTMENTS.forEach(dept => {
      baseline[dept.id] = Array.from({length: 7}, () => ({
        occSum: 0, count: 0,
        nemsSum: 0, nemsCount: 0,
        barthelSum: 0, barthelCount: 0,
      }));
    });

    histSlice.forEach(r => {
      if (!baseline[r.department_id]) return;
      const dow = new Date(r.date).getDay();
      const b   = baseline[r.department_id][dow];
      b.occSum += (r.occupancy_pct || 0);
      b.count++;
      if (r.nems_average != null) { b.nemsSum    += r.nems_average;  b.nemsCount++; }
      if (r.barthel_avg  != null) { b.barthelSum += r.barthel_avg;   b.barthelCount++; }
    });

    // Long-term baseline adds a seasonal factor (simulates year-ago occupancy pattern)
    const SEASONAL = [1.08, 1.06, 1.04, 0.97, 0.94, 0.88, 0.85, 0.87, 0.95, 1.02, 1.07, 1.10];
    const seasonFactor = d => (mode === 'long' ? SEASONAL[d.getMonth()] : 1);

    const numDays   = horizon === '3m' ? 91 : 7;
    const futureDays = [];

    for (let i = 1; i <= numDays; i++) {
      const d      = new Date(today);
      d.setDate(today.getDate() + i);
      const dateStr    = fmtDate(d);
      const dow        = d.getDay();
      const isWeekend  = dow === 0 || dow === 6;
      const factor     = seasonFactor(d);

      const label = i <= 7
        ? (i === 1 ? 'Morgen' : d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'numeric' }))
        : d.toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric' });

      let totalOccSum = 0, totalNurses = 0, totalComplexity = 0;
      const perDept   = {};

      DEPARTMENTS.forEach(dept => {
        const b = baseline[dept.id][dow];
        let projOccPct = b.count > 0
          ? Math.round((b.occSum / b.count) * factor)
          : (isWeekend ? 63 : 78);
        projOccPct = Math.min(100, Math.max(15, projOccPct));
        const projBeds = Math.round(dept.beds * projOccPct / 100);

        const avgNems    = b.nemsCount    > 0 ? parseFloat((b.nemsSum    / b.nemsCount).toFixed(1))    : null;
        const avgBarthel = b.barthelCount > 0 ? parseFloat((b.barthelSum / b.barthelCount).toFixed(1)) : null;

        const isICU = dept.type === 'icu' || dept.type === 'nicu';
        const isIMC = dept.type === 'imc';
        let complexityIdx, complexityLabel;
        if ((isICU || isIMC) && avgNems != null) {
          complexityIdx   = Math.min(100, Math.round((avgNems / 40) * 100));
          complexityLabel = avgNems >= 25 ? 'Hoch' : avgNems >= 18 ? 'Mittel' : 'Niedrig';
        } else if (avgBarthel != null) {
          complexityIdx   = Math.min(100, Math.round(((100 - avgBarthel) / 100) * 100));
          complexityLabel = avgBarthel <= 30 ? 'Hoch' : avgBarthel <= 80 ? 'Mittel' : 'Niedrig';
        } else {
          complexityIdx = 50; complexityLabel = 'Mittel';
        }

        // Required qualified nurses per shift: ICU 1:1.2, IMC 1:2.5, Emergency fixed, Ward 1:4.5
        const ratio     = isICU ? 1.2 : isIMC ? 2.5 : dept.type === 'emergency' ? null : 4.5;
        const reqNurses = ratio != null ? Math.ceil(projBeds / ratio) : 6;

        perDept[dept.id] = { projOccPct, projBeds, complexityIdx, complexityLabel, avgNems, avgBarthel, reqNurses };
        totalOccSum      += projOccPct;
        totalNurses      += reqNurses;
        totalComplexity  += complexityIdx;
      });

      futureDays.push({
        date:          dateStr,
        label,
        isWeekend,
        dow,
        perDept,
        avgOccPct:     Math.round(totalOccSum    / DEPARTMENTS.length),
        totalNurses,
        avgComplexity: Math.round(totalComplexity / DEPARTMENTS.length),
      });
    }

    return { mode, horizon, days: futureDays };
  },
};
