# CashRouteAI
> **Intraday Cash Intelligence & Dynamic Route Optimization**

CashRouteAI is an AI-powered ATM cash management and Cash-in-Transit (CIT) vehicle optimization platform designed for modern banking operations. It bridges **machine learning demand forecasting** with **Google OR-Tools combinatorial optimization** and **dynamic real-time event recovery**.

---

## 🚀 System Architecture Pipeline

CashRouteAI connects the complete operational intelligence lifecycle:

```
ATM Transaction Data (359 ATMs, ~30k rows)
        ↓
ML Demand Prediction (CatBoostRegressor ~2h horizon)
        ↓
Cash Risk Engine (30% safety reserve buffer)
        ↓
Cash Requirement & Shortage Calculation
        ↓
Cash Allocation Engine (Cassette capacity & bundle constraints)
        ↓
Vehicle Selection (CIT fleet capacity & insurance check)
        ↓
Google OR-Tools Route Optimization (CVRP-TW)
        ↓
Hard Constraint Validation (Zero-violation guardrails)
        ↓
Live Dispatch & Map Visualizer (Leaflet.js)
        ↓
Intraday Event Simulator (Traffic, Spikes, Closures, Breakdowns)
        ↓
Dynamic Re-Optimization & Tamper-Proof Audit Trail
```

---

## 🧠 Machine Learning Demand Forecasting

The platform integrates a pre-trained **CatBoostRegressor** (`models/cashrouteai_demand_model.joblib`) evaluated on a chronological holdout split.

- **Dataset**: 30,156 rows covering 359 unique ATMs observed at ~2-hour intervals over 7 days (January 1–7, 2020).
- **Target**: Next observed withdrawal demand (`totalOutcome`) across the transaction horizon (~2 hours).
- **Feature Pipeline (27 Engineered Features)**:
  - *Cyclical Time*: `hour`, `dayofweek`, `is_weekend`, `hour_sin`, `hour_cos`, `dow_sin`, `dow_cos`
  - *Current Balances & Velocity*: `totalBalance`, `numberIncomeTransaction`, `numberOutcomeTransaction`, `totalIncome`, `totalOutcome`
  - *Historical Lags*: `out_lag_1`, `out_lag_2`, `out_lag_3`, `out_lag_6`, `out_lag_12`, `in_lag_1`, `in_lag_2`, `in_lag_3`, `in_lag_6`, `in_lag_12`
  - *Rolling Statistics*: `out_roll_3`, `out_roll_6`, `out_roll_12`, `out_std_6`
- **Prototype Benchmark Performance**:
  - **Holdout R²**: `0.7801`
  - **MAE**: `777.60`
  - **RMSE**: `988.91`
  - **Iterations**: `128`
  - *Note*: Evaluated on a chronological holdout split as a prototype benchmark.

---

## 🛡️ Risk & Cash Allocation Engines

### Risk Engine (`services/risk_engine.py`)
Calculates real-time cash exhaustion hazard for each ATM:
- $\text{safety\_buffer} = \text{predicted\_demand} \times 0.30$
- $\text{required\_cash} = \text{predicted\_demand} + \text{safety\_buffer}$
- $\text{shortage} = \max(0, \text{required\_cash} - \text{current\_cash})$
- $\text{surplus} = \max(0, \text{current\_cash} - \text{required\_cash})$
- $\text{risk\_percentage} = (\text{shortage} / \text{required\_cash}) \times 100$

**Risk Classifications**:
- `LOW`: 0 shortage
- `MEDIUM`: shortage > 0 and risk < 25%
- `HIGH`: 25% &le; risk < 50%
- `CRITICAL`: risk &ge; 50%

### Cash Allocation Engine (`services/cash_allocator.py`)
- Caps injection at physical cassette headroom: $\min(\text{shortage}, \text{ATM capacity} - \text{current cash})$
- Rounds to standard banknote bundle sizes (multiples of ₹1,000)
- Enforces CIT vehicle capacity and insurance ceilings

---

## 🚚 OR-Tools Combinatorial Route Optimizer

The routing engine (`optimization/vrp_solver.py`) models a **Capacitated Vehicle Routing Problem with Time Windows (CVRP-TW)**:
- **Solver Engine**: Google OR-Tools `RoutingModel`
- **Search Strategy**: `PARALLEL_CHEAPEST_INSERTION` with `GUIDED_LOCAL_SEARCH` metaheuristics
- **Deterministic**: Fixed random seed (`42`)
- **Weighted Multi-Objective Cost Function**:
  $$\text{Total Cost} = \alpha \cdot \text{Stockout Risk} + \beta \cdot \text{Distance} + \gamma \cdot \text{Idle Cash} + \delta \cdot \text{Delay} + \epsilon \cdot \text{Route Risk}$$
- **Speed**: Optimized in **< 2.0 seconds** (average 1.24s).

---

## 🔒 The 7 Hard Safety Constraints

Every proposed route must strictly satisfy seven backend guardrails before dispatch is permitted:
1. **Vehicle Cash Capacity**: Total cash payload $\le$ vehicle physical capacity.
2. **Transit Insurance Limit**: Total cash carried $\le$ vehicle insurance policy ceiling.
3. **ATM Cassette Capacity**: Existing cash + refill injection $\le$ physical cassette limit.
4. **Vehicle Availability**: Vehicle must have operational status `AVAILABLE` or `EN_ROUTE`.
5. **Closed Road Avoidance**: Routes cannot traverse blocked corridors or bridges under maintenance.
6. **Municipal Transit Window**: Operations restricted to permitted city hours (06:00 &ndash; 22:00).
7. **Operational Status**: Vehicles flagged for maintenance or breakdown cannot be dispatched.

