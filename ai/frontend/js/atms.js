// ============================================================
// CASHROUTEAI - ATM INTELLIGENCE & ALLOCATION MODULE
// ============================================================

class ATMManager {
  constructor(app) {
    this.app = app;
    this.allAtms = [];
  }

  renderRiskQueue(criticalAtms) {
    const container = document.getElementById('atmRiskQueue');
    if (!container) return;

    if (!criticalAtms || criticalAtms.length === 0) {
      container.innerHTML = `
        <div style="text-align: center; padding: 32px; color: #64748b;">
          <div style="font-size: 2rem; margin-bottom: 8px;">✓</div>
          <strong>No Critical ATMs at this time</strong>
          <p style="font-size: 0.8rem; margin-top: 4px;">All ATM cash balances are within safe operational limits.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = criticalAtms.map(atm => {
      const riskClass = atm.criticality === 'CRITICAL' ? 'badge-critical' : 'badge-high';
      const refillAmt = Math.min(atm.shortage, (atm.capacity - atm.current_cash));
      const stockoutText = atm.stockout_minutes ? `~${atm.stockout_minutes} min` : 'Impending';

      return `
        <div class="risk-queue-item">
          <div class="queue-atm-info">
            <h4>
              ${atm.atm_code}
              <span class="clay-badge ${riskClass}">${atm.criticality}</span>
            </h4>
            <p>${atm.name}</p>
            <div style="font-size: 0.72rem; color: #ef4444; font-weight: 600; margin-top: 4px;">
              ⏱ Stockout in ${stockoutText} (${atm.risk_percentage}% risk)
            </div>
          </div>
          <div class="queue-metrics">
            <div class="queue-metric-box">
              <span>Current Cash</span>
              <strong>₹${atm.current_cash?.toLocaleString()}</strong>
            </div>
            <div class="queue-metric-box">
              <span>Predicted</span>
              <strong>₹${atm.predicted_demand?.toLocaleString()}</strong>
            </div>
            <div class="queue-metric-box">
              <span>Refill Req</span>
              <strong style="color: #4f46e5;">₹${refillAmt.toLocaleString()}</strong>
            </div>
            <button class="clay-button clay-button-secondary clay-button-sm" onclick="window.app.openAtmDrawer('${atm.atm_code}')">
              View Details
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  renderAllocationsTable(atms, routes) {
    const tableBody = document.getElementById('allocationTableBody');
    if (!tableBody) return;

    // Filter ATMs that have shortage > 0
    const needy = atms.filter(a => a.shortage > 0).slice(0, 8);

    if (needy.length === 0) {
      tableBody.innerHTML = `<tr><td colspan="8" style="text-align: center; color: #64748b; padding: 24px;">No cash allocations required currently.</td></tr>`;
      return;
    }

    tableBody.innerHTML = needy.map(atm => {
      // Find assigned vehicle and ETA from routes
      let assignedVehicle = 'VAN-01';
      let etaStr = '18 min';
      let statusStr = 'DISPATCH READY';

      routes.forEach(r => {
        const stop = r.stops?.find(s => s.atm_id === atm.id);
        if (stop) {
          assignedVehicle = r.vehicle_code;
          etaStr = `${stop.estimated_minutes} min (${stop.arrival_time})`;
          statusStr = r.dispatch_allowed ? 'DISPATCH READY' : 'BLOCKED';
        }
      });

      const refill = Math.min(atm.shortage, (atm.capacity - atm.current_cash));
      const badgeClass = atm.criticality === 'CRITICAL' ? 'badge-critical' : atm.criticality === 'HIGH' ? 'badge-high' : 'badge-medium';

      return `
        <tr>
          <td>
            <strong>${atm.atm_code}</strong><br>
            <span style="font-size: 0.72rem; color: #64748b;">${atm.name}</span>
          </td>
          <td><span class="clay-badge ${badgeClass}">${atm.criticality}</span></td>
          <td class="mono">₹${atm.required_cash?.toLocaleString()}</td>
          <td class="mono" style="font-weight: 700; color: #4f46e5;">₹${refill.toLocaleString()}</td>
          <td><span class="clay-badge badge-neutral">🚚 ${assignedVehicle}</span></td>
          <td class="mono">${etaStr}</td>
          <td>
            <span class="clay-badge ${statusStr === 'DISPATCH READY' ? 'badge-low' : 'badge-critical'}">
              ${statusStr}
            </span>
          </td>
          <td>
            <div style="display: flex; gap: 6px;">
              <button class="clay-button clay-button-primary clay-button-sm" onclick="window.app.approveAllocation('${atm.atm_code}')">Approve</button>
              <button class="clay-button clay-button-secondary clay-button-sm" onclick="window.app.openAtmDrawer('${atm.atm_code}')">Details</button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  }

  async loadAtmsTable(search = '', risk = 'ALL', status = 'ALL') {
    const tableBody = document.getElementById('atmsMasterTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; padding: 24px;">Loading ATM fleet intelligence...</td></tr>`;

    try {
      const res = await fetch(`/api/atms?search=${encodeURIComponent(search)}&risk=${risk}&status=${status}&limit=100`);
      const data = await res.json();
      this.allAtms = data.atms || [];

      document.getElementById('atmsCountBadge').innerText = `${data.count} of ${data.total} ATMs`;

      tableBody.innerHTML = this.allAtms.map(atm => {
        const badgeClass = atm.criticality === 'CRITICAL' ? 'badge-critical' : atm.criticality === 'HIGH' ? 'badge-high' : atm.criticality === 'MEDIUM' ? 'badge-medium' : 'badge-low';
        return `
          <tr style="cursor: pointer;" onclick="window.app.openAtmDrawer('${atm.atm_code}')">
            <td><strong>${atm.atm_code}</strong></td>
            <td>
              ${atm.name}<br>
              <span style="font-size: 0.72rem; color: #64748b;">${atm.address}</span>
            </td>
            <td class="mono">₹${atm.current_cash?.toLocaleString()}</td>
            <td class="mono">₹${atm.predicted_demand?.toLocaleString()}</td>
            <td class="mono">₹${atm.required_cash?.toLocaleString()}</td>
            <td><span class="clay-badge ${badgeClass}">${atm.criticality} (${atm.risk_percentage}%)</span></td>
            <td>${atm.stockout_minutes ? `~${atm.stockout_minutes} min` : 'Safe'}</td>
            <td><span class="clay-badge ${atm.status === 'NORMAL' ? 'badge-low' : 'badge-critical'}">${atm.status}</span></td>
            <td>
              <button class="clay-button clay-button-secondary clay-button-sm" onclick="event.stopPropagation(); window.app.openAtmDrawer('${atm.atm_code}')">
                Inspect
              </button>
            </td>
          </tr>
        `;
      }).join('');
    } catch (err) {
      console.error('Error loading ATMs table:', err);
      tableBody.innerHTML = `<tr><td colspan="9" style="text-align:center; color: #ef4444;">Failed to load ATMs.</td></tr>`;
    }
  }

  async openDrawer(identifier) {
    const drawer = document.getElementById('atmDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (!drawer || !overlay) return;

    overlay.classList.add('active');
    drawer.classList.add('active');

    const content = document.getElementById('atmDrawerContent');
    content.innerHTML = `<div style="text-align: center; padding: 40px;">Loading intelligence for ${identifier}...</div>`;

    try {
      const res = await fetch(`/api/atms/${identifier}`);
      if (!res.ok) throw new Error('ATM not found');
      const data = await res.json();
      const atm = data.atm;
      const history = data.history || [];

      // Render drawer contents
      const pct = Math.min(100, Math.round((atm.current_cash / atm.capacity) * 100));
      const badgeClass = atm.criticality === 'CRITICAL' ? 'badge-critical' : atm.criticality === 'HIGH' ? 'badge-high' : atm.criticality === 'MEDIUM' ? 'badge-medium' : 'badge-low';

      content.innerHTML = `
        <div style="margin-bottom: 20px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
            <h2 style="font-size: 1.4rem; font-weight: 800; color: #0f172a;">${atm.atm_code}</h2>
            <span class="clay-badge ${badgeClass}">${atm.criticality} RISK</span>
          </div>
          <p style="color: #64748b; font-size: 0.88rem;">${atm.name} &bull; ${atm.city}</p>
          <p style="color: #94a3b8; font-size: 0.78rem;">${atm.address}</p>
        </div>

        <!-- Cash Cassette Status -->
        <div class="clay-card-inset" style="margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; font-size: 0.78rem; font-weight: 700; margin-bottom: 6px;">
            <span>Cassette Cash Fill: ${pct}%</span>
            <span class="mono">₹${atm.current_cash?.toLocaleString()} / ₹${atm.capacity?.toLocaleString()}</span>
          </div>
          <div style="height: 10px; border-radius: 9999px; background: #cbd5e1; overflow: hidden;">
            <div style="height: 100%; width: ${pct}%; background: ${pct < 25 ? '#ef4444' : pct < 50 ? '#f59e0b' : '#10b981'}; border-radius: 9999px;"></div>
          </div>
        </div>

        <!-- AI Explainability Box -->
        <div class="explain-box" style="margin-bottom: 20px;">
          <div class="explain-header">
            <span>🧠</span> Why is ${atm.atm_code} ${atm.criticality}?
          </div>
          <div class="explain-body">
            ${atm.explanation || 'Predicted withdrawal demand exceeds available cash in cassette while maintaining required 30% safety reserve buffer.'}
          </div>
        </div>

        <!-- Next Horizon Metrics Grid -->
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 20px;">
          <div class="clay-card-inset">
            <span style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Predicted Demand</span>
            <div class="mono" style="font-size: 1.2rem; font-weight: 800; color: #0f172a;">₹${atm.predicted_demand?.toLocaleString()}</div>
            <span style="font-size: 0.7rem; color: #64748b;">~2-hour horizon</span>
          </div>
          <div class="clay-card-inset">
            <span style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Safety Buffer (30%)</span>
            <div class="mono" style="font-size: 1.2rem; font-weight: 800; color: #4f46e5;">₹${atm.safety_buffer?.toLocaleString()}</div>
            <span style="font-size: 0.7rem; color: #64748b;">Reserve margin</span>
          </div>
          <div class="clay-card-inset">
            <span style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Required Cash</span>
            <div class="mono" style="font-size: 1.2rem; font-weight: 800; color: #0f172a;">₹${atm.required_cash?.toLocaleString()}</div>
            <span style="font-size: 0.7rem; color: #64748b;">Demand + Buffer</span>
          </div>
          <div class="clay-card-inset">
            <span style="font-size: 0.72rem; color: #64748b; text-transform: uppercase; font-weight: 700;">Expected Shortage</span>
            <div class="mono" style="font-size: 1.2rem; font-weight: 800; color: #ef4444;">₹${atm.shortage?.toLocaleString()}</div>
            <span style="font-size: 0.7rem; color: #ef4444;">Stockout hazard</span>
          </div>
        </div>

        <!-- Chart -->
        <div style="margin-bottom: 20px;">
          <h4 style="font-size: 0.88rem; font-weight: 700; margin-bottom: 8px;">Demand History & Forecast Curve</h4>
          <div style="height: 180px; width: 100%;">
            <canvas id="atmDetailChart"></canvas>
          </div>
        </div>

        <!-- Refill Recommendation Action -->
        <div class="clay-card" style="padding: 16px; background: #f8fafc; border: 1px solid #e2e8f0; margin-bottom: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div>
              <strong style="font-size: 0.9rem;">Recommended Refill Injection</strong>
              <div style="font-size: 0.78rem; color: #64748b;">Caps at max cassette headroom</div>
            </div>
            <div class="mono" style="font-size: 1.3rem; font-weight: 800; color: #10b981;">
              ₹${(atm.allocation?.recommended_refill || 0).toLocaleString()}
            </div>
          </div>
          <div style="display: flex; gap: 10px;">
            <button class="clay-button clay-button-primary" style="flex: 1;" onclick="window.app.approveAllocation('${atm.atm_code}')">
              Approve Cash Injection
            </button>
            <button class="clay-button clay-button-secondary" style="flex: 1;" onclick="window.app.closeAtmDrawer(); window.app.copilotAskAboutAtm('${atm.atm_code}')">
              ✨ Ask AI Copilot
            </button>
          </div>
        </div>
      `;

      // Render chart
      this.app.charts.renderAtmDetailHistory(history, atm.predicted_demand);

    } catch (err) {
      console.error('Drawer load error:', err);
      content.innerHTML = `<div style="color: #ef4444; padding: 24px;">Failed to load ATM details.</div>`;
    }
  }

  closeDrawer() {
    const drawer = document.getElementById('atmDrawer');
    const overlay = document.getElementById('drawerOverlay');
    if (drawer) drawer.classList.remove('active');
    if (overlay) overlay.classList.remove('active');
  }
}

window.ATMManager = ATMManager;
