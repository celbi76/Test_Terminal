// ============================================================
// KISPI DASHBOARD — Haupt-Applikationslogik
// ============================================================

let clockTimer   = null;
let historyDays  = 30;
let selectedDept = null;
let selectedShift= null;

function localDateStr(date) {
  const d = date || new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

// Alle Berufsgruppen (dedupliziert, kanonische Reihenfolge: ICU → NF → Betten)
function getAllRoles() {
  const seen = new Set();
  const roles = [];
  ['icu', 'emergency', 'ward'].forEach(type => {
    (STAFF_ROLES_BY_TYPE[type] || []).forEach(r => {
      if (!seen.has(r.id)) { seen.add(r.id); roles.push(r); }
    });
  });
  return roles;
}

const ROLE_SHORT = {
  exp_int:  'Exp. Intensiv',  exp_nf:   'Exp. Notfall',
  pfn_hf:   'Dipl. PFP HF',
  stud_hf3: 'Stud. HF 3.J',  stud_hf2: 'Stud. HF 2.J',  stud_hf1: 'Stud. HF 1.J',
  stud_int: 'Stud. Intensiv', stud_nf:  'Stud. Notfall',
  fage_efz: 'FaGe EFZ',
  lern_fa2: 'FaGe i.A. 2.J', lern_fa1: 'FaGe i.A. 1.J',
  pfh_ags:  'PfH / AGS',      disp_mpa: 'Disp. / MPA',
};

// ── Initialisierung ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  showLoading(true);
  setTimeout(() => {
    AppState.init();
    initClock();
    initNavigation();
    initSidebar();
    initDataEntryModal();
    buildDeptSelectGrid();
    buildHistDeptSelect();
    renderAllPages();
    updateAlertBadge();
    startAutoRefresh();
    showLoading(false);
  }, 600);
});

function showLoading(show) {
  const el = document.getElementById('loading-overlay');
  if (el) el.style.display = show ? 'flex' : 'none';
}

// ── Uhr ─────────────────────────────────────────────────────

function initClock() {
  const clockEl = document.getElementById('topbar-clock');
  const dateEl  = document.getElementById('topbar-date');
  const shiftEl = document.getElementById('shift-badge');
  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit', second:'2-digit' });
    if (dateEl)  dateEl.textContent  = now.toLocaleDateString('de-CH', { weekday:'long', day:'numeric', month:'long', year:'numeric' });
    if (shiftEl) {
      const s = SHIFTS.find(x => x.id === getCurrentShift());
      shiftEl.textContent = `${s.icon} ${s.label} · ${s.time}`;
    }
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}

// ── Navigation ───────────────────────────────────────────────

function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => navigateTo(item.dataset.page));
  });
}

function navigateTo(pageId) {
  document.querySelectorAll('.nav-item[data-page]').forEach(el =>
    el.classList.toggle('active', el.dataset.page === pageId));
  document.querySelectorAll('.page').forEach(el =>
    el.classList.toggle('active', el.id === `page-${pageId}`));

  const titles = {
    overview:   ['Klinikübersicht',    'Echtzeit-Dashboard'],
    stations:   ['Stationen',          'Belegung · Barthel-Index · Personal'],
    staffing:   ['Personal & Pool',    'IST/SOLL · Skill-Grade-Mix · Pool-Management'],
    or:         ['OP-Planung',         'Geplante Eingriffe & postop. Verlegung'],
    historical: ['Historische Daten',  'Trends & Abweichungsanalyse'],
    info:       ['Kompetenzen',        'Berufsgruppen & Kompetenzprofile'],
  };
  const [main, sub] = titles[pageId] || ['Dashboard', ''];
  setEl('page-main-title', main);
  setEl('page-sub-title',  sub);

  if (pageId === 'historical') renderHistoricalPage();
  if (pageId === 'staffing')   renderStaffingPage();
  if (pageId === 'or')         renderORPage();
  if (pageId === 'info')       renderInfoPage();
}

// ── Sidebar ──────────────────────────────────────────────────

function initSidebar() {
  document.getElementById('sidebar-toggle')?.addEventListener('click', () => {
    document.getElementById('sidebar').classList.toggle('collapsed');
  });
}

// ── Auto-Refresh ─────────────────────────────────────────────

function startAutoRefresh() {
  setInterval(() => {
    AppState.refresh();
    renderAllPages();
    updateAlertBadge();
    const el = document.getElementById('refresh-indicator');
    if (el) el.textContent = `Aktualisiert: ${new Date().toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' })}`;
  }, 60000);

  document.getElementById('btn-refresh')?.addEventListener('click', () => {
    AppState.refresh();
    renderAllPages();
    updateAlertBadge();
  });
}

// ── Alle Seiten rendern ───────────────────────────────────────

function renderAllPages() {
  renderOverviewPage();
  renderStationsPage();
}

// ── OVERVIEW PAGE ────────────────────────────────────────────

function renderOverviewPage() {
  const kpis = AppState.getKPIs();
  renderBelegungTable(kpis);
  renderKPIRow(kpis);
  renderStationGrid();
  renderAlerts();
  buildOccupancyTrendChart('chart-occ-trend',   AppState.historicalData);
  buildBarthelChart('chart-barthel-distrib',     AppState.currentShiftData);
  buildStaffChart('chart-staff',                 AppState.currentShiftData);
  buildAnticipatedChart('chart-anticipated',     AppState.anticipated);
}

// Gesamtbelegung-Tabelle
function renderBelegungTable(kpis) {
  const b = kpis.belegung;
  const rows = [
    { label: 'IPS',              data: b.ips,    color: '#E63946', icon: 'bi-heart-pulse' },
    { label: 'IMC',              data: b.imc,    color: '#F7941D', icon: 'bi-activity' },
    { label: 'Neonatologie',     data: b.neo,    color: '#9B59B6', icon: 'bi-stars' },
    { label: 'Notfall',          data: b.notfall,color: '#FF6B35', icon: 'bi-exclamation-octagon' },
    { label: 'Bettenabteilungen',data: b.betten, color: '#0056A2', icon: 'bi-hospital', isSummary: true },
  ];

  const tbody = document.getElementById('belegung-tbody');
  if (!tbody) return;

  tbody.innerHTML = rows.map(r => {
    const pct      = r.data.beds_operational > 0 ? Math.round((r.data.beds_occupied / r.data.beds_operational) * 100) : 0;
    const pctColor = pct >= 95 ? '#E63946' : pct >= 80 ? '#F7941D' : '#2DC653';
    return `<tr class="${r.isSummary ? 'belegung-summary' : ''}">
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px">
          <i class="bi ${r.icon}" style="color:${r.color};font-size:13px"></i>
          <strong style="color:${r.color}">${r.label}</strong>
        </span>
      </td>
      <td class="text-center"><strong>${r.data.beds_total}</strong></td>
      <td class="text-center">${r.data.beds_operational}</td>
      <td class="text-center">
        <strong style="color:${pctColor}">${r.data.beds_occupied}</strong>
        <span style="font-size:10px;color:${pctColor};margin-left:3px">(${pct}%)</span>
      </td>
      <td>
        <div style="flex:1;height:5px;background:#E2E8F0;border-radius:3px;overflow:hidden">
          <div style="width:${Math.min(pct,100)}%;height:100%;background:${pctColor};border-radius:3px"></div>
        </div>
      </td>
    </tr>`;
  }).join('');

  const totPct   = b.total.beds_operational > 0 ? Math.round((b.total.beds_occupied / b.total.beds_operational) * 100) : 0;
  const totColor = totPct >= 95 ? '#E63946' : totPct >= 80 ? '#F7941D' : '#2DC653';
  const totRow   = document.getElementById('belegung-total-row');
  if (totRow) totRow.innerHTML = `
    <td><strong>KLINIK TOTAL</strong></td>
    <td class="text-center"><strong>${b.total.beds_total}</strong></td>
    <td class="text-center"><strong>${b.total.beds_operational}</strong></td>
    <td class="text-center">
      <strong style="color:${totColor};font-size:16px">${b.total.beds_occupied}</strong>
      <span style="font-size:11px;color:${totColor};margin-left:4px">(${totPct}%)</span>
    </td>
    <td>
      <div style="display:flex;align-items:center;gap:6px">
        <div style="flex:1;height:8px;background:#E2E8F0;border-radius:4px;overflow:hidden">
          <div style="width:${Math.min(totPct,100)}%;height:100%;background:${totColor};border-radius:4px"></div>
        </div>
        <span style="font-weight:800;font-size:14px;color:${totColor}">${totPct}%</span>
      </div>
    </td>`;
}

