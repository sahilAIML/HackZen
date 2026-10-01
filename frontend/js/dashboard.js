// ============================================================
// CASHROUTEAI - DASHBOARD APPLICATION CONTROLLER
// Master Frontend Coordinator for Hackathon Prototype
// ============================================================

class CashRouteApp {
  constructor() {
    this.map = new CashRouteMap('networkMap');
    this.charts = new CashRouteCharts();
    this.simulation = new SimulationEngine(this);
    this.atms = new ATMManager(this);
    this.vehicles = new VehicleManager(this);
    this.routes = new RouteManager(this);
    this.atmKiosk = new AtmKioskManager(this);

    this.dashboardData = null;
    this.analyticsData = null;
  }

  async init() {
    console.log('Initializing CashRouteAI Command Center...');
    this.initAuth();
    this.setupNavigation();
    this.setupSearchAndFilters();

    // Load initial data
    await this.refreshAll();

    // Initialize ATM Kiosk module
    if (this.atmKiosk) {
      await this.atmKiosk.init();
    }

    // Apply URL routing (?tab=... and ?atm=...)
    this.handleUrlRouting();

    // Periodic soft sync every 30s
    setInterval(() => this.softSync(), 30000);
  }

  setupNavigation() {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    const newTabToggle = document.getElementById('navOpenNewTabToggle');

    // Default to true (navbar selection opens in a new browser tab)
    const savedNewTab = localStorage.getItem('cashroute_nav_new_tab');
    if (newTabToggle) {
      newTabToggle.checked = savedNewTab === null ? true : savedNewTab === 'true';
      newTabToggle.addEventListener('change', (e) => {
        localStorage.setItem('cashroute_nav_new_tab', e.target.checked);
      });
    }

    tabs.forEach(tab => {
      // 1. Explicit popout icon click always opens in new tab
      const popout = tab.querySelector('.nav-popout-icon');
      if (popout) {
        popout.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          const targetTab = tab.getAttribute('data-tab');
          window.open(`/?tab=${targetTab}`, '_blank');
        });
      }

      // 2. Main tab click
      tab.addEventListener('click', (e) => {
        const targetTab = tab.getAttribute('data-tab');
        const openInNewTab = newTabToggle ? newTabToggle.checked : true;

        // If user held Ctrl/Cmd or middle-clicked, allow standard browser new tab action
        if (e.ctrlKey || e.metaKey || e.button === 1) {
          return;
        }

        e.preventDefault();

        if (openInNewTab) {
          // Open selected navigation view in a new browser tab
          window.open(`/?tab=${targetTab}`, '_blank');
        } else {
          // Switch view in current tab
          this.activateTab(targetTab);
        }
      });
    });
  }

  activateTab(targetTab, updateHistory = true) {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === targetTab) {
        t.classList.add('active');
      } else {
        t.classList.remove('active');
      }
    });

    document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));
    const pane = document.getElementById(targetTab);
    if (pane) pane.classList.add('active');

    // Update URL query parameter without full reload
    if (updateHistory) {
      try {
        const url = new URL(window.location);
        url.searchParams.set('tab', targetTab);
        window.history.replaceState({}, '', url);
      } catch (e) {}
    }

    // Trigger tab-specific loaders
    if (targetTab === 'tabCommandCenter') {
      setTimeout(() => {
        if (this.map && this.map.map) {
          this.map.map.invalidateSize();
        }
      }, 150);
    } else if (targetTab === 'tabAtms') {
      if (this.atms) this.atms.loadAtmsTable();
    } else if (targetTab === 'tabFleet') {
      this.loadVehiclesTab();
    } else if (targetTab === 'tabDriverPortal') {
      this.loadDriverPortalTab();
    } else if (targetTab === 'tabAnalytics') {
      this.loadAnalyticsTab();
    } else if (targetTab === 'tabAudit') {
      this.loadAuditTab();
    } else if (targetTab === 'tabCopilot') {
      const input = document.getElementById('copilotInput');
      if (input) setTimeout(() => input.focus(), 150);
    } else if (targetTab === 'tabAtmTerminal') {
      if (this.atmKiosk) {
        this.atmKiosk.populateAtmDropdown();
        this.atmKiosk.updateAtmStatusDisplay();
      }
    }
  }

  handleUrlRouting() {
    try {
      const params = new URLSearchParams(window.location.search);
      let tab = params.get('tab') || window.location.hash.replace('#', '');
      const atmCode = params.get('atm');

      if (!tab && !atmCode) return;

      const aliasMap = {
        'kiosk': 'tabAtmTerminal',
        'atm': 'tabAtmTerminal',
        'atmkiosk': 'tabAtmTerminal',
        'atm-kiosk': 'tabAtmTerminal',
        'driver': 'tabDriverPortal',
        'driverportal': 'tabDriverPortal',
        'driver-portal': 'tabDriverPortal',
        'fleet': 'tabFleet',
        'atms': 'tabAtms',
        'analytics': 'tabAnalytics',
        'audit': 'tabAudit',
        'copilot': 'tabCopilot',
        'command': 'tabCommandCenter',
        'commandcenter': 'tabCommandCenter'
      };

      if (tab && aliasMap[tab.toLowerCase()]) {
        tab = aliasMap[tab.toLowerCase()];
      }

      if (atmCode && !tab) {
        tab = 'tabAtmTerminal';
      }

      if (tab) {
        this.activateTab(tab, false);
      }

      if (atmCode) {
        setTimeout(() => {
          const select = document.getElementById('kioskAtmSelect');
          if (select) {
            select.value = atmCode;
            if (this.atmKiosk) this.atmKiosk.onAtmChanged(atmCode);
          }
        }, 300);
      }
    } catch (e) {
      console.warn('URL routing notice:', e);
    }
  }

  openAtmInKiosk(atmCode) {
    this.closeAtmDrawer();
    const newTabToggle = document.getElementById('navOpenNewTabToggle');
    const openInNewTab = newTabToggle ? newTabToggle.checked : true;

    if (openInNewTab) {
      window.open(`/?tab=tabAtmTerminal&atm=${encodeURIComponent(atmCode)}`, '_blank');
    } else {
      this.activateTab('tabAtmTerminal');
      setTimeout(() => {
        const select = document.getElementById('kioskAtmSelect');
        if (select) {
          select.value = atmCode;
          if (this.atmKiosk) this.atmKiosk.onAtmChanged(atmCode);
        }
      }, 100);
    }
  }

  setupSearchAndFilters() {
    const searchInput = document.getElementById('atmsSearchInput');
    const riskSelect = document.getElementById('atmsRiskFilter');
    const statusSelect = document.getElementById('atmsStatusFilter');

    let debounceTimer;
    const triggerSearch = () => {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        const query = searchInput ? searchInput.value : '';
        const risk = riskSelect ? riskSelect.value : 'ALL';
        const status = statusSelect ? statusSelect.value : 'ALL';
        this.atms.loadAtmsTable(query, risk, status);
      }, 250);
    };

    if (searchInput) searchInput.addEventListener('input', triggerSearch);
    if (riskSelect) riskSelect.addEventListener('change', triggerSearch);
    if (statusSelect) statusSelect.addEventListener('change', triggerSearch);
  }

  async refreshAll() {
    try {
      const res = await fetch('/api/dashboard');
      if (!res.ok) throw new Error('Dashboard API error');
      this.dashboardData = await res.json();

      this.updateKPIs(this.dashboardData.kpi);
      this.updateSystemStatus(this.dashboardData);

      // Render Map
      if (!this.map.map) {
        this.map.init(this.dashboardData.depot);
      }
      this.map.renderATMs(this.dashboardData.critical_queue || []);
      this.map.renderVehicles(this.dashboardData.vehicles || []);
      this.map.renderRoutes(this.dashboardData.routes || []);
      this.map.renderTrafficEvents(this.dashboardData.active_events || []);

      // Render Risk Queue & Allocations
      this.atms.renderRiskQueue(this.dashboardData.critical_queue || []);
      this.atms.renderAllocationsTable(this.dashboardData.critical_queue || [], this.dashboardData.routes || []);

      // Render Forecast Chart
      const topCritical = this.dashboardData.critical_queue && this.dashboardData.critical_queue[0];
      const predictedVal = topCritical ? topCritical.predicted_demand : 32000;
      this.charts.renderDemandForecast(null, predictedVal);

      // Render Routes & Constraints
      this.routes.renderRoutesUI(this.dashboardData.routes || [], this.dashboardData.latest_optimization);

      // Update AI Explainability Card
      this.updateExplainabilityCard(topCritical);

    } catch (err) {
      console.error('Error in refreshAll:', err);
      this.showToast('Failed to refresh dashboard data', 'danger');
    }
  }

  async softSync() {
    try {
      const res = await fetch('/api/dashboard');
      if (res.ok) {
        const data = await res.json();
        this.updateKPIs(data.kpi);
      }
    } catch (e) {
      // silent
    }
  }

  updateKPIs(kpi) {
    if (!kpi) return;
    const setVal = (id, val) => {
      const el = document.getElementById(id);
      if (el) el.innerText = val;
    };

    setVal('kpiActiveAtms', kpi.active_atms || 359);
    setVal('kpiCriticalAtms', kpi.critical_atms !== undefined ? kpi.critical_atms : 12);
    setVal('kpiCashAtRisk', kpi.cash_at_risk_formatted || '₹4.82L');
    setVal('kpiActiveVans', kpi.active_cit_vans || '8 / 10');
    setVal('kpiPredictedDemand', kpi.predicted_demand_formatted || '₹18.6L');
    setVal('kpiRoutesOptimized', kpi.routes_optimized || 14);
  }

  updateSystemStatus(data) {
    const el = document.getElementById('lastUpdatedTime');
    if (el) el.innerText = data.timestamp ? data.timestamp.split(' ').pop() : 'Just now';
    if (data && data.ml_benchmark) {
      const r2El = document.getElementById('forecastMetaR2');
      const maeEl = document.getElementById('forecastMetaMae');
      if (r2El && data.ml_benchmark.R2) r2El.innerText = `R² ${data.ml_benchmark.R2}`;
      if (maeEl && data.ml_benchmark.MAE) maeEl.innerText = `MAE ₹${Number(data.ml_benchmark.MAE).toFixed(2)}`;
    }
  }

  updateExplainabilityCard(atm) {
    const titleEl = document.getElementById('explainAtmTitle');
    const bodyEl = document.getElementById('explainAtmBody');
    const predEl = document.getElementById('explainPredDemand');
    const cashEl = document.getElementById('explainCurrentCash');
    const buffEl = document.getElementById('explainBuffer');
    const reqEl = document.getElementById('explainRequired');
    const shortEl = document.getElementById('explainShortage');
    const riskEl = document.getElementById('explainRiskPct');
    const refillEl = document.getElementById('explainRefill');

    const target = atm || {
      atm_code: 'ATM-103',
      name: 'Guntur Central Branch',
      current_cash: 18500,
      predicted_demand: 32000,
      safety_buffer: 9600,
      required_cash: 41600,
      shortage: 23100,
      risk_percentage: 55.5,
      capacity: 100000
    };

    const curCash = Number(target.current_cash || 0);
    const predDemand = Number(target.predicted_demand || 0);
    const buff = Number(target.safety_buffer || (predDemand * 0.3));
    const req = Number(target.required_cash || (predDemand + buff));
    const short = Number(target.shortage || Math.max(0, req - curCash));
    const cap = Number(target.capacity || 100000);
    const risk = Number(target.risk_percentage || 0);
    const refill = Math.min(short, Math.max(0, cap - curCash));

    if (titleEl) titleEl.innerText = `Why is ${target.atm_code || 'ATM'} Critical?`;
    if (bodyEl) {
      bodyEl.innerText = target.explanation ||
        `Predicted 2-hr withdrawal demand (₹${predDemand.toLocaleString()}) exceeds available cash (₹${curCash.toLocaleString()}) while maintaining the mandatory reserve buffer (₹${buff.toLocaleString()}). Immediate replenishment of ₹${refill.toLocaleString()} is required before stockout.`;
    }

    if (predEl) predEl.innerText = `₹${predDemand.toLocaleString()}`;
    if (cashEl) cashEl.innerText = `₹${curCash.toLocaleString()}`;
    if (buffEl) buffEl.innerText = `₹${buff.toLocaleString()}`;
    if (reqEl) reqEl.innerText = `₹${req.toLocaleString()}`;
    if (shortEl) shortEl.innerText = `₹${short.toLocaleString()}`;
    if (riskEl) riskEl.innerText = `${risk}%`;
    if (refillEl) refillEl.innerText = `₹${refill.toLocaleString()}`;

    // Risk meter fill
    const meterFill = document.getElementById('explainMeterFill');
    if (meterFill) meterFill.style.width = `${Math.min(100, risk)}%`;
  }

  async loadVehiclesTab() {
    try {
      const res = await fetch('/api/vehicles');
      const data = await res.json();
      this.vehicles.renderVehiclesList(data.vehicles || []);
    } catch (e) {
      console.error('Error loading vehicles:', e);
    }
  }

  async loadAnalyticsTab() {
    try {
      const res = await fetch('/api/analytics');
      const data = await res.json();
      this.analyticsData = data;
      this.charts.renderAnalyticsCharts(data);

      const s = data.summary || {};
      const setV = (id, val) => { const el = document.getElementById(id); if (el) el.innerText = val; };
      setV('statStockoutPrevention', `${s.stockout_prevention_rate || 96.8}%`);
      setV('statAvgOptTime', `${s.average_opt_time_sec || 1.24}s`);
      setV('statDistanceSaved', `-${s.distance_saved_pct || 26.6}%`);
      setV('statCapitalEff', `${s.capital_efficiency_score || 94.2}%`);
    } catch (e) {
      console.error('Error loading analytics:', e);
    }
  }

  async loadAuditTab(type = null) {
    const listEl = document.getElementById('auditTimelineList');
    if (!listEl) return;
    listEl.innerHTML = `<div style="text-align: center; padding: 24px;">Loading audit decisions log...</div>`;

    try {
      const url = type ? `/api/audit?type=${type}&limit=60` : `/api/audit?limit=60`;
      const res = await fetch(url);
      const data = await res.json();
      const logs = data.audit_logs || [];

      if (logs.length === 0) {
        listEl.innerHTML = `<div style="text-align: center; padding: 32px; color: #64748b;">No audit decisions logged yet.</div>`;
        return;
      }

      const eventBadges = {
        ROUTE_OPTIMIZED: 'badge-medium',
        ROUTE_REOPTIMIZED: 'badge-critical',
        TRAFFIC_EVENT: 'badge-high',
        RISK_UPDATED: 'badge-critical',
        CASH_ALLOCATION: 'badge-low',
        VEHICLE_ASSIGNED: 'badge-neutral',
        ATM_FAILURE: 'badge-critical',
        ROAD_CLOSURE: 'badge-critical'
      };

      listEl.innerHTML = logs.map(l => {
        const badge = eventBadges[l.event_type] || 'badge-neutral';
        return `
          <div class="clay-card-inset" style="margin-bottom: 12px; padding: 14px 18px;">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span class="clay-badge ${badge}">${l.event_type}</span>
                <strong style="font-size: 0.88rem; color: #0f172a;">${l.description}</strong>
              </div>
              <span class="mono" style="font-size: 0.76rem; color: #64748b;">${l.timestamp}</span>
            </div>
            ${l.old_value || l.new_value ? `
              <div style="display: flex; gap: 16px; font-size: 0.78rem; margin: 4px 0; color: #475569;">
                ${l.old_value ? `<span>Before: <span class="mono">${l.old_value}</span></span>` : ''}
                ${l.new_value ? `<span>After: <strong class="mono" style="color: #4f46e5;">${l.new_value}</strong></span>` : ''}
              </div>
            ` : ''}
            <div style="font-size: 0.76rem; color: #64748b; font-style: italic; margin-top: 4px;">
              Decision Rationale: ${l.decision_reason || 'Autonomous optimization heuristic triggered by system policy.'}
            </div>
          </div>
        `;
      }).join('');
    } catch (e) {
      console.error('Error loading audit log:', e);
      listEl.innerHTML = `<div style="color: #ef4444; padding: 24px;">Failed to load audit logs.</div>`;
    }
  }

  async reoptimizeRoutes() {
    this.showToast('Running OR-Tools CVRP Route Optimization...', 'info');
    try {
      const res = await fetch('/api/optimization/run', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ trigger: 'DISPATCHER_MANUAL_RUN' })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Route Optimization complete in ${data.execution_time || 1.8}s! Routes refreshed.`, 'success');
        await this.refreshAll();
      } else {
        this.showToast('Optimization notice: ' + (data.error || 'Completed'), 'info');
        await this.refreshAll();
      }
    } catch (e) {
      console.error('Optimization error:', e);
      this.showToast('Network error during route optimization', 'danger');
    }
  }

  async approveAllocation(atmCode) {
    this.showToast(`Approving cash replenishment for ${atmCode}...`, 'info');
    try {
      const res = await fetch('/api/cash/allocate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ atm_code: atmCode })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Allocation approved for ${atmCode}! Re-optimizing routes...`, 'success');
        await this.reoptimizeRoutes();
      } else {
        this.showToast(data.error || 'Failed to approve allocation', 'danger');
      }
    } catch (e) {
      console.error('Allocation approval error:', e);
      this.showToast('Network error during allocation approval', 'danger');
    }
  }

  async restoreVehicle(vehicleCode) {
    this.showToast(`Restoring ${vehicleCode} to operational service...`, 'info');
    try {
      const res = await fetch('/api/simulation/vehicle-available', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ vehicle_code: vehicleCode })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`Vehicle ${vehicleCode} is now AVAILABLE for dispatch!`, 'success');
        await this.refreshAll();
        this.loadVehiclesTab();
      } else {
        this.showToast(data.error || 'Failed to restore vehicle', 'danger');
      }
    } catch (e) {
      console.error('Vehicle restore error:', e);
      this.showToast('Network error restoring vehicle', 'danger');
    }
  }

  openAtmDrawer(identifier) {
    this.atms.openDrawer(identifier);
  }

  closeAtmDrawer() {
    this.atms.closeDrawer();
  }

  // ============================================================
  // CASHROUTE AI COPILOT (Google Gemini Intelligence)
  // ============================================================
  switchToCopilot() {
    const tabs = document.querySelectorAll('.nav-tab-btn');
    tabs.forEach(t => {
      if (t.getAttribute('data-tab') === 'tabCopilot') t.click();
    });
  }

  copilotQuickAsk(query) {
    this.switchToCopilot();
    const input = document.getElementById('copilotInput');
    if (input) input.value = query;
    this.sendCopilotQuery(query);
  }

  copilotAskAboutCurrentAtm() {
    const topCritical = this.dashboardData && this.dashboardData.critical_queue && this.dashboardData.critical_queue[0];
    const code = topCritical ? topCritical.atm_code : 'ATM-103';
    this.copilotAskAboutAtm(code);
  }

  copilotAskAboutAtm(atmCode) {
    this.copilotQuickAsk(`Diagnose stockout risk and root cause for ${atmCode} and recommend vehicle dispatch priority.`);
  }

  async sendCopilotQuery(customQuery = null) {
    const input = document.getElementById('copilotInput');
    const query = (customQuery || (input ? input.value : '')).trim();
    if (!query) return;

    if (input) input.value = '';

    const chatContainer = document.getElementById('copilotChatMessages');
    if (!chatContainer) return;

    // Render User message
    const userMsg = document.createElement('div');
    userMsg.style.cssText = 'display: flex; gap: 12px; align-items: flex-start; justify-content: flex-end;';
    userMsg.innerHTML = `
      <div class="clay-card" style="padding: 12px 16px; max-width: 80%; background: #4f46e5; color: white; border-radius: 16px 16px 4px 16px;">
        ${this.escapeHtml(query)}
      </div>
      <div style="width: 36px; height: 36px; border-radius: 12px; background: #1e1b4b; color: white; display: flex; align-items: center; justify-content: center; font-size: 0.95rem; flex-shrink: 0;">👤</div>
    `;
    chatContainer.appendChild(userMsg);

    // Render Loading AI placeholder
    const loadingId = 'aiLoading_' + Date.now();
    const aiMsg = document.createElement('div');
    aiMsg.id = loadingId;
    aiMsg.style.cssText = 'display: flex; gap: 12px; align-items: flex-start;';
    aiMsg.innerHTML = `
      <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">✨</div>
      <div class="clay-card-inset" style="padding: 14px 18px; max-width: 85%; line-height: 1.5;">
        <span style="display: inline-flex; align-items: center; gap: 6px; color: #64748b;">
          <span class="live-pulse"></span> Querying Gemini AI Copilot & evaluating telemetry...
        </span>
      </div>
    `;
    chatContainer.appendChild(aiMsg);
    chatContainer.scrollTop = chatContainer.scrollHeight;

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query })
      });
      const data = await res.json();
      const el = document.getElementById(loadingId);
      if (el) {
        const sourceBadge = data.source ? `<span class="clay-badge badge-primary" style="font-size: 0.68rem; margin-bottom: 6px; display: inline-block;">${data.source}</span>` : '';
        const formattedResp = this.formatMarkdown(data.response || 'No response generated.');
        el.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 12px; background: linear-gradient(135deg, #4f46e5, #7c3aed); color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">✨</div>
          <div class="clay-card-inset" style="padding: 14px 18px; max-width: 85%; line-height: 1.6;">
            ${sourceBadge}
            <div style="color: #0f172a; font-size: 0.88rem;">${formattedResp}</div>
          </div>
        `;
      }
    } catch (e) {
      console.error('Copilot error:', e);
      const el = document.getElementById(loadingId);
      if (el) {
        el.innerHTML = `
          <div style="width: 36px; height: 36px; border-radius: 12px; background: #ef4444; color: white; display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;">⚠️</div>
          <div class="clay-card-inset" style="padding: 14px 18px; max-width: 85%; color: #ef4444;">
            Failed to contact AI Copilot. Please check network connectivity.
          </div>
        `;
      }
    }
    chatContainer.scrollTop = chatContainer.scrollHeight;
  }

  escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  }

  formatMarkdown(text) {
    if (!text) return '';
    let html = this.escapeHtml(text);
    html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/•\s*(.*?)(?=(\n•|\n\n|$))/g, '<li style="margin-bottom: 4px;">$1</li>');
    if (html.includes('<li')) {
      html = html.replace(/(<li.*<\/li>)/s, '<ul style="padding-left: 20px; margin: 8px 0;">$1</ul>');
    }
    html = html.replace(/\n\n/g, '<br><br>').replace(/\n/g, '<br>');
    return html;
  }

  showToast(message, type = 'info') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'toast';
    const borderColors = { success: '#10b981', danger: '#ef4444', info: '#4f46e5', warning: '#f59e0b' };
    toast.style.borderLeftColor = borderColors[type] || '#4f46e5';

    toast.innerHTML = `
      <div>${message}</div>
    `;
    container.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      toast.style.transition = 'all 300ms ease';
      setTimeout(() => toast.remove(), 350);
    }, 4000);
  }

  // ============================================================
  // AUTHENTICATION & ROLE MANAGEMENT
  // ============================================================
  initAuth() {
    const savedUser = localStorage.getItem('cashrouteai_user');
    if (savedUser) {
      try {
        this.currentUser = JSON.parse(savedUser);
      } catch (e) {
        this.currentUser = { role: 'admin', name: 'Chief Dispatcher', username: 'admin' };
      }
    } else {
      this.currentUser = { role: 'admin', name: 'Chief Dispatcher', username: 'admin' };
    }
    this.updateUserUI();
  }

  openLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.style.display = 'flex';
  }

  closeLoginModal() {
    const m = document.getElementById('loginModal');
    if (m) m.style.display = 'none';
  }

  setLoginRole(role) {
    const adminTab = document.getElementById('roleTabAdmin');
    const driverTab = document.getElementById('roleTabDriver');
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');

    if (role === 'admin') {
      if (adminTab) adminTab.classList.add('active');
      if (driverTab) driverTab.classList.remove('active');
      if (uInput) uInput.value = 'admin';
      if (pInput) pInput.value = 'admin123';
    } else {
      if (driverTab) driverTab.classList.add('active');
      if (adminTab) adminTab.classList.remove('active');
      if (uInput) uInput.value = 'driver1';
      if (pInput) pInput.value = 'driver123';
    }
  }

  async quickLogin(username, password) {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    if (uInput) uInput.value = username;
    if (pInput) pInput.value = password;
    await this.handleLogin();
  }

  async handleLogin() {
    const uInput = document.getElementById('loginUsername');
    const pInput = document.getElementById('loginPassword');
    const username = uInput ? uInput.value.trim() : '';
    const password = pInput ? pInput.value.trim() : '';

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await res.json();
      if (data.success) {
        this.currentUser = data.user;
        localStorage.setItem('cashrouteai_user', JSON.stringify(this.currentUser));
        this.closeLoginModal();
        this.updateUserUI();
        this.showToast(`Logged in successfully as ${this.currentUser.name} (${this.currentUser.role.toUpperCase()})`, 'success');

        // If driver, navigate automatically to Driver Portal
        if (this.currentUser.role === 'driver') {
          this.switchToDriver(this.currentUser.vehicle_code || 'VAN-01');
        } else {
          this.switchToAdmin();
        }
      } else {
        this.showToast(data.error || 'Authentication failed', 'danger');
      }
    } catch (e) {
      console.error('Login error:', e);
      this.showToast('Network error during login', 'danger');
    }
  }

  updateUserUI() {
    const nameEl = document.getElementById('currentUserName');
    const iconEl = document.getElementById('currentUserIcon');
    if (!nameEl) return;

    if (this.currentUser.role === 'driver') {
      nameEl.innerText = `Driver: ${this.currentUser.name} (${this.currentUser.vehicle_code || 'VAN-01'})`;
      if (iconEl) iconEl.innerText = '🚚';
    } else {
      nameEl.innerText = `${this.currentUser.name} (Admin)`;
      if (iconEl) iconEl.innerText = '👤';
    }
  }

  switchToAdmin() {
    this.activateTab('tabCommandCenter');
  }

  switchToDriver(vehicleCode = 'VAN-01') {
    this.activateTab('tabDriverPortal');
    this.loadDriverPortalTab(vehicleCode);
  }

  // ============================================================
  // DRIVER MANIFEST CONTROLLER
  // ============================================================
  loadDriverPortalTab(vehicleCode = null) {
    const vCode = vehicleCode || (this.currentUser && this.currentUser.vehicle_code) || 'VAN-01';
    const routes = (this.dashboardData && this.dashboardData.routes) || [];
    const activeRoute = routes.find(r => r.vehicle_code === vCode) || routes[0];

    const titleEl = document.getElementById('driverVehicleTitle');
    const subEl = document.getElementById('driverSubtitle');
    const remCashEl = document.getElementById('driverRemainingCash');
    const capEl = document.getElementById('driverCapacityLimit');
    const insEl = document.getElementById('driverInsuranceLimit');
    const statusEl = document.getElementById('driverRouteStatusBadge');
    const checklistEl = document.getElementById('driverStopsChecklist');
    const stopsBadge = document.getElementById('driverStopsRemainingBadge');

    if (titleEl) titleEl.innerText = `${vCode} Armored CIT Terminal`;
    if (subEl) subEl.innerText = `Driver: ${(this.currentUser && this.currentUser.name) || 'Rajesh Kumar'} • Active Route: ${activeRoute ? activeRoute.route_code : 'STANDBY'}`;

    if (activeRoute) {
      if (remCashEl) remCashEl.innerText = `₹${activeRoute.cash_value?.toLocaleString()}`;
      if (capEl) capEl.innerText = `₹${activeRoute.vehicle_capacity?.toLocaleString()}`;
      if (insEl) insEl.innerText = `₹${activeRoute.insurance_limit?.toLocaleString()}`;
      if (statusEl) {
        statusEl.innerText = activeRoute.dispatch_allowed ? 'SAFE TO DISPATCH' : 'DISPATCH BLOCKED';
        statusEl.style.color = activeRoute.dispatch_allowed ? '#10b981' : '#ef4444';
      }

      const stops = activeRoute.stops || [];
      const pendingCount = stops.filter(s => s.status !== 'COMPLETED').length;
      if (stopsBadge) stopsBadge.innerText = `${pendingCount} Stop(s) Pending`;

      if (checklistEl) {
        if (stops.length === 0) {
          checklistEl.innerHTML = `<div style="text-align:center; padding: 32px; color: #64748b;">No delivery stops assigned to this vehicle route.</div>`;
          return;
        }

        checklistEl.innerHTML = stops.map((s, idx) => {
          const isDone = s.status === 'COMPLETED';
          return `
            <div class="driver-stop-card ${isDone ? 'completed' : ''}" id="driverStopCard_${s.id || idx}">
              <div style="display: flex; align-items: center; gap: 14px;">
                <div style="
                  width: 36px; height: 36px; border-radius: 50%;
                  background: ${isDone ? '#10b981' : '#4f46e5'};
                  color: white; font-weight: 800; font-size: 14px;
                  display: flex; align-items: center; justify-content: center;
                ">
                  ${isDone ? '✓' : s.sequence || (idx + 1)}
                </div>
                <div>
                  <h4 style="font-size: 1.05rem; font-weight: 800; color: #0f172a; margin: 0;">
                    ${s.atm_code} &bull; ${s.atm_name}
                  </h4>
                  <p style="font-size: 0.8rem; color: #64748b; margin: 2px 0 0;">
                    Scheduled Arrival: <strong>ETA ${s.arrival_time}</strong> (${s.estimated_minutes} min leg)
                  </p>
                </div>
              </div>

              <div style="display: flex; align-items: center; gap: 20px;">
                <div style="text-align: right;">
                  <span style="font-size: 0.72rem; color: #64748b; font-weight: 700; text-transform: uppercase;">Cash Injection</span>
                  <div class="mono" style="font-size: 1.15rem; font-weight: 800; color: #10b981;">₹${s.cash_amount?.toLocaleString()}</div>
                </div>

                ${isDone ? `
                  <span class="clay-badge badge-low" style="font-size: 0.82rem; padding: 8px 16px;">
                    ✓ COMPLETED
                  </span>
                ` : `
                  <button class="clay-button clay-button-primary clay-button-sm" onclick="window.app.completeDriverStop(${s.id}, '${s.atm_code}', ${s.cash_amount}, '${vCode}')">
                    ✓ Confirm Cash Delivered
                  </button>
                `}
              </div>
            </div>
          `;
        }).join('');
      }
    } else {
      if (remCashEl) remCashEl.innerText = '₹0';
      if (capEl) capEl.innerText = '₹100,000';
      if (insEl) insEl.innerText = '₹20,00,000';
      if (statusEl) {
        statusEl.innerText = 'STANDBY (NO ROUTE)';
        statusEl.style.color = '#64748b';
      }
      if (stopsBadge) stopsBadge.innerText = '0 Stops';
      if (checklistEl) checklistEl.innerHTML = '<div style="text-align:center; padding: 32px; color: #64748b;">No active delivery routes assigned to this vehicle currently.</div>';
    }
  }

  async completeDriverStop(stopId, atmCode, cashAmount, vehicleCode) {
    this.showToast(`Replenishing ₹${cashAmount.toLocaleString()} at ${atmCode}...`, 'info');
    try {
      const res = await fetch('/api/driver/complete-stop', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stop_id: stopId,
          atm_code: atmCode,
          cash_amount: cashAmount,
          vehicle_code: vehicleCode
        })
      });
      const data = await res.json();
      if (data.success) {
        this.showToast(`🎉 Refill of ₹${cashAmount.toLocaleString()} confirmed at ${atmCode}! Cassette updated.`, 'success');
        await this.refreshAll();
        this.loadDriverPortalTab(vehicleCode);
      } else {
        this.showToast(data.error || 'Failed to complete stop', 'danger');
      }
    } catch (e) {
      console.error('Stop completion error:', e);
      this.showToast('Network error during stop handoff', 'danger');
    }
  }

  // ============================================================
  // AI DISPATCH COPILOT METHODS
  // ============================================================
  focusCopilotInput() {
    const input = document.getElementById('copilotInput');
    if (input) input.focus();
  }

  handleCopilotSubmit(e) {
    if (e) e.preventDefault();
    const input = document.getElementById('copilotInput');
    if (!input) return;
    const msg = input.value.trim();
    if (!msg) return;
    input.value = '';
    this.sendCopilotPrompt(msg);
  }

  askCopilot(prompt) {
    const tabBtn = document.getElementById('navCopilot');
    if (tabBtn) tabBtn.click();
    this.sendCopilotPrompt(prompt);
  }

  openCopilotForAtm(atmCode) {
    this.closeAtmDrawer();
    this.askCopilot(`Analyze cash demand, historical burn rate, and stockout probability for ${atmCode}`);
  }

  copilotAskAboutAtm(atmCode) {
    this.openCopilotForAtm(atmCode);
  }

  async sendCopilotPrompt(prompt) {
    this.appendCopilotUserMessage(prompt);
    this.appendCopilotTypingIndicator();

    try {
      const res = await fetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: prompt })
      });
      const data = await res.json();
      this.removeCopilotTypingIndicator();

      if (data.success) {
        this.appendCopilotAIMessage(data.reply, data.source);
      } else {
        this.appendCopilotAIMessage('Apologies, could not process copilot prompt. ' + (data.error || 'Unknown error'), 'Error');
      }
    } catch (err) {
      console.error('Copilot request failed:', err);
      this.removeCopilotTypingIndicator();
      this.appendCopilotAIMessage('Network communication failure with AI Copilot service.', 'Error');
    }
  }

  formatMarkdown(text) {
    if (!text) return '';
    let escaped = text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
    
    escaped = escaped.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    const lines = escaped.split('\n');
    let inList = false;
    let html = '';
    for (let line of lines) {
      let trimmed = line.trim();
      if (trimmed.startsWith('•') || trimmed.startsWith('-')) {
        if (!inList) {
          html += '<ul style="margin: 6px 0 6px 20px; padding: 0;">';
          inList = true;
        }
        html += `<li>${trimmed.replace(/^[•\-]\s*/, '')}</li>`;
      } else {
        if (inList) {
          html += '</ul>';
          inList = false;
        }
        if (trimmed) {
          html += `<p style="margin: 6px 0;">${trimmed}</p>`;
        }
      }
    }
    if (inList) html += '</ul>';
    return html;
  }

  appendCopilotUserMessage(text) {
    const chat = document.getElementById('copilotChatWindow');
    if (!chat) return;

    const div = document.createElement('div');
    div.style.cssText = 'display: flex; justify-content: flex-end; gap: 12px; align-items: flex-start;';
    div.innerHTML = `
      <div style="background: linear-gradient(135deg, #4f46e5, #6366f1); color: white; border-radius: 12px; padding: 12px 18px; max-width: 80%; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.25);">
        <div style="font-size: 0.72rem; opacity: 0.85; margin-bottom: 4px; text-align: right;">Dispatcher Query</div>
        <div style="font-size: 0.88rem; line-height: 1.5;">${text}</div>
      </div>
      <div style="width: 36px; height: 36px; border-radius: 50%; background: #0f172a; display: flex; align-items: center; justify-content: center; color: white; font-size: 1rem; flex-shrink: 0;">
        👤
      </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  appendCopilotAIMessage(text, source) {
    const chat = document.getElementById('copilotChatWindow');
    if (!chat) return;

    const div = document.createElement('div');
    div.style.cssText = 'display: flex; gap: 12px; align-items: flex-start;';
    const formattedHtml = this.formatMarkdown(text);
    div.innerHTML = `
      <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.1rem; flex-shrink: 0; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.3);">
        🤖
      </div>
      <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); max-width: 85%;">
        <div style="display: flex; justify-content: space-between; margin-bottom: 6px; font-size: 0.76rem; color: #64748b;">
          <strong style="color: #4f46e5;">CashRouteAI Copilot</strong>
          <span style="font-size: 0.7rem; color: #94a3b8;">${source || 'Google Cloud AI'}</span>
        </div>
        <div style="font-size: 0.88rem; color: #1e293b; line-height: 1.6;">
          ${formattedHtml}
        </div>
      </div>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  appendCopilotTypingIndicator() {
    const chat = document.getElementById('copilotChatWindow');
    if (!chat) return;
    const div = document.createElement('div');
    div.id = 'copilotTypingIndicator';
    div.style.cssText = 'display: flex; gap: 12px; align-items: center; color: #64748b; font-size: 0.82rem; padding: 6px 12px;';
    div.innerHTML = `
      <div style="width: 28px; height: 28px; border-radius: 50%; background: #e2e8f0; display: flex; align-items: center; justify-content: center; font-size: 0.85rem;">🤖</div>
      <span>AI Copilot is reasoning through telemetry, demand models, and CVRP routes...</span>
    `;
    chat.appendChild(div);
    chat.scrollTop = chat.scrollHeight;
  }

  removeCopilotTypingIndicator() {
    const ind = document.getElementById('copilotTypingIndicator');
    if (ind) ind.remove();
  }

  clearCopilotChat() {
    const chat = document.getElementById('copilotChatWindow');
    if (!chat) return;
    chat.innerHTML = `
      <div style="display: flex; gap: 12px; align-items: flex-start;">
        <div style="width: 38px; height: 38px; border-radius: 50%; background: linear-gradient(135deg, #4f46e5, #7c3aed); display: flex; align-items: center; justify-content: center; color: white; font-size: 1.1rem; flex-shrink: 0;">
          🤖
        </div>
        <div style="background: white; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; box-shadow: 0 2px 8px rgba(0,0,0,0.04); max-width: 85%;">
          <div style="font-size: 0.88rem; color: #1e293b;">
            Chat session refreshed. Select a quick action above or query the dispatcher copilot.
          </div>
        </div>
      </div>
    `;
  }
}

// Global bootstrap
document.addEventListener('DOMContentLoaded', () => {
  window.app = new CashRouteApp();
  window.app.init();
});
