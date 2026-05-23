// ============================================================
// KISPI DASHBOARD — Chart.js Konfigurationen
// ============================================================

const CHART_COLORS = {
  blue:    '#0056A2',
  teal:    '#00A79D',
  green:   '#2DC653',
  orange:  '#F7941D',
  red:     '#E63946',
  purple:  '#8E44AD',
  gray:    '#A0AEC0',
  light:   '#E2E8F0',
};

Chart.defaults.font.family = "'Inter', 'Segoe UI', system-ui, sans-serif";
Chart.defaults.font.size   = 12;
Chart.defaults.color       = '#4A5568';
Chart.defaults.plugins.legend.labels.boxWidth = 10;
Chart.defaults.plugins.legend.labels.padding  = 14;
Chart.defaults.plugins.tooltip.padding        = 10;
Chart.defaults.plugins.tooltip.cornerRadius   = 6;
Chart.defaults.plugins.tooltip.backgroundColor = 'rgba(10,25,48,0.88)';

const charts = {};

// ── Belegung Trend (7 Tage) ──────────────────────────────────

function buildOccupancyTrendChart(canvasId, historicalData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const today = new Date();
  const labels = [];
  const ipsData = [], wardData = [], totalData = [];

  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(i === 0 ? 'Heute' : d.toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric' }));

    const dayRecords = historicalData.filter(r => r.date === dateStr && r.shift === 'F');
    const ipsRecs   = dayRecords.filter(r => ['ips','imc','neo'].includes(r.department_id));
    const wardRecs  = dayRecords.filter(r => !['ips','imc','neo'].includes(r.department_id));
    const allRecs   = dayRecords;

    ipsData.push(ipsRecs.length  ? Math.round(ipsRecs.reduce((s,r)  => s + r.occupancy_pct, 0) / ipsRecs.length)  : 0);
    wardData.push(wardRecs.length ? Math.round(wardRecs.reduce((s,r) => s + r.occupancy_pct, 0) / wardRecs.length) : 0);
    totalData.push(allRecs.length ? Math.round(allRecs.reduce((s,r)  => s + r.occupancy_pct, 0) / allRecs.length)  : 0);
  }

  charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [
        {
          label: 'Gesamt',
          data: totalData,
          borderColor: CHART_COLORS.teal,
          backgroundColor: 'rgba(0,167,157,0.1)',
          fill: true,
          tension: 0.4,
          borderWidth: 2.5,
          pointRadius: 4,
          pointBackgroundColor: CHART_COLORS.teal,
        },
        {
          label: 'IPS/IMC/Neo',
          data: ipsData,
          borderColor: CHART_COLORS.red,
          backgroundColor: 'rgba(230,57,70,0.05)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.red,
          borderDash: [4,3],
        },
        {
          label: 'Abteilungen',
          data: wardData,
          borderColor: CHART_COLORS.blue,
          backgroundColor: 'rgba(0,86,162,0.05)',
          fill: false,
          tension: 0.4,
          borderWidth: 2,
          pointRadius: 3,
          pointBackgroundColor: CHART_COLORS.blue,
          borderDash: [2,2],
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}%`,
          },
        },
      },
      scales: {
        y: {
          min: 0, max: 100,
          grid: { color: '#F0F4F8' },
          ticks: { callback: v => v + '%' },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Barthel-Index Verteilung (Bar) ──────────────────────────

function buildBarthelChart(canvasId, shiftData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  // IPS wird mit NEMS bewertet — aus Barthel-Auswertung ausgeschlossen
  const totals = [0, 0, 0, 0];
  shiftData.filter(d => d.department_id !== 'ips' && d.barthel_distrib).forEach(d => {
    d.barthel_distrib.forEach((count, i) => { totals[i] += count; });
  });

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: ['0–30\nVollständig', '35–80\nÜberwiegend', '85–95\nPunktuell', '100\nSelbständig'],
      datasets: [{
        label: 'Patienten',
        data: totals,
        backgroundColor: BARTHEL_LEVELS.map(l => l.color),
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            title: ctx => BARTHEL_LEVELS[ctx[0].dataIndex].label,
            label: ctx => ` ${ctx.parsed.y} Patient${ctx.parsed.y !== 1 ? 'en' : ''}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#F0F4F8' },
          ticks: { precision: 0 },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Personelle Situation (Horizontal Bar) ────────────────────

function buildStaffChart(canvasId, shiftData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const labels  = [];
  const actual  = [];
  const target  = [];
  const colors  = [];

  shiftData.forEach(d => {
    const dept = DEPARTMENTS.find(x => x.id === d.department_id);
    labels.push(dept.name);
    actual.push(d.staff_actual_total);
    target.push(d.staff_target_total);
    const pct = d.staff_coverage_pct;
    colors.push(pct >= 95 ? CHART_COLORS.green : pct >= 80 ? CHART_COLORS.orange : CHART_COLORS.red);
  });

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        {
          label: 'SOLL',
          data: target,
          backgroundColor: 'rgba(160,174,192,0.35)',
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.55,
        },
        {
          label: 'IST',
          data: actual,
          backgroundColor: colors,
          borderRadius: 4,
          borderSkipped: false,
          barPercentage: 0.55,
        },
      ],
    },
    options: {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.x} Personen`,
          },
        },
      },
      scales: {
        x: {
          beginAtZero: true,
          grid: { color: '#F0F4F8' },
          ticks: { precision: 0 },
        },
        y: { grid: { display: false } },
      },
    },
  });
}

// ── Antizipierte Belegung (nächste 5 Tage, Stacked Bar) ──────

function buildAnticipatedChart(canvasId, anticipated) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: anticipated.map(a => a.label),
      datasets: [
        {
          label: 'Baseline Ø',
          data: anticipated.map(a => a.baseline_avg),
          type: 'line',
          borderColor: CHART_COLORS.gray,
          borderDash: [6,3],
          borderWidth: 1.5,
          pointRadius: 0,
          fill: false,
          order: 0,
        },
        {
          label: 'Notfall (antizipiert)',
          data: anticipated.map(a => a.emergency_forecast),
          backgroundColor: 'rgba(230,57,70,0.7)',
          borderRadius: 4,
          stack: 'stack',
        },
        {
          label: 'Elektive Eingriffe (postop)',
          data: anticipated.map(a => a.ips_postop + a.imc_postop),
          backgroundColor: 'rgba(247,148,29,0.7)',
          borderRadius: 4,
          stack: 'stack',
        },
        {
          label: 'Reguläre Belegung',
          data: anticipated.map(a => a.total_anticipated - a.emergency_forecast - a.ips_postop - a.imc_postop),
          backgroundColor: 'rgba(0,167,157,0.65)',
          borderRadius: 4,
          stack: 'stack',
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { position: 'top' },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y}`,
          },
        },
      },
      scales: {
        y: {
          beginAtZero: false,
          min: 80,
          grid: { color: '#F0F4F8' },
          stacked: true,
        },
        x: { grid: { display: false }, stacked: true },
      },
    },
  });
}