function renderKPIRow(kpis) {
  const avgB = kpis.avg_barthel;
  setEl('kpi-barthel-val', avgB !== null ? avgB : '—');
  if (avgB !== null) {
    const lvl = avgB <= 30 ? BARTHEL_LEVELS[0] : avgB <= 80 ? BARTHEL_LEVELS[1] : avgB <= 95 ? BARTHEL_LEVELS[2] : BARTHEL_LEVELS[3];
    setEl('kpi-barthel-sub', lvl.label);
  }
  setEl('kpi-staff-actual', kpis.staff_actual);
  setEl('kpi-staff-target', `SOLL: ${kpis.staff_target}`);
  setEl('kpi-coverage',     `${kpis.staff_coverage}%`);
  setEl('kpi-pool-req',     kpis.pool_requests);
  setEl('kpi-pool-rel',     `Freigaben: ${kpis.pool_releases}`);
  setEl('kpi-alerts',       kpis.alerts_count);

  const cc = document.getElementById('kpi-card-coverage');
  if (cc) cc.className = 'kpi-card ' + (kpis.staff_coverage >= 95 ? 'kpi-green' : kpis.staff_coverage >= 80 ? 'kpi-warn' : 'kpi-danger');
}

// ── Station Grid (Overview) ──────────────────────────────────

function renderStationGrid() {
  DEPT_GROUPS.forEach(group => {
    const container = document.getElementById(`station-grid-${group.id}`);
    if (!container) return;
    const depts = DEPARTMENTS.filter(d => d.gruppe === group.id);

    container.innerHTML = depts.map(dept => {
      const d = AppState.currentShiftData.find(x => x.department_id === dept.id);
      if (!d) return '';
      const fillColor   = d.occupancy_pct >= 95 ? '#E63946' : d.occupancy_pct >= 80 ? '#F7941D' : '#2DC653';
      const statusClass = d.occupancy_pct >= 95 ? 'red' : d.occupancy_pct >= 80 ? 'yellow' : 'green';
      const metricHtml  = d.barthel_avg_score !== null
        ? `<div class="stat-value" style="color:${barthelColor(d.barthel_avg_score)}">${d.barthel_avg_score}</div><div class="stat-label">Barthel Ø</div>`
        : `<div class="stat-value" style="color:#F7941D">${d.nems_average ?? '—'}</div><div class="stat-label">NEMS Ø</div>`;

      return `<div class="station-mini-card" style="border-top-color:${dept.color}" onclick="navigateTo('stations')">
        <div class="station-mini-header">
          <span class="station-dot" style="background:${dept.color}"></span>
          <span class="station-mini-name">${dept.name}</span>
          <span class="status-dot ${statusClass}"></span>
          <span class="station-type-badge ${dept.type}">${dept.type.toUpperCase()}</span>
        </div>
        <div class="occ-bar"><div class="occ-bar-fill" style="width:${d.occupancy_pct}%;background:${fillColor}"></div></div>
        <div style="font-size:10px;color:#718096;margin-bottom:6px">${d.beds_occupied}/${d.beds_operational} betrieben · ${d.beds_total} gesamt</div>
        <div class="station-mini-stats">
          <div class="stat-item">
            <div class="stat-value">${d.occupancy_pct}%</div>
            <div class="stat-label">Auslast.</div>
          </div>
          <div class="stat-item">${metricHtml}</div>
          <div class="stat-item">
            <div class="stat-value" style="color:${d.staff_coverage_pct>=90?'#2DC653':'#E63946'}">${d.staff_actual_total}/${d.staff_target_total}</div>
            <div class="stat-label">Personal</div>
          </div>
        </div>
        ${d.pool_request ? `<div class="pool-badge request" style="margin-top:6px">⚠ Pool +${d.pool_request_count}</div>` : ''}
        ${d.pool_release ? `<div class="pool-badge release" style="margin-top:6px">✓ Freigabe ${d.pool_release_count}</div>` : ''}
      </div>`;
    }).join('');
  });
}

