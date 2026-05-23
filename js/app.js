// ============================================================
// KISPI DASHBOARD — Haupt-Applikationslogik
// ============================================================

let autoRefreshTimer = null;
let clockTimer       = null;
let selectedDept     = null;
let selectedShift    = null;
let historyDays      = 30;

// ── Initialisierung ──────────────────────────────────────────

document.addEventListener('DOMContentLoaded', () => {
  showLoading(true);
  setTimeout(() => {
    AppState.init();
    initClock();
    initNavigation();
    initSidebar();
    initDataEntryModal();
    renderAllPages();
    updateAlertBadge();
    startAutoRefresh();
    showLoading(false);
  }, 600);
});

function showLoading(show) {
  let overlay = document.getElementById('loading-overlay');
  if (!overlay) return;
  overlay.style.display = show ? 'flex' : 'none';
}

// ── Uhr ─────────────────────────────────────────────────────

function initClock() {
  const clockEl = document.getElementById('topbar-clock');
  const dateEl  = document.getElementById('topbar-date');
  const shiftEl = document.getElementById('shift-badge');

  function tick() {
    const now = new Date();
    if (clockEl) clockEl.textContent = now.toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    if (dateEl)  dateEl.textContent  = now.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
    if (shiftEl) {
      const s = SHIFTS.find(x => x.id === getCurrentShift());
      shiftEl.textContent = `${s.icon} ${s.label} ${s.time}`;
    }
  }
  tick();
  clockTimer = setInterval(tick, 1000);
}

// ── Navigation ───────────────────────────────────────────────

function initNavigation() {
  document.querySelectorAll('.nav-item[data-page]').forEach(item => {
    item.addEventListener('click', () => {
      const page = item.dataset.page;
      navigateTo(page);
    });
  });
}

function navigateTo(pageId) {
  // Update nav items
  document.querySelectorAll('.nav-item[data-page]').forEach(el => {
    el.classList.toggle('active', el.dataset.page === pageId);
  });

  // Update pages
  document.querySelectorAll('.page').forEach(el => {
    el.classList.toggle('active', el.id === `page-${pageId}`);
  });

  // Update topbar title
  const titles = {
    overview:   ['Klinikübersicht', 'Echtzeit-Dashboard'],
    stations:   ['Stationen', 'Aktuelle Belegung & EPA-AC'],
    staffing:   ['Personal',  'IST/SOLL · Skill-Grade-Mix · Pool'],
    or:         ['OP-Planung', 'Geplante Eingriffe & postop. Verlegung'],
    historical: ['Historische Daten', 'Trends & Abweichungsanalyse'],
  };

  const titleEl = document.getElementById('page-main-title');
  const subEl   = document.getElementById('page-sub-title');
  if (titleEl && titles[pageId]) titleEl.textContent = titles[pageId][0];
  if (subEl   && titles[pageId]) subEl.textContent   = titles[pageId][1];

  // Page-specific rendering
  if (pageId === 'historical') renderHistoricalPage();
  if (pageId === 'staffing')   renderStaffingPage();
  if (pageId === 'or')         renderORPage();
}

// ── Sidebar ──────────────────────────────────────────────────

function initSidebar() {
  const sidebar = document.getElementById('sidebar');
  const toggle  = document.getElementById('sidebar-toggle');
  if (!toggle) return;
  toggle.addEventListener('click', () => {
    sidebar.classList.toggle('collapsed');
  });
}

// ── Auto-Refresh ─────────────────────────────────────────────

function startAutoRefresh() {
  autoRefreshTimer = setInterval(() => {
    AppState.refresh();
    renderAllPages();
    updateAlertBadge();
    const el = document.getElementById('refresh-indicator');
    if (el) el.textContent = `Aktualisiert: ${new Date().toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' })}`;
  }, 60000); // every 60s
}

document.addEventListener('DOMContentLoaded', () => {
  const manualBtn = document.getElementById('btn-refresh');
  if (manualBtn) {
    manualBtn.addEventListener('click', () => {
      AppState.refresh();
      renderAllPages();
      updateAlertBadge();
      manualBtn.style.transform = 'rotate(360deg)';
      manualBtn.style.transition = 'transform 0.5s';
      setTimeout(() => { manualBtn.style.transform = ''; }, 500);
    });
  }
});

// ── Alle Seiten rendern ───────────────────────────────────────

