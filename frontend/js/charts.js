// ============================================================
// CASHROUTEAI - CHART.JS VISUAL ANALYTICS MODULE
// ============================================================

class CashRouteCharts {
  constructor() {
    this.forecastChart = null;
    this.atmDetailChart = null;
    this.riskDistChart = null;
    this.hourlyDemandChart = null;
    this.fleetUtilChart = null;
  }

  renderDemandForecast(historicalData, predictedValue) {
    const ctx = document.getElementById('demandForecastChart');
    if (!ctx) return;

    if (this.forecastChart) {
      this.forecastChart.destroy();
    }

    // Default sample if history empty
    const history = (historicalData && historicalData.length > 0) ? historicalData : [
      { timestamp: '04:00', withdrawal: 1200 },
      { timestamp: '06:00', withdrawal: 2400 },
      { timestamp: '08:00', withdrawal: 6800 },
      { timestamp: '10:00', withdrawal: 14200 },
      { timestamp: '12:00', withdrawal: 21500 },
      { timestamp: '14:00', withdrawal: 27800 }
    ];

    const labels = history.map(h => h.timestamp.split(' ').pop());
    labels.push('Next ~2h (Forecast)');

    const actualData = history.map(h => h.withdrawal);
    actualData.push(null); // No actual yet for forecast

    const forecastData = new Array(history.length - 1).fill(null);
    forecastData.push(history[history.length - 1].withdrawal);
    forecastData.push(predictedValue || 32000);

    this.forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Observed Demand (₹)',
            data: actualData,
            borderColor: '#4f46e5',
            backgroundColor: 'rgba(79, 70, 229, 0.08)',
            fill: true,
            tension: 0.35,
            pointRadius: 4,
            pointBackgroundColor: '#4f46e5'
          },
          {
            label: 'CatBoost Forecast (Next ~2h)',
            data: forecastData,
            borderColor: '#ef4444',
            backgroundColor: 'rgba(239, 68, 68, 0.12)',
            borderDash: [6, 6],
            fill: true,
            tension: 0.35,
            pointRadius: 6,
            pointBackgroundColor: '#ef4444'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'top',
            labels: { font: { family: 'Plus Jakarta Sans', size: 11, weight: '600' } }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => `${ctx.dataset.label}: ₹${ctx.parsed.y ? ctx.parsed.y.toLocaleString() : 'N/A'}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            grid: { color: 'rgba(226, 232, 240, 0.6)' },
            ticks: {
              font: { family: 'JetBrains Mono', size: 10 },
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
            }
          },
          x: {
            grid: { display: false },
            ticks: { font: { family: 'Plus Jakarta Sans', size: 10 } }
          }
        }
      }
    });
  }

  renderAtmDetailHistory(historyData, predictedDemand) {
    const ctx = document.getElementById('atmDetailChart');
    if (!ctx) return;

    if (this.atmDetailChart) {
      this.atmDetailChart.destroy();
    }

    const labels = historyData.map(h => h.timestamp.split(' ').pop());
    labels.push('Next Horizon');

    const withdrawals = historyData.map(h => h.withdrawal);
    withdrawals.push(null);

    const forecast = new Array(Math.max(0, historyData.length - 1)).fill(null);
    if (historyData.length > 0) {
      forecast.push(historyData[historyData.length - 1].withdrawal);
    }
    forecast.push(predictedDemand);

    this.atmDetailChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [
          {
            label: 'Actual Withdrawal (₹)',
            data: withdrawals,
            borderColor: '#2563eb',
            backgroundColor: 'rgba(37, 99, 235, 0.08)',
            fill: true,
            tension: 0.3
          },
          {
            label: 'CatBoost Next-Horizon (₹)',
            data: forecast,
            borderColor: '#dc2626',
            borderDash: [5, 5],
            pointRadius: 5,
            pointBackgroundColor: '#dc2626'
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            ticks: {
              callback: (v) => '₹' + (v >= 1000 ? (v / 1000) + 'k' : v)
            }
          }
        }
      }
    });
  }

  renderAnalyticsCharts(analytics) {
    if (!analytics) return;

    // 1. Risk Distribution Donut Chart
    const riskCtx = document.getElementById('riskDistChart');
    if (riskCtx) {
      if (this.riskDistChart) this.riskDistChart.destroy();
      const dist = analytics.risk_distribution || { CRITICAL: 12, HIGH: 28, MEDIUM: 45, LOW: 274 };
      this.riskDistChart = new Chart(riskCtx, {
        type: 'doughnut',
        data: {
          labels: ['Critical', 'High Risk', 'Medium Risk', 'Low / Normal'],
          datasets: [{
            data: [dist.CRITICAL || 12, dist.HIGH || 28, dist.MEDIUM || 45, dist.LOW || 274],
            backgroundColor: ['#ef4444', '#f59e0b', '#3b82f6', '#10b981'],
            borderWidth: 2,
            borderColor: '#ffffff'
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: { position: 'bottom', labels: { boxWidth: 12, font: { family: 'Plus Jakarta Sans', size: 11 } } }
          },
          cutout: '70%'
        }
      });
    }

    // 2. Hourly Demand Line Chart
    const hourlyCtx = document.getElementById('hourlyDemandChart');
    if (hourlyCtx) {
      if (this.hourlyDemandChart) this.hourlyDemandChart.destroy();
      const hourly = analytics.hourly_demand || [];
      this.hourlyDemandChart = new Chart(hourlyCtx, {
        type: 'line',
        data: {
          labels: hourly.map(h => h.hour),
          datasets: [{
            label: 'Avg Intraday Withdrawal Velocity (₹)',
            data: hourly.map(h => h.demand),
            borderColor: '#6366f1',
            backgroundColor: 'rgba(99, 102, 241, 0.1)',
            fill: true,
            tension: 0.35,
            pointRadius: 3
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              ticks: { callback: (v) => '₹' + v.toLocaleString() }
            }
          }
        }
      });
    }

    // 3. Fleet Utilization Bar Chart
    const fleetCtx = document.getElementById('fleetUtilChart');
    if (fleetCtx) {
      if (this.fleetUtilChart) this.fleetUtilChart.destroy();
      const fleet = analytics.fleet_utilization || [];
      this.fleetUtilChart = new Chart(fleetCtx, {
        type: 'bar',
        data: {
          labels: fleet.map(f => f.vehicle_code),
          datasets: [{
            label: 'Capacity Utilization %',
            data: fleet.map(f => f.utilization_pct),
            backgroundColor: fleet.map(f => f.utilization_pct > 85 ? '#ef4444' : f.utilization_pct > 50 ? '#4f46e5' : '#94a3b8'),
            borderRadius: 6
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: {
            y: {
              max: 100,
              ticks: { callback: (v) => v + '%' }
            }
          }
        }
      });
    }
  }
}

window.CashRouteCharts = CashRouteCharts;
