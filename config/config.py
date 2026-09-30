import os

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))

MODEL_PATH = os.path.join(BASE_DIR, "models", "cashrouteai_demand_model.joblib")
DATA_DIR = os.path.join(BASE_DIR, "data")
TRANSACTIONS_CSV = os.path.join(DATA_DIR, "atm_transactions.csv")
ATMS_CSV = os.path.join(DATA_DIR, "atms.csv")
VEHICLES_CSV = os.path.join(DATA_DIR, "vehicles.csv")
TRAFFIC_CSV = os.path.join(DATA_DIR, "traffic.csv")
DB_PATH = os.path.join(BASE_DIR, "database", "cashrouteai.db")

FEATURE_NAMES = [
    "atmId", "hour", "dayofweek", "is_weekend",
    "hour_sin", "hour_cos", "dow_sin", "dow_cos",
    "totalBalance", "numberIncomeTransaction", "numberOutcomeTransaction",
    "totalIncome", "totalOutcome",
    "out_lag_1", "out_lag_2", "out_lag_3", "out_lag_6", "out_lag_12",
    "in_lag_1", "in_lag_2", "in_lag_3", "in_lag_6", "in_lag_12",
    "out_roll_3", "out_roll_6", "out_roll_12", "out_std_6"
]

BENCHMARK_METRICS = {
    "model_name": "CatBoost Demand Model",
    "MAE": 789.60,
    "RMSE": 1000.58,
    "R2": 0.7593,
    "best_iteration": 149,
    "forecast_horizon": "Next observed transaction horizon (~2 hours)",
    "note": "Prototype ML benchmark evaluated on chronological holdout"
}

DEFAULT_SAFETY_BUFFER_PERCENTAGE = 30.0

RISK_THRESHOLDS = {
    "LOW": 0.0,
    "MEDIUM": 25.0,
    "HIGH": 50.0
}

# Central CIT Operations Hub (Izmir Financial Center)
DEPOT_LOCATION = {
    "name": "Izmir Central CIT Cash Hub",
    "code": "DEPOT-01",
    "latitude": 38.4237,
    "longitude": 27.1428
}

OPTIMIZATION_CONFIG = {
    "time_limit_seconds": 2,
    "random_seed": 42,
    "weights": {
        "stockout_risk": 100.0,
        "distance": 1.5,
        "idle_cash": 0.05,
        "delay": 2.0,
        "route_risk": 50.0
    }
}

TRANSIT_WINDOW = {
    "start_hour": 6,
    "end_hour": 22
}

# Google Cloud / Google Maps / Gemini API Key
GOOGLE_API_KEY = os.environ.get("GOOGLE_API_KEY", "AIzaSyC1o-JQk5umzad6Ag4wxcO-UuUU6LbqXTM")
GOOGLE_MAPS_API_KEY = GOOGLE_API_KEY
GEMINI_API_KEY = GOOGLE_API_KEY