function renderAllPages() {
  renderOverviewPage();
  renderStationsPage();
}

// ── OVERVIEW PAGE ────────────────────────────────────────────

function renderOverviewPage() {
  const kpis = AppState.getKPIs();
  renderKPIs(kpis);
  renderStationGrid();
  renderAlerts();
  buildOccupancyTrendChart('chart-occ-trend', AppState.historicalData);
  buildEpaDistribChart('chart-epa-distrib', AppState.currentShiftData);
  buildStaffChart('chart-staff', AppState.currentShiftData);
  buildAnticipatedChart('chart-anticipated', AppState.anticipated);
}

function renderKPIs(kpis) {
  setEl('kpi-total-patients',  `${kpis.total_occupied}`);
  setEl('kpi-total-beds',      `von ${kpis.total_beds} Betten`);
  setEl('kpi-occupancy-pct',   `${kpis.occupancy_pct}%`);

  setEl('kpi-epa-val',         kpis.avg_epa);
  const epaLvl = EPA_LEVELS.find(l => l.level === Math.round(kpis.avg_epa)) || EPA_LEVELS[1];
  setEl('kpi-epa-sub',         epaLvl.label);

  setEl('kpi-staff-actual',    kpis.staff_actual);
  setEl('kpi-staff-target',    `SOLL: ${kpis.staff_target}`);
  setEl('kpi-coverage',        `${kpis.staff_coverage}%`);

  setEl('kpi-pool-req',        kpis.pool_requests);
  setEl('kpi-pool-rel',        `Freigaben: ${kpis.pool_releases}`);

  setEl('kpi-alerts',          kpis.alerts_count);

  // Color the coverage KPI
  const coverageCard = document.getElementById('kpi-card-coverage');
  if (coverageCard) {
    coverageCard.className = 'kpi-card ' + (kpis.staff_coverage >= 95 ? 'kpi-green' : kpis.staff_coverage >= 80 ? 'kpi-warn' : 'kpi-danger');
  }
  const occCard = document.getElementById('kpi-card-occ');
  if (occCard) {
    occCard.className = 'kpi-card ' + (kpis.occupancy_pct >= 95 ? 'kpi-danger' : kpis.occupancy_pct >= 80 ? 'kpi-warn' : 'kpi-teal');
  }
}

function renderStationGrid() {
  const container = document.getElementById('station-grid');
  if (!container) return;

  container.innerHTML = AppState.currentShiftData.map(d => {
    const dept   = DEPARTMENTS.find(x => x.id === d.department_id);
    const fillColor = d.occupancy_pct >= 95 ? '#E63946' : d.occupancy_pct >= 80 ? '#F7941D' : '#2DC653';
    const statusClass = d.occupancy_pct >= 95 ? 'red' : d.occupancy_pct >= 80 ? 'yellow' : 'green';

    return `
    <div class="station-mini-card" style="border-top-color:${dept.color}" onclick="navigateTo('stations')">
      <div class="station-mini-header">
        <span class="station-dot" style="background:${dept.color}"></span>
        <span class="station-mini-name">${dept.name}</span>
        <span class="status-dot ${statusClass}"></span>
        <span class="station-type-badge ${dept.type}">${dept.type.toUpperCase()}</span>
      </div>
      <div class="occ-bar">
        <div class="occ-bar-fill" style="width:${d.occupancy_pct}%;background:${fillColor}"></div>
      </div>
      <div class="station-mini-stats">
        <div class="stat-item">
          <div class="stat-value">${d.beds_occupied}/${d.beds_total}</div>
          <div class="stat-label">Betten</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:${epaColor(d.epa_average)}">${d.epa_average}</div>
          <div class="stat-label">EPA-AC</div>
        </div>
        <div class="stat-item">
          <div class="stat-value" style="color:${d.staff_coverage_pct >= 90 ? '#2DC653' : '#E63946'}">${d.staff_actual_total}/${d.staff_target_total}</div>
          <div class="stat-label">Personal</div>
        </div>
      </div>
      ${d.pool_request ? `<div class="pool-badge request" style="margin-top:8px">⚠ Pool +${d.pool_request_count}</div>` : ''}
      ${d.pool_release ? `<div class="pool-badge release" style="margin-top:8px">✓ Freigabe ${d.pool_release_count}</div>` : ''}
    </div>`;
  }).join('');
}