function renderAlerts() {
  const container = document.getElementById('alerts-panel');
  if (!container) return;
  if (!AppState.alerts.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span><p>Keine aktuellen Warnungen</p></div>`;
    return;
  }
  const icons = { danger:'🔴', warning:'🟡', info:'ℹ️' };
  container.innerHTML = AppState.alerts.slice(0, 12).map(a => `
    <div class="alert-item ${a.level}">
      <span class="alert-icon">${icons[a.level]||'⚠'}</span>
      <div><div class="alert-dept">${a.dept}</div><div class="alert-msg">${a.msg}</div></div>
    </div>`).join('');
}

function updateAlertBadge() {
  const badge    = document.getElementById('alert-badge');
  const navBadge = document.getElementById('nav-alert-badge');
  if (badge)    { badge.textContent = AppState.alerts.length; badge.style.display = AppState.alerts.length ? '' : 'none'; }
  if (navBadge) navBadge.textContent = AppState.alerts.length;
}

// ── STATIONS PAGE ────────────────────────────────────────────

function renderStationsPage() {
  DEPT_GROUPS.forEach(group => {
    const container = document.getElementById(`station-detail-${group.id}`);
    if (!container) return;
    const depts = DEPARTMENTS.filter(d => d.gruppe === group.id);

    container.innerHTML = depts.map(dept => {
      const d     = AppState.currentShiftData.find(x => x.department_id === dept.id);
      if (!d) return '';
      const isIPS     = dept.id === 'ips';
      const isIMC     = dept.type === 'imc';
      const showNems  = (dept.type === 'icu' || isIMC) && d.nems_average;
      const hidesBarthel = isIPS || isIMC;
      const ts        = new Date(d.timestamp).toLocaleTimeString('de-CH', { hour:'2-digit', minute:'2-digit' });
      const shift     = SHIFTS.find(s => s.id === d.shift);
      const coverageColor = d.staff_coverage_pct >= 95 ? '#2DC653' : d.staff_coverage_pct >= 80 ? '#F7941D' : '#E63946';

      // Bed grid
      const beds = Array.from({length: dept.beds}, (_, i) => {
        const cls = i < d.beds_occupied ? 'occupied' : i < d.beds_operational ? '' : 'closed';
        return `<div class="bed-icon ${cls}" title="Bett ${i+1}: ${cls==='occupied'?'belegt':cls==='closed'?'geschlossen':'frei'}"></div>`;
      }).join('');

      // Barthel section — nur für Abteilungen ohne NEMS (nicht IPS, nicht IMC)
      const barthelSection = !hidesBarthel ? (() => {
        const total = d.beds_occupied || 1;
        const bars  = d.barthel_distrib.map((count, i) => {
          const w = count / total * 100;
          return w > 0 ? `<div class="epa-seg" style="flex:${w};background:${BARTHEL_LEVELS[i].color}" title="${BARTHEL_LEVELS[i].label}: ${count} Pat."></div>` : '';
        }).join('');
        const legend = d.barthel_distrib.map((count, i) => count > 0
          ? `<div class="epa-legend-item"><div class="epa-dot" style="background:${BARTHEL_LEVELS[i].color}"></div>${BARTHEL_LEVELS[i].range}: ${count}</div>`
          : '').join('');
        return `
          <div class="text-sm text-muted mb-12" style="font-weight:600;text-transform:uppercase;letter-spacing:0.5px">Barthel-Index</div>
          <div class="epa-bar">${bars || '<div class="epa-seg" style="flex:1;background:#E2E8F0"></div>'}</div>
          <div class="epa-legend mb-12">${legend}
            ${d.barthel_avg_score !== null ? `<div class="epa-legend-item" style="margin-left:auto;font-weight:700;color:${barthelColor(d.barthel_avg_score)}">Ø ${d.barthel_avg_score} Pkt.</div>` : ''}
          </div>`;
      })()
      : `<div style="padding:10px;background:#FEF3E2;border-radius:8px;text-align:center;margin-bottom:12px;font-size:11px;color:#B45309;font-weight:600">
          ${isIMC ? 'IMC' : 'IPS'}: Komplexität via NEMS-Score
        </div>`;

      // NEMS section
      const nemsSection = showNems ? `
        <div class="divider"></div>
        <div class="flex-center gap-8" style="justify-content:space-between">
          <span class="text-sm text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.5px">NEMS Score</span>
          <div class="flex-center gap-8">
            <span class="font-bold" style="font-size:20px;color:#F7941D">${d.nems_average}</span>
            <span class="text-sm text-muted">Ø / Patient</span>
            <span class="badge ${d.nems_average>=25?'badge-red':d.nems_average>=18?'badge-yellow':'badge-green'}" style="font-size:10px">
              ${d.nems_average>=25?'Hoch':d.nems_average>=18?'Mittel':'Gering'}
            </span>
          </div>
        </div>` : '';

      // Role-specific staff rows
      const roles     = getStaffRoles(dept.type);
      const staffRows = roles.map(role => {
        const act = d.staff_actual_by_role?.[role.id] ?? 0;
        const tgt = d.staff_target_by_role?.[role.id] ?? 0;
        return `<div class="staff-row">
          <span class="staff-role-label" style="font-size:11px">${role.label}</span>
          <span class="staff-actual" style="color:${act>=tgt?'#2DC653':'#E63946'}">${act}</span>
          <span class="staff-target">/ ${tgt}</span>
        </div>`;
      }).join('');

      const poolSection = d.pool_request
        ? `<span class="pool-badge request">⚠ Pool-Anfrage: +${d.pool_request_count}</span>`
        : d.pool_release
          ? `<span class="pool-badge release">✓ Freigabe: ${d.pool_release_count}</span>`
          : '';

      return `<div class="station-detail-card" style="border-top-color:${dept.color}">
        <div class="station-detail-header">
          <div>
            <div class="station-detail-name">${dept.name}
              <span class="station-type-badge ${dept.type}" style="margin-left:6px">${dept.type.toUpperCase()}</span>
            </div>
            <div class="station-detail-full">${dept.fullName} · Etage ${dept.floor}</div>
          </div>
          <div class="station-timestamp">${shift?.icon} ${ts}</div>
        </div>
        <div class="station-detail-body">
          <div class="flex-center gap-8 mb-12" style="justify-content:space-between">
            <div>
              <span style="font-size:22px;font-weight:800">${d.beds_occupied}</span>
              <span class="text-muted" style="font-size:12px"> belegt / ${d.beds_operational} betrieben / ${d.beds_total} total</span>
            </div>
            <div class="badge ${d.occupancy_pct>=95?'badge-red':d.occupancy_pct>=80?'badge-yellow':'badge-green'}">${d.occupancy_pct}%</div>
          </div>
          <div class="bed-grid mb-12">${beds}</div>
          ${barthelSection}
          ${nemsSection}
          <div class="divider"></div>
          <div class="flex-center gap-8 mb-12" style="justify-content:space-between">
            <span class="text-sm text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.5px">Personal IST / SOLL</span>
            <span style="font-weight:700;color:${coverageColor}">${d.staff_coverage_pct}%</span>
          </div>
          ${staffRows}
          <div style="margin-top:8px">${poolSection}</div>
        </div>
      </div>`;
    }).join('');
  });
}

// ── STAFFING PAGE ────────────────────────────────────────────

function renderStaffingPage() {
  const allRoles = getAllRoles();
  const all      = AppState.currentShiftData;

  // ── Thead (dynamisch per Berufsgruppe) ──────────────────────
  const thead = document.getElementById('staffing-thead');
  if (thead) {
    thead.innerHTML = `<tr>
      <th>Abteilung</th>
      ${allRoles.map(r => `<th title="${r.label}">${ROLE_SHORT[r.id] || r.label}</th>`).join('')}
      <th>IST Total</th><th>SOLL Total</th><th>Abdeckung</th>
      <th>Betr. Betten</th><th>Nurse-to-Patient Ratio</th><th>Pool-Status</th>
    </tr>`;
  }

  // ── Tbody ───────────────────────────────────────────────────
  const tbody = document.getElementById('staffing-tbody');
  if (tbody) {
    tbody.innerHTML = all.map(d => {
      const dept   = DEPARTMENTS.find(x => x.id === d.department_id);
      const qualNurses = ['exp_int','exp_nf','pfn_hf'].reduce((s, id) => s + (d.staff_actual_by_role?.[id] || 0), 0);
      const ratio  = qualNurses > 0 ? `1 : ${(d.beds_occupied / qualNurses).toFixed(1)}` : '—';
      const cColor = d.staff_coverage_pct >= 95 ? '#2DC653' : d.staff_coverage_pct >= 80 ? '#F7941D' : '#E63946';
      const roleCells = allRoles.map(r => {
        const v = d.staff_actual_by_role?.[r.id];
        return `<td style="text-align:center">${v !== undefined ? v : '<span style="color:#CBD5E0">—</span>'}</td>`;
      }).join('');
      return `<tr>
        <td><span class="station-dot" style="background:${dept.color};display:inline-block;margin-right:6px"></span>${dept.name}</td>
        ${roleCells}
        <td><strong>${d.staff_actual_total}</strong></td>
        <td>${d.staff_target_total}</td>
        <td>
          <div class="coverage-bar-wrap">
            <div class="coverage-bar"><div class="coverage-fill" style="width:${Math.min(d.staff_coverage_pct,100)}%;background:${cColor}"></div></div>
            <span class="coverage-pct" style="color:${cColor}">${d.staff_coverage_pct}%</span>
          </div>
        </td>
        <td style="text-align:center">${d.beds_operational ?? d.beds_total ?? '—'}</td>
        <td>${ratio}</td>
        <td>${d.pool_request
          ? `<span class="badge badge-red">+${d.pool_request_count} Anfrage</span>`
          : d.pool_release
            ? `<span class="badge badge-green">-${d.pool_release_count} Freigabe</span>`
            : '<span class="badge badge-blue">OK</span>'}</td>
      </tr>`;
    }).join('');
  }

  // ── Tfoot (Total pro Berufsgruppe) ──────────────────────────
  const tfoot = document.getElementById('staffing-tfoot');
  if (tfoot) {
    const tIST  = all.reduce((s, d) => s + d.staff_actual_total, 0);
    const tSOLL = all.reduce((s, d) => s + d.staff_target_total, 0);
    const tCov  = Math.round((tIST / Math.max(tSOLL, 1)) * 100);
    const tCol  = tCov >= 95 ? '#2DC653' : tCov >= 80 ? '#F7941D' : '#E63946';
    const roleTotals = allRoles.map(r => {
      const sum = all.reduce((s, d) => s + (d.staff_actual_by_role?.[r.id] || 0), 0);
      return `<td style="text-align:center"><strong>${sum > 0 ? sum : '—'}</strong></td>`;
    }).join('');
    tfoot.innerHTML = `
      <tr class="staffing-total-row">
        <td><strong>Total Klinik</strong></td>
        ${roleTotals}
        <td><strong>${tIST}</strong></td><td><strong>${tSOLL}</strong></td>
        <td>
          <div class="coverage-bar-wrap">
            <div class="coverage-bar"><div class="coverage-fill" style="width:${Math.min(tCov,100)}%;background:${tCol}"></div></div>
            <span class="coverage-pct" style="color:${tCol}">${tCov}%</span>
          </div>
        </td>
        <td style="text-align:center"><strong>${all.reduce((s, d) => s + (d.beds_operational ?? d.beds_total ?? 0), 0)}</strong></td>
        <td>—</td><td>—</td>
      </tr>`;
  }

  buildSkillMixChart('chart-skill-mix', AppState.currentShiftData);
  buildNurseRatioChart('chart-nurse-ratio', AppState.currentShiftData);
  renderPoolCards();
}

function renderPoolCards() {
  const reqEl = document.getElementById('pool-requests-container');
  const relEl = document.getElementById('pool-releases-container');

  const requests = AppState.currentShiftData.filter(d => d.pool_request);
  const releases = AppState.currentShiftData.filter(d => d.pool_release);

  if (reqEl) reqEl.innerHTML = requests.length ? requests.map(d => {
    const dept = DEPARTMENTS.find(x => x.id === d.department_id);
    return `<div class="pool-card">
      <div class="pool-card-header"><span class="station-dot" style="background:${dept.color}"></span><span class="pool-card-dept">${dept.name}</span></div>
      <span class="pool-card-count">${d.pool_request_count}</span>
      <span class="pool-card-unit">Person${d.pool_request_count>1?'en':''} benötigt</span>
      <div class="pool-card-reason">Belegung: ${d.occupancy_pct}% · Barthel Ø: ${d.barthel_avg_score ?? 'NEMS'} · Abdeckung: ${d.staff_coverage_pct}%</div>
      <button class="pool-action-btn confirm" onclick="confirmPoolRequest('${d.department_id}')">Pool-Anfrage bestätigen</button>
    </div>`;
  }).join('') : '<div class="empty-state"><span class="empty-icon">✅</span><p>Keine Pool-Anfragen</p></div>';

  if (relEl) relEl.innerHTML = releases.length ? releases.map(d => {
    const dept = DEPARTMENTS.find(x => x.id === d.department_id);
    return `<div class="pool-card release">
      <div class="pool-card-header"><span class="station-dot" style="background:${dept.color}"></span><span class="pool-card-dept">${dept.name}</span></div>
      <span class="pool-card-count">${d.pool_release_count}</span>
      <span class="pool-card-unit">Person${d.pool_release_count>1?'en':''} freigeben</span>
      <div class="pool-card-reason">Belegung: ${d.occupancy_pct}% · Abdeckung: ${d.staff_coverage_pct}%</div>
      <button class="pool-action-btn release-btn" onclick="confirmPoolRelease('${d.department_id}')">Freigabe bestätigen</button>
    </div>`;
  }).join('') : '<div class="empty-state"><span class="empty-icon">✅</span><p>Keine Freigaben</p></div>';
}

function confirmPoolRequest(deptId) {
  showToast(`Pool-Anfrage für ${DEPARTMENTS.find(x=>x.id===deptId)?.name} weitergeleitet.`);
}
function confirmPoolRelease(deptId) {
  showToast(`Personalfreigabe für ${DEPARTMENTS.find(x=>x.id===deptId)?.name} bestätigt.`);
}

// ── OR PAGE ──────────────────────────────────────────────────

let orSelectedDate = localDateStr();

function renderORPage() {
  renderORKPIs();
  buildORTimelineGrid();
  // Sync date picker
  const picker = document.getElementById('or-date-picker');
  if (picker && !picker.value) picker.value = orSelectedDate;
}

function renderORKPIs() {
  const now   = new Date();
  const today = localDateStr();
  const dow   = now.getDay(); // 0=Sun, 6=Sat

  // "Morgen": skip to Monday if tomorrow falls on a weekend
  const tomOffset = dow === 5 ? 3 : dow === 6 ? 2 : 1; // Fri→+3(Mon), Sat→+2(Mon), else +1
  const tom = new Date(now); tom.setDate(now.getDate() + tomOffset);
  const tomorrowStr = localDateStr(tom);
  const tomorrowLabel = tomOffset > 1
    ? `Mo, ${tom.getDate()}.${tom.getMonth()+1}.`
    : 'Morgen';

  // IPS/IMC: rolling 7-day window so weekends always show next week's planned transfers
  const win7 = new Date(now); win7.setDate(now.getDate() + 7);
  const win7Str   = localDateStr(win7);
  const weekLabel = `${now.getDate()}.${now.getMonth()+1}. – ${win7.getDate()}.${win7.getMonth()+1}.`;

  const all = AppState.orProcedures;

  // ── Row 1: Programm-Übersicht & 7-Tage-Horizont ─────────────
  setEl('or-today-count',    all.filter(p => p.date===today && !p.is_notfall_spur).length);
  setEl('or-tomorrow-label', tomorrowLabel);
  setEl('or-tomorrow-count', all.filter(p => p.date===tomorrowStr && p.status==='planned' && !p.is_notfall_spur).length);
  setEl('or-ips-count',      all.filter(p => p.date>=today && p.date<=win7Str && p.postop_destination==='IPS' && p.status==='planned').length);
  setEl('or-imc-count',      all.filter(p => p.date>=today && p.date<=win7Str && p.postop_destination==='IMC' && p.status==='planned').length);
  setEl('or-ips-week-label', weekLabel);
  setEl('or-imc-week-label', weekLabel);

  // ── Row 2: Postop-Verlegungen für das angezeigte Datum ──────
  const selDate    = orSelectedDate;
  const selLabel   = new Date(selDate + 'T12:00:00').toLocaleDateString('de-CH', { weekday: 'short', day: 'numeric', month: 'short' });
  const selPlanned = all.filter(p => p.date===selDate && p.status==='planned' && !p.is_notfall_spur);
  setEl('or-dest-ips-count', selPlanned.filter(p => p.postop_destination==='IPS').length);
  setEl('or-dest-imc-count', selPlanned.filter(p => p.postop_destination==='IMC').length);
  setEl('or-dest-awr-count', selPlanned.filter(p => p.postop_destination==='AWR').length);
  setEl('or-dest-abt-count', selPlanned.filter(p => p.postop_destination==='Abteilung').length);
  ['or-dest-ips-date','or-dest-imc-date','or-dest-awr-date','or-dest-abt-date'].forEach(id => setEl(id, selLabel));
}

function timeStrToMin(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function buildORTimelineGrid() {
  const container = document.getElementById('or-timeline-grid');
  if (!container) return;

  // 24-hour grid: 07:00 today → 07:00 next day
  // Saal 3 (Notfall) shows full 24h; other rooms show inactive zone after their end time
  const PX_PER_MIN  = 1.0;
  const START_MIN   = 7 * 60;       // 420 min (07:00)
  const TOTAL_MINS  = 24 * 60;      // 1440 min = 1440px
  const gridH       = TOTAL_MINS * PX_PER_MIN;
  const NF_START_MIN = 20 * 60;     // 20:00 → Notfall-Spur begins

  // Time axis: 07:00 through 07:00 next day (25 labels)
  let timeAxis = '<div class="or-time-axis">';
  for (let offset = 0; offset <= TOTAL_MINS; offset += 60) {
    const y        = offset * PX_PER_MIN;
    const absH     = (START_MIN + offset) / 60;  // absolute hour (7..31)
    const displayH = absH % 24;
    const label    = `${String(displayH).padStart(2,'0')}:00`;
    const isMidnight = displayH === 0;
    timeAxis += `<div class="or-time-tick${isMidnight?' or-time-tick-midnight':''}" style="top:${y}px">${label}</div>`;
  }
  timeAxis += '</div>';

  // Procedures for the selected date (include notfall-spur only for Saal 3 display)
  const procs = AppState.orProcedures.filter(p => p.date === orSelectedDate && !p.is_notfall_spur);

  let roomCols = OR_ROOMS.map(room => {
    const roomProcs  = procs.filter(p => p.or_room === room.id);
    const isExtended = !!room.extendedEnd;
    const isNotfall  = room.notfall;

    // Active end in absolute minutes
    const endH    = room.extendedEnd ? parseInt(room.extendedEnd) : 16;
    const endMin  = endH * 60;
    const activeH = (endMin - START_MIN) * PX_PER_MIN;  // px from top where active zone ends

    // For Saal 3: show inactive zone 16:00-20:00, then notfall zone 20:00-07:00
    // For other rooms: show inactive zone from their end until 07:00 next day
    let zones = '';
    if (isNotfall) {
      // 16:00–20:00 inactive (between standard ops and notfall-spur)
      const midpointPx = (NF_START_MIN - START_MIN) * PX_PER_MIN;
      zones += `<div class="or-inactive-zone" style="top:${activeH}px;height:${midpointPx - activeH}px"></div>`;
      // 20:00–07:00 Notfall-Spur zone
      zones += `<div class="or-notfall-zone" style="top:${midpointPx}px;height:${gridH - midpointPx}px">
        <div class="or-notfall-zone-label">Notfall-Spur<br>20:00–07:00</div>
      </div>`;
    } else {
      zones += `<div class="or-inactive-zone" style="top:${activeH}px;height:${gridH - activeH}px"></div>`;
    }

    // Grid lines every 30 min (full 24h)
    let gridLines = '';
    for (let m = 0; m <= TOTAL_MINS; m += 30) {
      const isMidnightLine = (START_MIN + m) % (24 * 60) === 0;
      gridLines += `<div class="or-grid-line${m%60===0?' or-grid-line-hour':''}${isMidnightLine?' or-grid-line-midnight':''}" style="top:${m*PX_PER_MIN}px"></div>`;
    }

    // Procedure blocks
    const blocks = roomProcs.map(proc => {
      const procMin  = timeStrToMin(proc.time);
      // Procedures after midnight belong to the next day in the same slot:
      // if procMin < START_MIN it's post-midnight (add 24h offset)
      const relMin   = procMin >= START_MIN ? procMin - START_MIN : procMin + (24 * 60 - START_MIN);
      const y        = relMin * PX_PER_MIN;
      const h        = Math.max(proc.duration_min * PX_PER_MIN, 20);
      const destColor = { IPS:'#E63946', IMC:'#F7941D', AWR:'#F0C040', Abteilung:'#00A79D' }[proc.postop_destination] || '#718096';
      const textColor = proc.postop_destination === 'AWR' ? '#333' : '#fff';
      const durH = Math.floor(proc.duration_min/60), durM = proc.duration_min%60;
      const durStr = durH>0 ? `${durH}h${durM>0?' '+durM+'\'':''}` : `${durM}'`;
      return `
        <div class="or-proc-block" style="top:${y}px;height:${h}px;background:${destColor};color:${textColor}"
             draggable="true"
             data-proc-id="${proc.id}" onclick="openEditProcedure('${proc.id}')" title="${proc.procedure} – ${proc.surgeon}">
          <div class="or-proc-time">${proc.time}</div>
          <div class="or-proc-name">${proc.procedure}</div>
          ${h >= 40 ? `<div class="or-proc-dest">${proc.postop_destination} · ${durStr}</div>` : ''}
          <div class="or-proc-edit-hint"><i class="bi bi-pencil"></i> <i class="bi bi-grip-vertical" style="opacity:.6"></i></div>
        </div>`;
    }).join('');

    const badgeClass = isNotfall ? 'badge-red' : isExtended ? 'badge-yellow' : 'badge-blue';
    const badgeLabel = isNotfall ? '24h Notfall' : isExtended ? `bis ${room.extendedEnd}` : 'bis 16:00';

    return `
      <div class="or-room-col">
        <div class="or-room-col-header" style="border-top-color:${isNotfall?'#E63946':isExtended?'#F7941D':'#00A79D'}">
          <strong>${room.label}</strong>
          <span class="badge ${badgeClass}" style="font-size:9px">${badgeLabel}</span>
          <span class="or-drop-time-hint"></span>
        </div>
        <div class="or-room-col-body" data-room-id="${room.id}" style="height:${gridH}px;position:relative">
          ${gridLines}${zones}${blocks}
        </div>
      </div>`;
  }).join('');

  container.innerHTML = `
    <div class="or-grid-wrapper">
      ${timeAxis}
      <div class="or-rooms-wrapper">${roomCols}</div>
    </div>`;
  initORDragDrop();
  renderORKPIs();
}

