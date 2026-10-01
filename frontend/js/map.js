// ============================================================
// CASHROUTEAI - LEAFLET MAP MODULE
// Interactive Cash Logistics & CIT Fleet Visualization
// ============================================================

class CashRouteMap {
  constructor(elementId = 'networkMap') {
    this.elementId = elementId;
    this.map = null;
    this.depotMarker = null;
    this.atmMarkers = new Map();
    this.vehicleMarkers = new Map();
    this.routePolylines = [];
    this.trafficOverlays = [];
    this.activeFilter = 'ALL';
    this.depotCoord = [38.4237, 27.1428];
    this.layers = {};
    this.currentBaseLayer = null;
    this.googleApiKey = 'AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM';
  }

  init(depot = null) {
    if (depot && depot.latitude && depot.longitude) {
      this.depotCoord = [depot.latitude, depot.longitude];
    }

    if (this.map) {
      this.map.remove();
    }

    // Initialize Leaflet map
    this.map = L.map(this.elementId, {
      zoomControl: true,
      attributionControl: false
    }).setView(this.depotCoord, 12);

    // Initialize base layers with Google Maps and Carto
    const key = this.googleApiKey;
    this.layers = {
      googleRoadmap: L.tileLayer(`https://mt1.google.com/vt/lyrs=m&x={x}&y={y}&z={z}&key=${key}`, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }),
      googleSatellite: L.tileLayer(`https://mt1.google.com/vt/lyrs=y&x={x}&y={y}&z={z}&key=${key}`, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }),
      googleTraffic: L.tileLayer(`https://mt1.google.com/vt/lyrs=m,traffic&x={x}&y={y}&z={z}&key=${key}`, {
        maxZoom: 20,
        subdomains: ['mt0', 'mt1', 'mt2', 'mt3']
      }),
      cartoLight: L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      }),
      cartoDark: L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      })
    };

    // Default to Google Roadmap
    this.currentBaseLayer = this.layers.googleRoadmap;
    this.currentBaseLayer.addTo(this.map);

    this.renderDepot();
  }

  switchTileLayer(layerKey) {
    if (!this.map || !this.layers[layerKey]) return;
    if (this.currentBaseLayer) {
      this.map.removeLayer(this.currentBaseLayer);
    }
    this.currentBaseLayer = this.layers[layerKey];
    this.currentBaseLayer.addTo(this.map);
  }

  renderDepot() {
    const depotIcon = L.divIcon({
      className: 'depot-map-icon',
      html: `
        <div style="
          background: #1e1b4b;
          color: #ffffff;
          width: 40px;
          height: 40px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 13px;
          box-shadow: 0 6px 16px rgba(30, 27, 75, 0.45), inset 1px 1px 2px rgba(255,255,255,0.4);
          border: 2px solid #ffffff;
        ">
          CIT
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    this.depotMarker = L.marker(this.depotCoord, { icon: depotIcon }).addTo(this.map);
    this.depotMarker.bindPopup(`
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; padding: 4px;">
        <strong style="color: #1e1b4b; font-size: 13px;">Izmir Central CIT Cash Hub</strong><br>
        <span style="font-size: 11px; color: #64748b;">Primary Fleet Dispatch Terminal &bull; Lat: 38.4237, Lon: 27.1428</span>
      </div>
    `);
  }

  renderATMs(atms) {
    // Clear old markers
    this.atmMarkers.forEach(m => this.map.removeLayer(m));
    this.atmMarkers.clear();

    const riskColors = {
      CRITICAL: '#ef4444',
      HIGH: '#f59e0b',
      MEDIUM: '#3b82f6',
      LOW: '#10b981',
      FAILED: '#64748b'
    };

    if (!Array.isArray(atms)) return;

    atms.forEach(atm => {
      const lat = parseFloat(atm.latitude);
      const lng = parseFloat(atm.longitude);
      if (isNaN(lat) || isNaN(lng)) return;

      const isCritical = atm.criticality === 'CRITICAL';
      const color = riskColors[atm.criticality] || '#10b981';

      const customIcon = L.divIcon({
        className: `atm-marker-${atm.id || atm.atm_code}`,
        html: `
          <div style="
            position: relative;
            width: ${isCritical ? '24px' : '18px'};
            height: ${isCritical ? '24px' : '18px'};
            display: flex;
            align-items: center;
            justify-content: center;
          ">
            ${isCritical ? '<div style="position: absolute; width: 100%; height: 100%; border-radius: 50%; background: rgba(239, 68, 68, 0.4); animation: pulse-ring 1.8s infinite;"></div>' : ''}
            <div style="
              width: ${isCritical ? '14px' : '11px'};
              height: ${isCritical ? '14px' : '11px'};
              border-radius: 50%;
              background: ${color};
              border: 2px solid #ffffff;
              box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            "></div>
          </div>
        `,
        iconSize: [24, 24],
        iconAnchor: [12, 12]
      });

      const marker = L.marker([lat, lng], { icon: customIcon }).addTo(this.map);

      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif; min-width: 170px;">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
            <strong style="color: #0f172a; font-size: 13px;">${atm.atm_code}</strong>
            <span style="
              font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 9999px;
              background: ${color}20; color: ${color};
            ">${atm.criticality}</span>
          </div>
          <div style="font-size: 11px; color: #475569; margin-bottom: 6px;">${atm.name}</div>
          <div style="font-size: 11px; margin-bottom: 3px;">Current Cash: <strong>₹${Number(atm.current_cash || 0).toLocaleString()}</strong></div>
          <div style="font-size: 11px; margin-bottom: 6px;">Predicted Demand: <strong>₹${Number(atm.predicted_demand || 0).toLocaleString()}</strong></div>
          <button onclick="window.app.openAtmDrawer('${atm.atm_code}')" style="
            width: 100%; background: #4f46e5; color: white; border: none; border-radius: 6px;
            padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
          ">View Full Intelligence</button>
          <button onclick="window.app.openAtmInKiosk('${atm.atm_code}')" style="
            width: 100%; margin-top: 4px; background: #059669; color: white; border: none; border-radius: 6px;
            padding: 5px 8px; font-size: 11px; font-weight: 600; cursor: pointer;
          ">🏧 Withdraw Cash (Kiosk)</button>
        </div>
      `);

      this.atmMarkers.set(atm.atm_code, marker);
    });
  }

  renderVehicles(vehicles) {
    this.vehicleMarkers.forEach(m => this.map.removeLayer(m));
    this.vehicleMarkers.clear();

    if (!Array.isArray(vehicles)) return;

    vehicles.forEach(v => {
      // Find valid coordinates
      let lat = parseFloat(v.latitude);
      let lng = parseFloat(v.longitude);

      if (isNaN(lat) || isNaN(lng)) {
        if (v.stops && v.stops.length > 0 && v.stops[0].latitude) {
          lat = parseFloat(v.stops[0].latitude);
          lng = parseFloat(v.stops[0].longitude);
        } else {
          return;
        }
      }

      if (isNaN(lat) || isNaN(lng)) return;

      const isAvailable = v.status === 'AVAILABLE';
      const icon = L.divIcon({
        className: 'vehicle-marker-icon',
        html: `
          <div style="
            background: ${isAvailable ? '#2563eb' : '#64748b'};
            color: white;
            padding: 3px 6px;
            border-radius: 8px;
            font-size: 10px;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 4px;
            border: 2px solid white;
            box-shadow: 0 4px 10px rgba(0,0,0,0.22);
            white-space: nowrap;
          ">
            <span>🚚</span> ${v.vehicle_code}
          </div>
        `,
        iconSize: [60, 24],
        iconAnchor: [30, 12]
      });

      const marker = L.marker([lat, lng], { icon }).addTo(this.map);
      marker.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <strong>${v.vehicle_code}</strong> - ${v.driver_name || 'Driver'}<br>
          <span style="font-size: 11px;">Status: <strong>${v.status || 'AVAILABLE'}</strong></span><br>
          <span style="font-size: 11px;">Capacity: ₹${Number(v.cash_capacity || 100000).toLocaleString()}</span><br>
          <span style="font-size: 11px;">Insurance: ₹${Number(v.insurance_limit || 1500000).toLocaleString()}</span>
        </div>
      `);
      this.vehicleMarkers.set(v.vehicle_code, marker);
    });
  }

  renderRoutes(routes) {
    this.routePolylines.forEach(p => this.map.removeLayer(p));
    this.routePolylines = [];

    if (!Array.isArray(routes)) return;

    const palette = ['#4f46e5', '#0284c7', '#7c3aed', '#059669', '#d97706'];

    routes.forEach((route, idx) => {
      if (!route.stops || route.stops.length === 0) return;

      const color = palette[idx % palette.length];
      const latlngs = [this.depotCoord];

      route.stops.forEach(s => {
        const sLat = parseFloat(s.latitude);
        const sLng = parseFloat(s.longitude);
        if (!isNaN(sLat) && !isNaN(sLng)) {
          latlngs.push([sLat, sLng]);
        }
      });
      // Return to depot
      latlngs.push(this.depotCoord);

      if (latlngs.length < 2) return;

      const polyline = L.polyline(latlngs, {
        color: color,
        weight: 4,
        opacity: 0.85,
        dashArray: route.dispatch_allowed ? null : '6, 8',
        lineCap: 'round',
        lineJoin: 'round'
      }).addTo(this.map);

      polyline.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <strong>${route.route_code} (${route.vehicle_code})</strong><br>
          <span>Distance: <strong>${route.distance} km</strong></span><br>
          <span>ETA: <strong>${route.estimated_time} mins</strong></span><br>
          <span>Cash Payload: <strong>₹${route.cash_value?.toLocaleString()}</strong></span><br>
          <span>Status: <strong style="color: ${route.dispatch_allowed ? '#10b981' : '#ef4444'}">${route.constraint_status}</strong></span>
        </div>
      `);

      this.routePolylines.push(polyline);
    });
  }

  renderTrafficEvents(events) {
    this.trafficOverlays.forEach(o => this.map.removeLayer(o));
    this.trafficOverlays = [];

    events.forEach(evt => {
      if (evt.status !== 'ACTIVE') return;

      // Draw an alert area near the affected corridor
      const alertCircle = L.circle([this.depotCoord[0] + 0.015, this.depotCoord[1] + 0.012], {
        color: evt.event_type === 'ROAD_CLOSURE' ? '#ef4444' : '#f59e0b',
        fillColor: evt.event_type === 'ROAD_CLOSURE' ? '#ef4444' : '#f59e0b',
        fillOpacity: 0.25,
        radius: 700
      }).addTo(this.map);

      alertCircle.bindPopup(`
        <div style="font-family: 'Plus Jakarta Sans', sans-serif;">
          <strong style="color: #b91c1c;">${evt.event_type}</strong><br>
          <span>${evt.description}</span><br>
          <span style="font-size: 10px; color: #64748b;">Severity: ${evt.severity}</span>
        </div>
      `);

      this.trafficOverlays.push(alertCircle);
    });
  }

  centerNetwork() {
    if (this.map) {
      this.map.setView(this.depotCoord, 13, { animate: true });
    }
  }
}

window.CashRouteMap = CashRouteMap;