function renderAlerts() {
  const container = document.getElementById('alerts-panel');
  if (!container) return;

  if (!AppState.alerts.length) {
    container.innerHTML = `<div class="empty-state"><span class="empty-icon">✅</span><p>Keine aktuellen Warnungen</p></div>`;
    return;
  }

  const icons = { danger: '🔴', warning: '🟡', info: 'ℹ️' };
  container.innerHTML = AppState.alerts.slice(0, 12).map(a => `
    <div class="alert-item ${a.level}">
      <span class="alert-icon">${icons[a.level] || '⚠'}</span>
      <div>
        <div class="alert-dept">${a.dept}</div>
        <div class="alert-msg">${a.msg}</div>
      </div>
    </div>
  `).join('');
}

function updateAlertBadge() {
  const badge = document.getElementById('alert-badge');
  if (badge) {
    badge.textContent = AppState.alerts.length;
    badge.style.display = AppState.alerts.length ? '' : 'none';
  }
  const navBadge = document.getElementById('nav-alert-badge');
  if (navBadge) navBadge.textContent = AppState.alerts.length;
}

// ── STATIONS PAGE ────────────────────────────────────────────

function renderStationsPage() {
  const container = document.getElementById('station-detail-grid');
  if (!container) return;

  container.innerHTML = AppState.currentShiftData.map(d => {
    const dept    = DEPARTMENTS.find(x => x.id === d.department_id);
    const isICU   = dept.type === 'icu' || dept.type === 'nicu';
    const ts      = new Date(d.timestamp).toLocaleTimeString('de-CH', { hour: '2-digit', minute: '2-digit' });
    const shift   = SHIFTS.find(s => s.id === d.shift);

    // Bed grid
    const beds = [];
    for (let i = 0; i < dept.beds; i++) {
      const cls = i < d.beds_occupied ? 'occupied' : i < d.beds_occupied + d.beds_reserved ? 'reserved' : '';
      beds.push(`<div class="bed-icon ${cls}" data-tooltip="Bett ${i+1}: ${cls || 'frei'}"></div>`);
    }

    // EPA bar
    const total = d.beds_occupied;
    const epaBars = d.epa_distribution.map((count, i) => {
      const w = total > 0 ? (count / total * 100) : 0;
      return w > 0 ? `<div class="epa-seg" style="flex:${w};background:${EPA_LEVELS[i].color}" data-tooltip="EPA ${i+1}: ${count} Pat."></div>` : '';
    }).join('');

    // Staff rows
    const roles = [
      ['Dipl. Pflegefachperson', d.staff.actual.pflegefachpersonen, d.staff.target.pflegefachpersonen],
      ['Pflegeassistenz',        d.staff.actual.pflegeassistenz,    d.staff.target.pflegeassistenz],
      ['Auszubildende',          d.staff.actual.auszubildende,      d.staff.target.auszubildende],
    ];

    const staffRows = roles.map(([label, act, tgt]) => `
      <div class="staff-row">
        <span class="staff-role-label">${label}</span>
        <span class="staff-actual" style="color:${act >= tgt ? '#2DC653' : '#E63946'}">${act}</span>
        <span class="staff-target">/ ${tgt}</span>
      </div>
    `).join('');

    const coverageColor = d.staff_coverage_pct >= 95 ? '#2DC653' : d.staff_coverage_pct >= 80 ? '#F7941D' : '#E63946';
    const nemsSection   = isICU && d.nems_average
      ? `<div class="divider"></div>
         <div class="flex-center gap-8">
           <span class="text-sm text-muted">NEMS Ø</span>
           <span class="font-bold" style="font-size:16px">${d.nems_average}</span>
           <span class="text-sm text-muted">/ Patient</span>
         </div>`
      : '';

    const poolSection = d.pool_request
      ? `<span class="pool-badge request">⚠ Pool-Anfrage: +${d.pool_request_count} Person${d.pool_request_count > 1 ? 'en' : ''}</span>`
      : d.pool_release
        ? `<span class="pool-badge release">✓ Freigabe: ${d.pool_release_count} Person${d.pool_release_count > 1 ? 'en' : ''}</span>`
        : '';

    return `
    <div class="station-detail-card" style="border-top-color:${dept.color}">
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
            <span class="text-muted" style="font-size:13px"> / ${d.beds_total} Betten</span>
            ${d.beds_reserved > 0 ? `<span class="badge badge-yellow" style="margin-left:6px">${d.beds_reserved} reserviert</span>` : ''}
          </div>
          <div class="badge ${d.occupancy_pct >= 95 ? 'badge-red' : d.occupancy_pct >= 80 ? 'badge-yellow' : 'badge-green'}">
            ${d.occupancy_pct}% belegt
          </div>
        </div>

        <div class="bed-grid mb-12">${beds.join('')}</div>

        <div class="text-sm text-muted mb-12" style="font-weight:600;text-transform:uppercase;letter-spacing:0.5px">EPA-AC Verteilung</div>
        <div class="epa-bar">${epaBars || `<div class="epa-seg" style="flex:1;background:#E2E8F0"></div>`}</div>
        <div class="epa-legend mb-12">
          ${d.epa_distribution.map((count, i) => count > 0
            ? `<div class="epa-legend-item"><div class="epa-dot" style="background:${EPA_LEVELS[i].color}"></div>L${i+1}: ${count}</div>`
            : ''
          ).join('')}
          <div class="epa-legend-item" style="margin-left:auto;font-weight:700;color:${epaColor(d.epa_average)}">Ø ${d.epa_average}</div>
        </div>

        ${nemsSection}
        <div class="divider"></div>

        <div class="flex-center gap-8 mb-12" style="justify-content:space-between">
          <span class="text-sm text-muted font-bold" style="text-transform:uppercase;letter-spacing:0.5px">Personal IST/SOLL</span>
          <span style="font-weight:700;color:${coverageColor}">${d.staff_coverage_pct}%</span>
        </div>
        ${staffRows}
        <div style="margin-top:8px">${poolSection}</div>
      </div>
    </div>`;
  }).join('');
}