function initORDragDrop() {
  const PX_PER_MIN = 1.0;
  const START_MIN  = 7 * 60;
  const SNAP_MIN   = 15;
  let dragProcId   = null;
  let dragOffsetY  = 0;

  document.querySelectorAll('.or-proc-block').forEach(block => {
    block.addEventListener('dragstart', e => {
      dragProcId  = block.dataset.procId;
      dragOffsetY = e.clientY - block.getBoundingClientRect().top;
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', dragProcId);
      // Defer so drag ghost captures full block first
      requestAnimationFrame(() => block.classList.add('or-proc-dragging'));
    });
    block.addEventListener('dragend', () => {
      block.classList.remove('or-proc-dragging');
      document.querySelectorAll('.or-room-col-body.or-drop-over')
              .forEach(b => b.classList.remove('or-drop-over'));
      dragProcId = null;
    });
  });

  document.querySelectorAll('.or-room-col-body').forEach(col => {
    col.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      document.querySelectorAll('.or-room-col-body.or-drop-over')
              .forEach(b => b.classList.remove('or-drop-over'));
      col.classList.add('or-drop-over');

      // Show snapped time indicator in column header
      const colRect = col.getBoundingClientRect();
      const relMin  = Math.max(0, Math.round(Math.max(e.clientY - colRect.top - dragOffsetY, 0) / PX_PER_MIN / SNAP_MIN) * SNAP_MIN);
      const absMin  = (START_MIN + relMin) % (24 * 60);
      const label   = `${String(Math.floor(absMin/60)).padStart(2,'0')}:${String(absMin%60).padStart(2,'0')}`;
      const hint    = col.parentElement.querySelector('.or-drop-time-hint');
      if (hint) hint.textContent = label;
    });
    col.addEventListener('dragleave', e => {
      if (!col.contains(e.relatedTarget)) {
        col.classList.remove('or-drop-over');
        const hint = col.parentElement.querySelector('.or-drop-time-hint');
        if (hint) hint.textContent = '';
      }
    });
    col.addEventListener('drop', e => {
      e.preventDefault();
      col.classList.remove('or-drop-over');
      const hint = col.parentElement.querySelector('.or-drop-time-hint');
      if (hint) hint.textContent = '';
      if (!dragProcId) return;

      const proc = AppState.orProcedures.find(p => p.id === dragProcId);
      if (!proc) return;

      const colRect = col.getBoundingClientRect();
      const relMin  = Math.max(0, Math.round(Math.max(e.clientY - colRect.top - dragOffsetY, 0) / PX_PER_MIN / SNAP_MIN) * SNAP_MIN);
      const absMin  = (START_MIN + relMin) % (24 * 60);
      proc.time    = `${String(Math.floor(absMin/60)).padStart(2,'0')}:${String(absMin%60).padStart(2,'0')}`;
      proc.or_room = parseInt(col.dataset.roomId, 10);

      AppState.saveCustomProcedure(proc);
      dragProcId = null;
      buildORTimelineGrid();
    });
  });
}

