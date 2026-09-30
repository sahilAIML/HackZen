-- CashRouteAI SQLite Schema
-- Designed for easy migration to MySQL / PostgreSQL

CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL, -- 'admin' or 'driver'
    name TEXT NOT NULL,
    vehicle_code TEXT
);

CREATE TABLE IF NOT EXISTS atms (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atm_code TEXT UNIQUE NOT NULL,
    original_atm_id TEXT NOT NULL,
    name TEXT NOT NULL,
    city TEXT NOT NULL,
    address TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    capacity REAL NOT NULL,
    current_cash REAL NOT NULL,
    predicted_demand REAL DEFAULT 0.0,
    safety_buffer REAL DEFAULT 0.0,
    required_cash REAL DEFAULT 0.0,
    shortage REAL DEFAULT 0.0,
    surplus REAL DEFAULT 0.0,
    risk_percentage REAL DEFAULT 0.0,
    criticality TEXT DEFAULT 'LOW',
    status TEXT DEFAULT 'NORMAL',
    last_refill TEXT,
    stockout_minutes INTEGER,
    explanation TEXT
);

CREATE INDEX IF NOT EXISTS idx_atms_code ON atms(atm_code);
CREATE INDEX IF NOT EXISTS idx_atms_criticality ON atms(criticality);
CREATE INDEX IF NOT EXISTS idx_atms_status ON atms(status);

CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    atm_id INTEGER NOT NULL,
    timestamp TEXT NOT NULL,
    withdrawal REAL DEFAULT 0.0,
    deposit REAL DEFAULT 0.0,
    balance REAL NOT NULL,
    FOREIGN KEY (atm_id) REFERENCES atms(id)
);

CREATE INDEX IF NOT EXISTS idx_trans_atm_id ON transactions(atm_id);

CREATE TABLE IF NOT EXISTS vehicles (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    vehicle_code TEXT UNIQUE NOT NULL,
    driver_name TEXT NOT NULL,
    latitude REAL NOT NULL,
    longitude REAL NOT NULL,
    cash_capacity REAL NOT NULL,
    current_cash REAL NOT NULL,
    insurance_limit REAL NOT NULL,
    status TEXT DEFAULT 'AVAILABLE',
    current_route_id INTEGER
);

CREATE TABLE IF NOT EXISTS routes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_code TEXT UNIQUE NOT NULL,
    vehicle_id INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    distance REAL NOT NULL,
    estimated_time REAL NOT NULL,
    fuel_cost REAL NOT NULL,
    cash_value REAL NOT NULL,
    status TEXT DEFAULT 'ACTIVE',
    dispatch_allowed INTEGER DEFAULT 1,
    constraint_status TEXT DEFAULT 'SAFE TO DISPATCH',
    blocking_reasons TEXT DEFAULT '[]',
    FOREIGN KEY (vehicle_id) REFERENCES vehicles(id)
);

CREATE TABLE IF NOT EXISTS route_stops (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    route_id INTEGER NOT NULL,
    atm_id INTEGER NOT NULL,
    sequence INTEGER NOT NULL,
    cash_amount REAL NOT NULL,
    arrival_time TEXT NOT NULL,
    estimated_minutes REAL NOT NULL,
    status TEXT DEFAULT 'PENDING',
    FOREIGN KEY (route_id) REFERENCES routes(id),
    FOREIGN KEY (atm_id) REFERENCES atms(id)
);

CREATE INDEX IF NOT EXISTS idx_stops_route_id ON route_stops(route_id);

CREATE TABLE IF NOT EXISTS traffic_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    road_id TEXT,
    severity TEXT DEFAULT 'MEDIUM',
    delay_multiplier REAL DEFAULT 1.0,
    start_time TEXT NOT NULL,
    end_time TEXT,
    status TEXT DEFAULT 'ACTIVE',
    description TEXT,
    affected_route_id INTEGER
);

CREATE TABLE IF NOT EXISTS optimization_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    trigger_event TEXT NOT NULL,
    execution_time REAL NOT NULL,
    routes_changed INTEGER NOT NULL,
    distance_before REAL NOT NULL,
    distance_after REAL NOT NULL,
    risk_before REAL NOT NULL,
    risk_after REAL NOT NULL,
    status TEXT DEFAULT 'SUCCESS'
);

CREATE TABLE IF NOT EXISTS audit_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    timestamp TEXT NOT NULL,
    event_type TEXT NOT NULL,
    description TEXT NOT NULL,
    old_value TEXT,
    new_value TEXT,
    decision_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_time ON audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_type ON audit_logs(event_type);