// ── STAFFING PAGE ────────────────────────────────────────────

function renderStaffingPage() {
  // Summary table
  const tbody = document.getElementById('staffing-tbody');
  if (tbody) {
    tbody.innerHTML = AppState.currentShiftData.map(d => {
      const dept  = DEPARTMENTS.find(x => x.id === d.department_id);
      const ratio = d.staff_actual_total > 0
        ? `1 : ${(d.beds_occupied / d.staff_actual_total).toFixed(1)}`
        : '-';
      const coverageColor = d.staff_coverage_pct >= 95 ? '#2DC653' : d.staff_coverage_pct >= 80 ? '#F7941D' : '#E63946';

      return `<tr>
        <td><span class="station-dot" style="background:${dept.color};display:inline-block;margin-right:6px"></span>${dept.name}</td>
        <td>${d.staff.actual.pflegefachpersonen}</td>
        <td>${d.staff.actual.pflegeassistenz}</td>
        <td>${d.staff.actual.auszubildende}</td>
        <td><strong>${d.staff_actual_total}</strong></td>
        <td>${d.staff_target_total}</td>
        <td>
          <div class="coverage-bar-wrap">
            <div class="coverage-bar">
              <div class="coverage-fill" style="width:${Math.min(d.staff_coverage_pct,100)}%;background:${coverageColor}"></div>
            </div>
            <span class="coverage-pct" style="color:${coverageColor}">${d.staff_coverage_pct}%</span>
          </div>
        </td>
        <td>${ratio}</td>
        <td>${d.pool_request
          ? `<span class="badge badge-red">+${d.pool_request_count} Anfrage</span>`
          : d.pool_release
            ? `<span class="badge badge-green">-${d.pool_release_count} Freigabe</span>`
            : '<span class="badge badge-blue">OK</span>'
        }</td>
      </tr>`;
    }).join('');
  }

  buildSkillMixChart('chart-skill-mix', AppState.currentShiftData);
  buildNurseRatioChart('chart-nurse-ratio', AppState.currentShiftData);
  renderPoolCards();
}