function orGoToday() {
  orSelectedDate = localDateStr();
  document.getElementById('or-date-picker').value = orSelectedDate;
  buildORTimelineGrid();
}

function orPrevDay() {
  const d = new Date(orSelectedDate + 'T12:00:00'); d.setDate(d.getDate()-1);
  orSelectedDate = localDateStr(d);
  document.getElementById('or-date-picker').value = orSelectedDate;
  buildORTimelineGrid();
}

function orNextDay() {
  const d = new Date(orSelectedDate + 'T12:00:00'); d.setDate(d.getDate()+1);
  orSelectedDate = localDateStr(d);
  document.getElementById('or-date-picker').value = orSelectedDate;
  buildORTimelineGrid();
}

function openEditProcedure(procId) {
  const proc = AppState.orProcedures.find(p => p.id === procId);
  if (!proc) return;
  const modal = document.getElementById('or-edit-modal-overlay');
  if (!modal) return;
  modal.dataset.procId = procId;

  setInputVal('oredit-patient',      proc.patient_name || '');
  setInputVal('oredit-birthdate',    proc.birth_date   || '');
  setInputVal('oredit-gender',       proc.gender       || '');
  setInputVal('oredit-weight',       proc.weight       || '');
  setInputVal('oredit-height',       proc.height       || '');
  setInputVal('oredit-asa',          proc.asa_class    || 'II');
  setInputVal('oredit-procedure',    proc.procedure    || '');
  setInputVal('oredit-surgeon',      proc.surgeon      || '');
  setInputVal('oredit-duration',     proc.duration_min || '');
  setInputVal('oredit-date',         proc.date         || orSelectedDate);
  setInputVal('oredit-time',         proc.time         || '');
  setInputVal('oredit-room',         proc.or_room      || '');
  setInputVal('oredit-postop',       proc.postop_destination || 'AWR');
  setInputVal('oredit-anesthesia',   proc.anesthesia   || 'Allgemeinanästhesie');
  setInputVal('oredit-dringlichkeit',proc.dringlichkeit|| 'Elektiv');
  setInputVal('oredit-instruments',  proc.instruments  || '');
  setInputVal('oredit-equipment',    proc.equipment    || '');
  setInputVal('oredit-notes',        proc.notes        || '');

  modal.classList.add('open');
}