// ── Historischer Trend (Line) ────────────────────────────────

function buildHistoricalTrendChart(canvasId, historicalData, deptId, metric, days) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const today = new Date();
  const labels = [];
  const data   = [];

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('de-CH', { day: 'numeric', month: 'numeric' }));

    const recs = historicalData.filter(r =>
      r.date === dateStr && (deptId === 'all' || r.department_id === deptId)
    );
    const val = recs.length
      ? recs.reduce((s, r) => s + (r[metric] || 0), 0) / recs.length
      : null;
    data.push(val !== null ? parseFloat(val.toFixed(1)) : null);
  }

  charts[canvasId] = new Chart(canvas, {
    type: 'line',
    data: {
      labels,
      datasets: [{
        label: metric === 'occupancy_pct' ? 'Belegung %' : metric === 'barthel_avg' ? 'Ø Barthel' : 'Personal IST',
        data,
        borderColor: CHART_COLORS.teal,
        backgroundColor: 'rgba(0,167,157,0.08)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 1.5,
        spanGaps: true,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        y: {
          grid: { color: '#F0F4F8' },
          ticks: { callback: v => metric === 'occupancy_pct' ? v + '%' : v },
        },
        x: {
          grid: { display: false },
          ticks: { maxTicksLimit: 14, maxRotation: 0 },
        },
      },
    },
  });
}

// ── Skill-Grade-Mix (Stacked Bar) ────────────────────────────