function renderPoolCards() {
  const reqContainer = document.getElementById('pool-requests-container');
  const relContainer = document.getElementById('pool-releases-container');

  const requests = AppState.currentShiftData.filter(d => d.pool_request);
  const releases = AppState.currentShiftData.filter(d => d.pool_release);

  if (reqContainer) {
    reqContainer.innerHTML = requests.length ? requests.map(d => {
      const dept = DEPARTMENTS.find(x => x.id === d.department_id);
      return `<div class="pool-card">
        <div class="pool-card-header">
          <span class="station-dot" style="background:${dept.color}"></span>
          <span class="pool-card-dept">${dept.name}</span>
        </div>
        <span class="pool-card-count">${d.pool_request_count}</span>
        <span class="pool-card-unit">Person${d.pool_request_count > 1 ? 'en' : ''} benötigt</span>
        <div class="pool-card-reason">
          Belegung: ${d.occupancy_pct}% · Ø EPA-AC: ${d.epa_average} · Abdeckung: ${d.staff_coverage_pct}%
        </div>
        <button class="pool-action-btn confirm" onclick="confirmPoolRequest('${d.department_id}')">
          Pool-Anfrage bestätigen
        </button>
      </div>`;
    }).join('')
    : '<div class="empty-state"><span class="empty-icon">✅</span><p>Keine Pool-Anfragen</p></div>';
  }

  if (relContainer) {
    relContainer.innerHTML = releases.length ? releases.map(d => {
      const dept = DEPARTMENTS.find(x => x.id === d.department_id);
      return `<div class="pool-card release">
        <div class="pool-card-header">
          <span class="station-dot" style="background:${dept.color}"></span>
          <span class="pool-card-dept">${dept.name}</span>
        </div>
        <span class="pool-card-count">${d.pool_release_count}</span>
        <span class="pool-card-unit">Person${d.pool_release_count > 1 ? 'en' : ''} freigeben</span>
        <div class="pool-card-reason">
          Belegung: ${d.occupancy_pct}% · Abdeckung: ${d.staff_coverage_pct}%
        </div>
        <button class="pool-action-btn release-btn" onclick="confirmPoolRelease('${d.department_id}')">
          Freigabe bestätigen
        </button>
      </div>`;
    }).join('')
    : '<div class="empty-state"><span class="empty-icon">✅</span><p>Keine Freigaben</p></div>';
  }
}

function confirmPoolRequest(deptId) {
  const dept = DEPARTMENTS.find(x => x.id === deptId);
  alert(`Pool-Anfrage für ${dept.name} wird ans Pflegepool weitergeleitet.`);
}

function confirmPoolRelease(deptId) {
  const dept = DEPARTMENTS.find(x => x.id === deptId);
  alert(`Personalfreigabe für ${dept.name} wurde bestätigt.`);
}

// ── OR PAGE ──────────────────────────────────────────────────

function renderORPage() {
  const container = document.getElementById('or-timeline');
  if (!container) return;

  const today = new Date().toISOString().split('T')[0];
  const groupedByDate = {};
  AppState.orProcedures.forEach(p => {
    if (!groupedByDate[p.date]) groupedByDate[p.date] = [];
    groupedByDate[p.date].push(p);
  });

  container.innerHTML = Object.entries(groupedByDate).map(([date, procs]) => {
    const d     = new Date(date);
    const isToday    = date === today;
    const isTomorrow = new Date(d.setDate(d.getDate() - 1)).toISOString().split('T')[0] === today;
    const dateNew = new Date(date);
    const dayLabel  = isToday
      ? 'Heute'
      : date === new Date(new Date().setDate(new Date().getDate() + 1)).toISOString().split('T')[0]
        ? 'Morgen'
        : dateNew.toLocaleDateString('de-CH', { weekday: 'long', day: 'numeric', month: 'long' });

    const items = procs.map(p => {
      const destClass = p.postop_destination === 'IPS' ? 'ips' : p.postop_destination === 'IMC' ? 'imc' : '';
      const durH = Math.floor(p.duration_min / 60);
      const durM = p.duration_min % 60;
      const durStr = durH > 0 ? `${durH}h ${durM > 0 ? durM + 'min' : ''}` : `${durM}min`;

      return `<div class="or-item ${p.status === 'completed' ? 'completed' : destClass}">
        <span class="or-time">${p.time}</span>
        <span class="or-room">Saal ${p.or_room}</span>
        <div>
          <div class="or-procedure">${p.procedure}</div>
          <div style="font-size:11px;color:#718096">Kind, ${p.age_years}J · ${p.surgeon}</div>
        </div>
        <span class="or-duration">${durStr}</span>
        <span class="or-dest ${destClass}">${p.postop_destination}</span>
        ${p.status === 'completed'
          ? '<span class="badge badge-green" style="font-size:10px">✓ Abgeschlossen</span>'
          : '<span class="badge badge-blue" style="font-size:10px">Geplant</span>'}
      </div>`;
    }).join('');

    const ipsCount = procs.filter(p => p.postop_destination === 'IPS' && p.status !== 'completed').length;
    const imcCount = procs.filter(p => p.postop_destination === 'IMC' && p.status !== 'completed').length;
    const summary  = isToday || date >= today
      ? `<span class="badge badge-red" style="margin-left:8px">IPS +${ipsCount}</span>
         <span class="badge badge-yellow" style="margin-left:4px">IMC +${imcCount}</span>`
      : '';

    return `<div class="or-date-group">
      <div class="or-date-label">${dayLabel} · ${procs.length} Eingriffe ${summary}</div>
      <div class="or-timeline">${items}</div>
    </div>`;
  }).join('');
}