function submitEditProcedure() {
  const modal  = document.getElementById('or-edit-modal-overlay');
  const procId = modal?.dataset.procId;
  if (!procId) return;
  const proc = { ...AppState.orProcedures.find(p => p.id === procId) };
  proc.patient_name        = getInputVal('oredit-patient');
  proc.birth_date          = getInputVal('oredit-birthdate');
  proc.gender              = getInputVal('oredit-gender');
  proc.weight              = parseFloat(getInputVal('oredit-weight')) || null;
  proc.height              = parseFloat(getInputVal('oredit-height')) || null;
  proc.asa_class           = getInputVal('oredit-asa');
  proc.procedure           = getInputVal('oredit-procedure');
  proc.surgeon             = getInputVal('oredit-surgeon');
  proc.duration_min        = parseInt(getInputVal('oredit-duration')) || proc.duration_min;
  proc.date                = getInputVal('oredit-date');
  proc.time                = getInputVal('oredit-time');
  proc.or_room             = parseInt(getInputVal('oredit-room')) || proc.or_room;
  proc.postop_destination  = getInputVal('oredit-postop');
  proc.anesthesia          = getInputVal('oredit-anesthesia');
  proc.dringlichkeit       = getInputVal('oredit-dringlichkeit');
  proc.instruments         = getInputVal('oredit-instruments');
  proc.equipment           = getInputVal('oredit-equipment');
  proc.notes               = getInputVal('oredit-notes');
  AppState.saveCustomProcedure(proc);
  modal.classList.remove('open');
  buildORTimelineGrid();
  renderORKPIs();
  showToast(`Eingriff "${proc.procedure}" gespeichert.`);
}

function deleteEditProcedure() {
  const modal  = document.getElementById('or-edit-modal-overlay');
  const procId = modal?.dataset.procId;
  if (!procId) return;
  const proc = AppState.orProcedures.find(p => p.id === procId);
  if (!confirm(`Eingriff "${proc?.procedure}" wirklich löschen?`)) return;
  AppState.deleteCustomProcedure(procId);
  modal.classList.remove('open');
  buildORTimelineGrid();
  renderORKPIs();
  showToast('Eingriff gelöscht.');
}

function openEmergencyForm() {
  const modal = document.getElementById('or-emergency-modal-overlay');
  if (!modal) return;
  ['emerg-patient','emerg-birthdate','emerg-weight','emerg-height','emerg-procedure',
   'emerg-surgeon','emerg-duration','emerg-instruments','emerg-equipment','emerg-notes',
   'emerg-anesthesia-notes'].forEach(id => setInputVal(id, ''));
  setInputVal('emerg-gender', 'M');
  setInputVal('emerg-asa', 'III');
  setInputVal('emerg-postop', 'IPS');
  setInputVal('emerg-anesthesia', 'Allgemeinanästhesie');
  setInputVal('emerg-level', 'Dringlich (S1)');
  setInputVal('emerg-room', '3');
  const now = new Date();
  setInputVal('emerg-date', orSelectedDate);
  setInputVal('emerg-time', `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}`);
  modal.classList.add('open');
}

function submitEmergencyProcedure() {
  const id = `OR-NF-${Date.now()}`;
  const proc = {
    id,
    patient_name:         getInputVal('emerg-patient'),
    birth_date:           getInputVal('emerg-birthdate'),
    gender:               getInputVal('emerg-gender'),
    weight:               parseFloat(getInputVal('emerg-weight')) || null,
    height:               parseFloat(getInputVal('emerg-height')) || null,
    asa_class:            getInputVal('emerg-asa'),
    procedure:            getInputVal('emerg-procedure'),
    surgeon:              getInputVal('emerg-surgeon'),
    duration_min:         parseInt(getInputVal('emerg-duration')) || 60,
    date:                 getInputVal('emerg-date'),
    time:                 getInputVal('emerg-time'),
    or_room:              parseInt(getInputVal('emerg-room')) || 3,
    postop_destination:   getInputVal('emerg-postop'),
    postop_duration_days: 1,
    anesthesia:           getInputVal('emerg-anesthesia'),
    anesthesia_notes:     getInputVal('emerg-anesthesia-notes'),
    dringlichkeit:        getInputVal('emerg-level'),
    instruments:          getInputVal('emerg-instruments'),
    equipment:            getInputVal('emerg-equipment'),
    notes:                getInputVal('emerg-notes'),
    emergency_level:      getInputVal('emerg-level'),
    status:               'planned',
    is_notfall_spur:      false,
  };
  AppState.saveCustomProcedure(proc);
  document.getElementById('or-emergency-modal-overlay')?.classList.remove('open');
  orSelectedDate = proc.date;
  buildORTimelineGrid();
  renderORKPIs();
  showToast(`Notfall "${proc.procedure}" angemeldet.`);
}

// ── HISTORICAL PAGE ───────────────────────────────────────────

function renderHistoricalPage() {
  const deptSel   = document.getElementById('hist-dept-select')?.value   || 'all';
  const metricSel = document.getElementById('hist-metric-select')?.value || 'occupancy_pct';
  buildHistoricalTrendChart('chart-hist-trend', AppState.historicalData, deptSel, metricSel, historyDays);
  buildDeviationChart('chart-deviation', AppState.historicalData.filter(r => deptSel==='all' || r.department_id===deptSel), metricSel);

  const tbody = document.getElementById('hist-stats-tbody');
  if (!tbody) return;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutStr = cutoff.toISOString().split('T')[0];
  tbody.innerHTML = DEPARTMENTS.map(dept => {
    const recs = AppState.historicalData.filter(r => r.department_id===dept.id && r.date>=cutStr);
    if (!recs.length) return '';
    const avgOcc    = Math.round(recs.reduce((s,r)=>s+r.occupancy_pct,0)/recs.length);
    const maxOcc    = Math.max(...recs.map(r=>r.occupancy_pct));
    const barRecs   = recs.filter(r=>r.barthel_avg !== null && r.barthel_avg !== undefined);
    const avgBarVal = barRecs.length ? Math.round(barRecs.reduce((s,r)=>s+r.barthel_avg,0)/barRecs.length) : null;
    const avgAct    = Math.round(recs.reduce((s,r)=>s+r.staff_actual,0)/recs.length);
    const avgTgt    = Math.round(recs.reduce((s,r)=>s+r.staff_target,0)/recs.length);
    const poolCnt   = recs.filter(r=>r.pool_request).length;
    const barColor  = avgBarVal !== null ? (avgBarVal<=30?'var(--danger)':avgBarVal<=80?'var(--warning)':'var(--success)') : '#718096';
    return `<tr>
      <td><span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${dept.color};margin-right:6px"></span>${dept.name}</td>
      <td>${avgOcc}%</td><td>${maxOcc}%</td>
      <td style="color:${barColor}">${avgBarVal !== null ? avgBarVal+' Pkt.' : '—'}</td>
      <td>${avgAct}</td><td>${avgTgt}</td>
      <td>${poolCnt>0?`<span class="badge badge-yellow">${poolCnt}×</span>`:'<span class="badge badge-green">0</span>'}</td>
    </tr>`;
  }).join('');
}