function buildSkillMixChart(canvasId, shiftData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const labels   = shiftData.map(d => DEPARTMENTS.find(x => x.id === d.department_id)?.name || d.department_id);
  const allRoles = getAllRoles();

  const palette = [
    '#E63946','#F7941D','#3DB8E8','#00A79D','#2DC653','#9B59B6',
    '#F0C040','#2980B9','#27AE60','#8E44AD','#E67E22','#16A085','#607D8B',
  ];

  const datasets = allRoles.map((role, i) => ({
    label:           ROLE_SHORT[role.id] || role.label,
    data:            shiftData.map(d => d.staff_actual_by_role?.[role.id] || 0),
    backgroundColor: palette[i % palette.length],
    borderRadius:    2,
    stack:           'stack',
  }));

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: { labels, datasets },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'top',
          labels: { font: { size: 11 }, boxWidth: 12, padding: 8 },
        },
      },
      scales: {
        y: { stacked: true, grid: { color: '#F0F4F8' }, ticks: { precision: 0 } },
        x: { stacked: true, grid: { display: false } },
      },
    },
  });
}

// ── Nurse-to-Patient Ratio Gauge (Doughnut) ──────────────────

function buildNurseRatioChart(canvasId, shiftData) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const deptLabels = shiftData.map(d => DEPARTMENTS.find(x => x.id === d.department_id)?.name || d.department_id);
  const ratios     = shiftData.map(d => {
    const qn = ['exp_int','exp_nf','pfn_hf'].reduce((s, id) => s + (d.staff_actual_by_role?.[id] || 0), 0);
    return qn > 0 ? parseFloat((d.beds_occupied / qn).toFixed(1)) : 0;
  });
  const colors     = ratios.map((r, i) => {
    const dept = DEPARTMENTS.find(x => x.id === shiftData[i].department_id);
    const isICU = dept?.type === 'icu' || dept?.type === 'nicu';
    if (isICU) return r <= 1.5 ? CHART_COLORS.green : r <= 2 ? CHART_COLORS.orange : CHART_COLORS.red;
    return r <= 4 ? CHART_COLORS.green : r <= 5.5 ? CHART_COLORS.orange : CHART_COLORS.red;
  });

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: deptLabels,
      datasets: [{
        label: 'Patienten / Dipl. Pflegefachperson',
        data: ratios,
        backgroundColor: colors,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: { callbacks: { label: ctx => ` 1 Dipl. PFP/Experte : ${ctx.parsed.y} Patienten` } },
      },
      scales: {
        y: {
          beginAtZero: true,
          grid: { color: '#F0F4F8' },
          ticks: { callback: v => '1:' + v },
        },
        x: { grid: { display: false } },
      },
    },
  });
}

// ── Abweichungs-Heatmap (approximiert als gruppierter Bar) ───

function buildDeviationChart(canvasId, historicalData, metric) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  if (charts[canvasId]) charts[canvasId].destroy();

  const dayNames = ['Mo','Di','Mi','Do','Fr','Sa','So'];
  const avgByDay = Array(7).fill(null).map(() => ({ sum:0, count:0 }));

  historicalData.forEach(r => {
    const d = new Date(r.date);
    const dow = (d.getDay() + 6) % 7; // 0=Mon
    avgByDay[dow].sum   += r[metric] || 0;
    avgByDay[dow].count += 1;
  });

  // Overall mean
  const overallSum   = avgByDay.reduce((s, d) => s + d.sum, 0);
  const overallCount = avgByDay.reduce((s, d) => s + d.count, 0);
  const mean         = overallCount > 0 ? overallSum / overallCount : 0;

  const vals     = avgByDay.map(d => d.count > 0 ? parseFloat((d.sum / d.count - mean).toFixed(1)) : 0);
  const barColors = vals.map(v => v > 0 ? 'rgba(230,57,70,0.7)' : 'rgba(45,198,83,0.7)');

  charts[canvasId] = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: dayNames,
      datasets: [{
        label: 'Abweichung vom Mittel',
        data: vals,
        backgroundColor: barColors,
        borderRadius: 5,
        borderSkipped: false,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => {
              const v = ctx.parsed.y;
              return ` Abw.: ${v > 0 ? '+' : ''}${v}${metric === 'occupancy_pct' ? '%' : ''}`;
            },
          },
        },
      },
      scales: {
        y: {
          grid: { color: '#F0F4F8' },
          ticks: { callback: v => (v > 0 ? '+' : '') + v + (metric === 'occupancy_pct' ? '%' : '') },
        },
        x: { grid: { display: false } },
      },
    },
  });
}