// ── HISTORICAL PAGE ───────────────────────────────────────────

function renderHistoricalPage() {
  const deptSel   = document.getElementById('hist-dept-select')?.value || 'all';
  const metricSel = document.getElementById('hist-metric-select')?.value || 'occupancy_pct';
  buildHistoricalTrendChart('chart-hist-trend', AppState.historicalData, deptSel, metricSel, historyDays);
  buildDeviationChart('chart-deviation', AppState.historicalData.filter(r => deptSel === 'all' || r.department_id === deptSel), metricSel);
}

// ── DATA ENTRY MODAL ─────────────────────────────────────────

function initDataEntryModal() {
  // Open
  document.getElementById('btn-data-entry')?.addEventListener('click', openDataEntry);
  document.getElementById('nav-data-entry')?.addEventListener('click', openDataEntry);

  // Close
  document.getElementById('modal-close')?.addEventListener('click', closeDataEntry);
  document.getElementById('modal-overlay')?.addEventListener('click', e => {
    if (e.target.id === 'modal-overlay') closeDataEntry();
  });

  // Department selection
  document.querySelectorAll('.dept-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.dept-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedDept = opt.dataset.deptId;
      prefillFromCurrentData();
    });
  });

  // Shift selection
  document.querySelectorAll('.shift-option').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.shift-option').forEach(o => o.classList.remove('selected'));
      opt.classList.add('selected');
      selectedShift = opt.dataset.shiftId;
    });
  });

  // Auto-select current shift
  const curShift = getCurrentShift();
  const shiftOpt = document.querySelector(`.shift-option[data-shift-id="${curShift}"]`);
  if (shiftOpt) { shiftOpt.classList.add('selected'); selectedShift = curShift; }

  // Submit
  document.getElementById('btn-submit-entry')?.addEventListener('click', submitDataEntry);
}

function openDataEntry() {
  document.getElementById('modal-overlay').classList.add('open');
}

function closeDataEntry() {
  document.getElementById('modal-overlay').classList.remove('open');
}

function prefillFromCurrentData() {
  if (!selectedDept) return;
  const existing = AppState.currentShiftData.find(d => d.department_id === selectedDept);
  if (!existing) return;

  setInputVal('entry-beds-total',    existing.beds_total);
  setInputVal('entry-beds-occupied', existing.beds_occupied);
  setInputVal('entry-staff-pfn',     existing.staff.actual.pflegefachpersonen);
  setInputVal('entry-staff-pa',      existing.staff.actual.pflegeassistenz);
  setInputVal('entry-staff-ausb',    existing.staff.actual.auszubildende);
  setInputVal('entry-staff-pfn-soll', existing.staff.target.pflegefachpersonen);
  setInputVal('entry-staff-pa-soll',  existing.staff.target.pflegeassistenz);

  // EPA levels
  existing.epa_distribution.forEach((count, i) => {
    setInputVal(`entry-epa-${i+1}`, count);
  });

  const dept = DEPARTMENTS.find(x => x.id === selectedDept);
  const isICU = dept?.type === 'icu' || dept?.type === 'nicu';
  const nemsRow = document.getElementById('nems-row');
  if (nemsRow) nemsRow.style.display = isICU ? '' : 'none';
  if (isICU && existing.nems_average) setInputVal('entry-nems', existing.nems_average);
}