// ── INFO / KOMPETENZEN PAGE ────────────────────────────────────

function renderInfoPage() {
  const container = document.getElementById('competency-list');
  if (!container) return;
  const comp = AppState.getCompetencies();

  container.innerHTML = Object.entries(comp).map(([roleId, data]) => `
    <div class="competency-card" id="comp-${roleId}">
      <div class="competency-header" onclick="toggleCompetency('${roleId}')">
        <div>
          <div class="competency-title">${data.label}</div>
        </div>
        <div style="display:flex;gap:8px;align-items:center">
          <button class="btn-secondary" onclick="event.stopPropagation();editCompetency('${roleId}')" style="padding:4px 10px;font-size:11px">Bearbeiten</button>
          <i class="bi bi-chevron-down comp-chevron" id="chevron-${roleId}" style="transition:transform 0.2s"></i>
        </div>
      </div>
      <div class="competency-body" id="body-${roleId}" style="display:none">
        <ul class="competency-items" id="items-${roleId}">
          ${(data.items||[]).map(item => `<li>${item}</li>`).join('')}
        </ul>
      </div>
    </div>`).join('');
}

function toggleCompetency(roleId) {
  const body    = document.getElementById(`body-${roleId}`);
  const chevron = document.getElementById(`chevron-${roleId}`);
  if (!body) return;
  const isOpen  = body.style.display !== 'none';
  body.style.display   = isOpen ? 'none' : 'block';
  if (chevron) chevron.style.transform = isOpen ? '' : 'rotate(180deg)';
}

function editCompetency(roleId) {
  const comp   = AppState.getCompetencies();
  const data   = comp[roleId];
  if (!data) return;
  const modal  = document.getElementById('comp-modal-overlay');
  const titleEl= document.getElementById('comp-edit-title');
  const textEl = document.getElementById('comp-edit-text');
  if (!modal || !titleEl || !textEl) return;
  titleEl.textContent = `Kompetenzen bearbeiten: ${data.label}`;
  textEl.value = (data.items||[]).join('\n');
  modal.dataset.roleId = roleId;
  modal.classList.add('open');
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('comp-save-btn')?.addEventListener('click', () => {
    const modal  = document.getElementById('comp-modal-overlay');
    const roleId = modal?.dataset.roleId;
    if (!roleId) return;
    const items = (document.getElementById('comp-edit-text')?.value || '').split('\n').filter(l => l.trim());
    AppState.saveCompetency(roleId, items);
    modal.classList.remove('open');
    renderInfoPage();
    showToast('Kompetenzen gespeichert.');
  });
  document.getElementById('comp-cancel-btn')?.addEventListener('click', () => {
    document.getElementById('comp-modal-overlay')?.classList.remove('open');
  });
  document.getElementById('comp-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'comp-modal-overlay')
      e.target.classList.remove('open');
  });
  document.getElementById('comp-reset-btn')?.addEventListener('click', () => {
    if (confirm('Alle Kompetenzen auf Standard zurücksetzen?')) {
      AppState.resetCompetencies();
      renderInfoPage();
      showToast('Kompetenzen zurückgesetzt.');
    }
  });
  document.querySelectorAll('.date-filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.date-filter-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      historyDays = parseInt(btn.dataset.days);
      renderHistoricalPage();
    });
  });
  document.getElementById('hist-dept-select')?.addEventListener('change', renderHistoricalPage);
  document.getElementById('hist-metric-select')?.addEventListener('change', renderHistoricalPage);

  // OR date picker
  const picker = document.getElementById('or-date-picker');
  if (picker) {
    picker.value = orSelectedDate;
    picker.addEventListener('change', () => { orSelectedDate = picker.value; buildORTimelineGrid(); });
  }

  // OR modal close on overlay click
  document.getElementById('or-edit-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'or-edit-modal-overlay')
      e.target.classList.remove('open');
  });
  document.getElementById('or-emergency-modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'or-emergency-modal-overlay')
      e.target.classList.remove('open');
  });
});

// ── DATA ENTRY MODAL ─────────────────────────────────────────

function setEntryDateToday() {
  const el = document.getElementById('entry-date');
  if (el) { el.value = localDateStr(); updateEntryDateHint(); }
}

function updateEntryDateHint() {
  const val   = document.getElementById('entry-date')?.value;
  const hint  = document.getElementById('entry-date-hint');
  if (!hint) return;
  if (!val) { hint.textContent = ''; return; }
  const today = localDateStr();
  if (val === today) {
    hint.style.color = 'var(--kispi-teal)';
    hint.textContent = 'Heutige Daten werden im Live-Dashboard aktualisiert und gespeichert.';
  } else if (val < today) {
    hint.style.color = 'var(--kispi-blue)';
    hint.textContent = 'Vergangene Schicht — Daten werden in der Rückschau (Historische Daten) gespeichert.';
  } else {
    hint.style.color = 'var(--text-light)';
    hint.textContent = 'Zukünftiges Datum — wird gespeichert, aber noch nicht im Live-Dashboard angezeigt.';
  }
}

function initDataEntryModal() {
  document.getElementById('btn-data-entry')?.addEventListener('click', openDataEntry);
  document.getElementById('nav-data-entry')?.addEventListener('click', openDataEntry);
  document.getElementById('modal-close')?.addEventListener('click', closeDataEntry);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeDataEntry();
  });
  document.querySelectorAll('.shift-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.shift-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedShift = opt.dataset.shiftId;
    });
  });
  const cur = SHIFTS.find(s => s.id === getCurrentShift());
  document.querySelector(`.shift-option[data-shift-id="${cur?.id}"]`)?.click();
  document.getElementById('btn-submit-entry')?.addEventListener('click', submitDataEntry);
  // Pre-fill date to today on first load
  setEntryDateToday();
}

function buildDeptSelectGrid() {
  const grid = document.getElementById('dept-select-grid');
  if (!grid) return;
  grid.innerHTML = DEPARTMENTS.map(d => `
    <div class="dept-option" data-dept-id="${d.id}" style="border-color:${d.color}22">
      <div style="width:8px;height:8px;border-radius:50%;background:${d.color};margin:0 auto 4px"></div>
      <div style="font-size:12px;font-weight:600">${d.name}</div>
      <div style="font-size:9px;color:#718096">${d.gruppe === 'spezial' ? 'Spezial' : 'Betten'}</div>
    </div>`).join('');
  grid.querySelectorAll('.dept-option').forEach(opt => {
    opt.addEventListener('click', () => {
      grid.querySelectorAll('.dept-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedDept = opt.dataset.deptId;
      prefillFromCurrentData();
      buildStaffRoleInputs();
    });
  });
}

function buildHistDeptSelect() {
  const sel = document.getElementById('hist-dept-select');
  if (!sel) return;
  DEPARTMENTS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.id;
    opt.textContent = `${d.name} — ${d.fullName}`;
    sel.appendChild(opt);
  });
}