If any constraint fails: **`DISPATCH BLOCKED`** is displayed alongside the exact root cause.

---

## ⚡ Dynamic Re-Optimization & Event Simulator

The platform dynamically responds to real-time events through the Event Simulator:

| Event Button | Simulated Condition | Autonomous Response |
|---|---|---|
| **Traffic Surge** | +45% delay on arterial corridor | Recalculates ETAs, identifies SLA breach, re-routes around congestion |
| **ATM Cash Spike** | Sudden withdrawal surge at ATM-103 | Demand spikes to ₹32,000, risk jumps to CRITICAL, triggers urgent injection |
| **Road Closure** | Canal Bridge emergency closure | Flags corridor as blocked, validates constraints, recalculates safe bypass |
| **ATM Failure** | Dispenser jam at ATM-117 | Marks ATM offline, removes from stops, reallocates cash to active ATMs |
| **Vehicle Unavailable** | VAN-01 brake maintenance | Flags vehicle, redistributes stops to remaining available fleet |
| **Reset Baseline** | Clean operational baseline | Restores initial demo state for presentation repeatability |

---

## 🛠️ Technology Stack

- **Backend**: Python 3.14, Flask, Flask-CORS
- **Machine Learning**: CatBoostRegressor, scikit-learn, pandas, NumPy, joblib
- **Optimization**: Google OR-Tools
- **Database**: SQLite (`database/cashrouteai.db`, convertible to MySQL)
- **Frontend**: Vanilla HTML5, Modern CSS (Claymorphism), Vanilla JavaScript
- **Map & Charts**: Leaflet.js (CartoDB Positron tiles), Chart.js

---

## 📁 File Structure

```
cashrouteai/
├── app.py                         # Master Flask application & REST APIs
├── requirements.txt               # Dependencies
├── README.md                      # Complete system documentation
├── DESIGN.md                      # Claymorphism UI/UX design specifications
├── config/
│   ├── __init__.py
│   └── config.py                  # Thresholds, weights, depot location
├── models/
│   ├── __init__.py
│   ├── atm_model.py               # ATM data model
│   ├── vehicle_model.py           # CIT vehicle data model
│   ├── route_model.py             # Route & Stop data models
│   └── cashrouteai_demand_model.joblib # CatBoost trained model
├── services/
│   ├── __init__.py
│   ├── demand_prediction.py       # Feature pipeline & ML inference
│   ├── risk_engine.py             # Cash risk & stockout calculation
│   ├── cash_allocator.py          # Cash allocation & headroom checks
│   ├── route_optimizer.py         # Master optimization orchestrator
│   ├── traffic_engine.py          # Real-time event simulation
│   └── audit_service.py           # Tamper-proof decision logging
├── optimization/
│   ├── __init__.py
│   ├── vrp_solver.py              # Google OR-Tools CVRP solver
│   ├── constraints.py             # 7 Hard constraint validators
│   └── cost_function.py           # Weighted objective formulation
├── database/
│   ├── schema.sql                 # SQLite schema
│   ├── db_manager.py              # Seeding & SQLite connection manager
│   └── cashrouteai.db             # Database file
├── data/
│   ├── atm_transactions.csv       # 30,156 rows historical transactions
│   ├── atms.csv                   # Exported 359 ATM records
│   ├── vehicles.csv               # 10 CIT armored vehicles
│   └── traffic.csv                # Active traffic telemetry
└── frontend/
    ├── index.html                 # Main Claymorphism UI
    ├── css/
    │   └── style.css              # Soft 3D tactile styling
    └── js/
        ├── map.js                 # Leaflet map manager
        ├── charts.js              # Chart.js analytics manager
        ├── simulation.js          # Event simulator & Hackathon demo flow
        ├── atms.js                # ATM intelligence & drawer
        ├── vehicles.js            # Vehicle fleet controller
        ├── routes.js              # Routes & constraint validator UI
        └── dashboard.js           # Main application coordinator
```

---

## 🏃 Quick Start Guide

### 1. Run the Platform
```bash
python app.py
```
Open your browser at:
```
http://127.0.0.1:5000
```

---

## 🎯 Hackathon Demonstration Script (7-Step Demo)

Click the **`▶ Run Hackathon Demo`** button in the top navigation bar to showcase the end-to-end pipeline:

1. **Baseline State**: Inspect 359 ATMs on the map, 8 active CIT vans, and baseline demand forecasts.
2. **ATM Demand Spike**: Click `ATM Cash Spike`. ATM-103 demand jumps to ₹32,000; risk turns CRITICAL (55.5%).
3. **Cash Allocation**: System calculates ₹41,600 required cash (with 30% buffer) and recommends a ₹25,000 refill.
4. **OR-Tools Optimization**: Optimal route created for VAN-01: Depot &rarr; ATM-103 &rarr; ATM-108 &rarr; ATM-117 &rarr; Depot.
5. **Traffic Surge**: Click `Traffic Surge`. Arterial corridor congestion increases by +45%.
6. **Dynamic Re-Optimization**: VRP engine re-routes in 1.2 seconds, avoiding congested segments while verifying insurance and payload limits.
7. **Safe Dispatch & Audit Log**: Verified alternate route dispatched and logged in the Decision Audit Trail!
