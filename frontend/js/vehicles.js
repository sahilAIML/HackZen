// ============================================================
// CASHROUTEAI - CIT VEHICLES FLEET MANAGEMENT MODULE
// ============================================================

class VehicleManager {
  constructor(app) {
    this.app = app;
  }

  renderVehiclesList(vehicles) {
    const container = document.getElementById('vehiclesListContainer');
    if (!container) return;

    if (!vehicles || vehicles.length === 0) {
      container.innerHTML = `<div style="text-align: center; padding: 32px; color: #64748b;">No CIT vehicles registered.</div>`;
      return;
    }

    container.innerHTML = vehicles.map(v => {
      const isAvailable = v.status === 'AVAILABLE';
      const isMaint = v.status === 'MAINTENANCE';
      const badgeClass = isAvailable ? 'badge-low' : isMaint ? 'badge-warning' : 'badge-critical';
      const utilPct = v.cash_capacity > 0 ? Math.round((v.current_cash / v.cash_capacity) * 100) : 0;

      return `
        <div class="clay-card" style="padding: 20px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 12px;">
            <div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 1.3rem;">🚚</span>
                <h3 style="font-size: 1.15rem; font-weight: 800; color: #0f172a;">${v.vehicle_code}</h3>
              </div>
              <p style="font-size: 0.8rem; color: #64748b; margin-top: 2px;">${v.driver_name}</p>
            </div>
            <span class="clay-badge ${badgeClass}">${v.status}</span>
          </div>

          <div class="clay-card-inset" style="margin-bottom: 14px;">
            <div style="display: flex; justify-content: space-between; font-size: 0.74rem; font-weight: 700; margin-bottom: 4px;">
              <span>Cash Payload</span>
              <span class="mono">₹${v.current_cash?.toLocaleString()} / ₹${v.cash_capacity?.toLocaleString()}</span>
            </div>
            <div style="height: 8px; border-radius: 9999px; background: #cbd5e1; overflow: hidden;">
              <div style="height: 100%; width: ${utilPct}%; background: ${utilPct > 80 ? '#ef4444' : '#4f46e5'}; border-radius: 9999px;"></div>
            </div>
          </div>

          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; font-size: 0.78rem; margin-bottom: 14px;">
            <div>
              <span style="color: #64748b; display: block;">Insurance Cap</span>
              <strong class="mono">₹${v.insurance_limit?.toLocaleString()}</strong>
            </div>
            <div>
              <span style="color: #64748b; display: block;">Assigned Route</span>
              <strong>${v.active_route ? v.active_route.route_code : 'None (Standby)'}</strong>
            </div>
          </div>

          <div style="display: flex; gap: 8px;">
            ${isAvailable ? `
              <button class="clay-button clay-button-secondary clay-button-sm" style="flex: 1;" onclick="window.app.simulation.triggerVehicleUnavailable('${v.vehicle_code}')">
                Send to Maintenance
              </button>
            ` : `
              <button class="clay-button clay-button-primary clay-button-sm" style="flex: 1;" onclick="window.app.restoreVehicle('${v.vehicle_code}')">
                Mark Available
              </button>
            `}
          </div>
        </div>
      `;
    }).join('');
  }
}

window.VehicleManager = VehicleManager;