function submitDataEntry() {
  if (!selectedDept) { alert('Bitte Abteilung auswählen.'); return; }
  if (!selectedShift) { alert('Bitte Schicht auswählen.'); return; }

  const bedsTotal    = parseInt(getInputVal('entry-beds-total'))    || 0;
  const bedsOccupied = parseInt(getInputVal('entry-beds-occupied')) || 0;
  const pfn          = parseInt(getInputVal('entry-staff-pfn'))     || 0;
  const pa           = parseInt(getInputVal('entry-staff-pa'))      || 0;
  const ausb         = parseInt(getInputVal('entry-staff-ausb'))    || 0;
  const pfnSoll      = parseInt(getInputVal('entry-staff-pfn-soll'))|| 0;
  const paSoll       = parseInt(getInputVal('entry-staff-pa-soll')) || 0;
  const nems         = parseFloat(getInputVal('entry-nems'))        || null;
  const notes        = getInputVal('entry-notes');

  const epaDistrib = [1,2,3,4,5].map(i => parseInt(getInputVal(`entry-epa-${i}`)) || 0);
  const epaTotal   = epaDistrib.reduce((a,b) => a+b, 0);
  const epaScores  = [];
  epaDistrib.forEach((count, idx) => {
    for (let i = 0; i < count; i++) epaScores.push(idx + 1);
  });
  const epaAvg = epaScores.length > 0
    ? parseFloat((epaScores.reduce((a,b) => a+b, 0) / epaScores.length).toFixed(1))
    : 0;

  const staffActualTotal = pfn + pa + ausb;
  const staffTargetTotal = pfnSoll + paSoll + Math.max(0, staffActualTotal - pfnSoll - paSoll);
  const coveragePct = staffTargetTotal > 0 ? Math.round((staffActualTotal / staffTargetTotal) * 100) : 100;

  const entry = {
    department_id:     selectedDept,
    shift:             selectedShift,
    beds_total:        bedsTotal,
    beds_occupied:     bedsOccupied,
    beds_reserved:     0,
    occupancy_pct:     bedsTotal > 0 ? Math.round((bedsOccupied / bedsTotal) * 100) : 0,
    epa_scores:        epaScores,
    epa_average:       epaAvg,
    epa_distribution:  epaDistrib,
    nems_average:      nems,
    staff: {
      actual: { pflegefachpersonen: pfn, pflegeassistenz: pa, auszubildende: ausb, leitend: 1 },
      target: { pflegefachpersonen: pfnSoll, pflegeassistenz: paSoll, auszubildende: Math.max(0, staffTargetTotal - pfnSoll - paSoll), leitend: 1 },
    },
    staff_actual_total:  staffActualTotal,
    staff_target_total:  staffTargetTotal,
    staff_coverage_pct:  coveragePct,
    pool_request:        staffActualTotal < staffTargetTotal * THRESHOLDS.pool_request_trigger,
    pool_request_count:  Math.max(0, staffTargetTotal - staffActualTotal),
    pool_release:        staffActualTotal > staffTargetTotal && (bedsOccupied / bedsTotal) < 0.65,
    pool_release_count:  Math.max(0, staffActualTotal - staffTargetTotal),
    notes,
  };

  AppState.submitShiftEntry(entry);
  renderAllPages();
  updateAlertBadge();
  closeDataEntry();

  showToast(`Dateneingabe für ${DEPARTMENTS.find(x => x.id === selectedDept)?.name} gespeichert.`);
}

// ── Toast Notification ────────────────────────────────────────

function showToast(msg) {
  const toast = document.createElement('div');
  toast.style.cssText = `
    position:fixed;bottom:24px;right:24px;z-index:999;
    background:#003A6D;color:#fff;padding:12px 20px;
    border-radius:8px;font-size:13px;font-weight:500;
    box-shadow:0 4px 20px rgba(0,0,0,0.2);
    transform:translateY(10px);opacity:0;transition:all 0.3s;
  `;
  toast.textContent = '✓ ' + msg;
  document.body.appendChild(toast);
  requestAnimationFrame(() => { toast.style.opacity='1'; toast.style.transform='translateY(0)'; });
  setTimeout(() => {
    toast.style.opacity = '0';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}

// ── Historical Page Filter Listeners ─────────────────────────

document.addEventListener('DOMContentLoaded', () => {
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
});

// ── Utility ──────────────────────────────────────────────────

function setEl(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = val;
}

function setInputVal(id, val) {
  const el = document.getElementById(id);
  if (el) el.value = val;
}

function getInputVal(id) {
  const el = document.getElementById(id);
  return el ? el.value : '';
}

function epaColor(avg) {
  if (avg <= 1.5) return '#2DC653';
  if (avg <= 2.5) return '#7BC67E';
  if (avg <= 3.5) return '#F7941D';
  if (avg <= 4.5) return '#E67E22';
  return '#E63946';
}