function buildStaffRoleInputs() {
  if (!selectedDept) return;
  const dept  = DEPARTMENTS.find(x => x.id === selectedDept);
  const roles = getStaffRoles(dept.type);
  const d     = AppState.currentShiftData.find(x => x.department_id === selectedDept);
  const container = document.getElementById('staff-role-inputs');
  if (!container) return;
  container.innerHTML = `
    <div class="form-grid" style="grid-template-columns:1fr 1fr">
      ${roles.map(role => `
        <div class="form-group">
          <label style="font-size:11px">${role.label} — IST</label>
          <input type="number" id="role-ist-${role.id}" min="0" max="30" value="${d?.staff_actual_by_role?.[role.id]??0}">
        </div>
        <div class="form-group">
          <label style="font-size:11px">${role.label} — SOLL</label>
          <input type="number" id="role-soll-${role.id}" min="0" max="30" value="${d?.staff_target_by_role?.[role.id]??0}">
        </div>`).join('')}
    </div>`;
}

function prefillFromCurrentData() {
  if (!selectedDept) return;
  const existing  = AppState.currentShiftData.find(d => d.department_id === selectedDept);
  const dept      = DEPARTMENTS.find(x => x.id === selectedDept);
  const isIPS     = dept?.id === 'ips';
  const isIMC     = dept?.type === 'imc';
  const showNems  = isIPS || isIMC;
  const hideBarthel = isIPS || isIMC;
  if (!existing) return;
  setInputVal('entry-beds-total',       existing.beds_total);
  setInputVal('entry-beds-operational', existing.beds_operational);
  setInputVal('entry-beds-occupied',    existing.beds_occupied);
  existing.barthel_distrib.forEach((count, i) => setInputVal(`entry-b${i+1}`, count));
  if (showNems && existing.nems_average) setInputVal('entry-nems', existing.nems_average);
  const nemsRow    = document.getElementById('nems-row');
  const barthelSec = document.getElementById('barthel-section');
  if (nemsRow)    nemsRow.style.display    = showNems   ? '' : 'none';
  if (barthelSec) barthelSec.style.display = hideBarthel ? 'none' : '';
}

function openDataEntry()  {
  document.getElementById('modal-overlay')?.classList.add('open');
  // Always reset date to today when opening
  if (!document.getElementById('entry-date')?.value) setEntryDateToday();
  updateEntryDateHint();
}
function closeDataEntry() { document.getElementById('modal-overlay')?.classList.remove('open'); }

function submitDataEntry() {
  const entryDate = getInputVal('entry-date');
  if (!entryDate)     { alert('Bitte Datum eingeben.');   return; }
  if (!selectedShift) { alert('Bitte Schicht wählen.');   return; }
  if (!selectedDept)  { alert('Bitte Abteilung wählen.'); return; }

  const dept       = DEPARTMENTS.find(x => x.id === selectedDept);
  const isIPS      = dept?.id === 'ips';
  const isIMC      = dept?.type === 'imc';
  const showNems   = isIPS || isIMC;
  const roles      = getStaffRoles(dept.type);

  const barthelDistrib = [1,2,3,4].map(i => parseInt(getInputVal(`entry-b${i}`)) || 0);
  const avgScore       = (isIPS || isIMC) ? null : calcBarthelAvg(barthelDistrib);

  const staff_actual_by_role = {}, staff_target_by_role = {};
  let staffActualTotal = 0, staffTargetTotal = 0;
  roles.forEach(role => {
    const act = parseInt(getInputVal(`role-ist-${role.id}`))  || 0;
    const tgt = parseInt(getInputVal(`role-soll-${role.id}`)) || 0;
    staff_actual_by_role[role.id] = act;
    staff_target_by_role[role.id] = tgt;
    staffActualTotal += act;
    staffTargetTotal += tgt;
  });

  const bedsTotal = parseInt(getInputVal('entry-beds-total'))       || 0;
  const bedsOper  = parseInt(getInputVal('entry-beds-operational'))  || 0;
  const bedsOcc   = parseInt(getInputVal('entry-beds-occupied'))     || 0;
  const nems      = showNems ? parseFloat(getInputVal('entry-nems')) || null : null;

  AppState.submitShiftEntry({
    department_id:       selectedDept,
    shift:               selectedShift,
    date:                entryDate,
    beds_total:          bedsTotal,
    beds_operational:    bedsOper,
    beds_occupied:       bedsOcc,
    beds_reserved:       0,
    occupancy_pct:       bedsOper > 0 ? Math.round((bedsOcc / bedsOper) * 100) : 0,
    barthel_distrib:     barthelDistrib,
    barthel_avg_score:   avgScore,
    nems_average:        nems,
    staff_actual_total:  staffActualTotal,
    staff_target_total:  staffTargetTotal,
    staff_coverage_pct:  staffTargetTotal > 0 ? Math.round((staffActualTotal / staffTargetTotal) * 100) : 100,
    staff_actual_by_role,
    staff_target_by_role,
    staff: {
      actual: { pflegefachpersonen: staffActualTotal, pflegeassistenz: 0, auszubildende: 0, leitend: 1 },
      target: { pflegefachpersonen: staffTargetTotal, pflegeassistenz: 0, auszubildende: 0, leitend: 1 },
    },
    pool_request:        staffActualTotal < staffTargetTotal * THRESHOLDS.pool_request_trigger,
    pool_request_count:  Math.max(0, staffTargetTotal - staffActualTotal),
    pool_release:        staffActualTotal > staffTargetTotal && bedsOper > 0 && (bedsOcc / bedsOper) < 0.65,
    pool_release_count:  Math.max(0, staffActualTotal - staffTargetTotal),
    notes:               getInputVal('entry-notes'),
  });

  renderAllPages();
  updateAlertBadge();
  closeDataEntry();
  const isToday = entryDate === localDateStr();
  showToast(`${dept.name} · ${entryDate} · Schicht ${selectedShift} gespeichert${isToday ? ' (Live-Dashboard aktualisiert)' : ' (Rückschau)'}.`);
}

// ── Toast ─────────────────────────────────────────────────────

function showToast(msg) {
  const t = document.createElement('div');
  t.style.cssText = 'position:fixed;bottom:24px;right:24px;z-index:9999;background:#003A6D;color:#fff;padding:12px 20px;border-radius:8px;font-size:13px;font-weight:500;box-shadow:0 4px 20px rgba(0,0,0,0.2);opacity:0;transition:all 0.3s;transform:translateY(10px)';
  t.textContent = '✓ ' + msg;
  document.body.appendChild(t);
  requestAnimationFrame(() => { t.style.opacity='1'; t.style.transform='translateY(0)'; });
  setTimeout(() => { t.style.opacity='0'; setTimeout(() => t.remove(), 300); }, 3000);
}

// ── Utility ──────────────────────────────────────────────────

function setEl(id, val)     { const e=document.getElementById(id); if(e) e.textContent=String(val); }
function setInputVal(id, v) { const e=document.getElementById(id); if(e) e.value=v; }
function getInputVal(id)    { const e=document.getElementById(id); return e?e.value:''; }

function barthelColor(score) {
  if (score === null || score === undefined) return '#718096';
  if (score <= 30)  return '#E63946';
  if (score <= 80)  return '#F7941D';
  if (score <= 95)  return '#7BC67E';
  return '#2DC653';
}

function getStaffRoles(deptType) {
  if (deptType === 'ward')      return STAFF_ROLES_BY_TYPE.ward;
  if (deptType === 'emergency') return STAFF_ROLES_BY_TYPE.emergency;
  return STAFF_ROLES_BY_TYPE.icu;
}

function calcBarthelAvg(distrib) {
  const midpoints = [15, 57.5, 90, 100];
  const total     = distrib.reduce((a, b) => a + b, 0);
  if (!total) return null;
  return parseFloat((distrib.reduce((s, c, i) => s + c * midpoints[i], 0) / total).toFixed(1));
}
