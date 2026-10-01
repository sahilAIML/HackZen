import os
import sys
import joblib
import pandas as pd
import numpy as np
from datetime import datetime

BASE_DIR = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from config.config import MODEL_PATH, TRANSACTIONS_CSV, FEATURE_NAMES, BENCHMARK_METRICS

class DemandPredictionService:
    _instance = None

    def __new__(cls, *args, **kwargs):
        if cls._instance is None:
            cls._instance = super(DemandPredictionService, cls).__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return
        
        print(f"Loading demand prediction model from {MODEL_PATH}...")
        self.model = None
        self.features = FEATURE_NAMES
        self.categorical_features = ["atmId"]
        self.metrics = BENCHMARK_METRICS

        if os.path.exists(MODEL_PATH):
            try:
                bundle = joblib.load(MODEL_PATH)
                self.model = bundle.get("model")
                self.features = bundle.get("features", FEATURE_NAMES)
                self.categorical_features = bundle.get("categorical_features", ["atmId"])
                self.metrics = bundle.get("holdout_metrics", BENCHMARK_METRICS)
                print("CatBoost demand model loaded successfully.")
            except Exception as e:
                print(f"Notice: Model unpickle skipped ({e}). Using dataset statistical moving averages.")
        
        print(f"Loading transactions history from {TRANSACTIONS_CSV}...")
        self._load_and_index_transactions()
        self._initialized = True
        print(f"DemandPredictionService ready. Pre-indexed {len(self.atm_history)} ATMs.")

    def _load_and_index_transactions(self):
        df = pd.read_csv(TRANSACTIONS_CSV)
        df["dt"] = pd.to_datetime(df["transactionTime"])
        df = df.sort_values(["atmId", "dt"]).reset_index(drop=True)
        
        # Precompute lag and rolling features per ATM
        grouped = df.groupby("atmId")
        self.atm_history = {}
        self.atm_recent_features = {}

        for atm_id, group in grouped:
            g = group.copy()
            g["hour"] = g["dt"].dt.hour
            g["dayofweek"] = g["dt"].dt.dayofweek
            g["is_weekend"] = g["dayofweek"].isin([5, 6]).astype(int)
            g["hour_sin"] = np.sin(2 * np.pi * g["hour"] / 24.0)
            g["hour_cos"] = np.cos(2 * np.pi * g["hour"] / 24.0)
            g["dow_sin"] = np.sin(2 * np.pi * g["dayofweek"] / 7.0)
            g["dow_cos"] = np.cos(2 * np.pi * g["dayofweek"] / 7.0)

            for lag in [1, 2, 3, 6, 12]:
                g[f"out_lag_{lag}"] = g["totalOutcome"].shift(lag).fillna(0)
                g[f"in_lag_{lag}"] = g["totalIncome"].shift(lag).fillna(0)

            g["out_roll_3"] = g["totalOutcome"].shift(1).rolling(3, min_periods=1).mean().fillna(0)
            g["out_roll_6"] = g["totalOutcome"].shift(1).rolling(6, min_periods=1).mean().fillna(0)
            g["out_roll_12"] = g["totalOutcome"].shift(1).rolling(12, min_periods=1).mean().fillna(0)
            g["out_std_6"] = g["totalOutcome"].shift(1).rolling(6, min_periods=1).std().fillna(0)

            # Store the last record as baseline feature vector
            last_row = g.iloc[-1].to_dict()
            self.atm_recent_features[atm_id] = last_row
            
            # Store last 12 history points for charting
            history_points = []
            for _, r in g.tail(12).iterrows():
                history_points.append({
                    "timestamp": r["transactionTime"],
                    "withdrawal": float(r["totalOutcome"]),
                    "deposit": float(r["totalIncome"]),
                    "balance": float(r["totalBalance"])
                })
            self.atm_history[atm_id] = history_points

    def build_feature_vector(self, atm_id, current_balance=None, hour=None, dayofweek=None, spike_factor=1.0):
        base_features = self.atm_recent_features.get(str(atm_id), None)
        if base_features is None:
            # Fallback to the first available ATM template
            base_features = next(iter(self.atm_recent_features.values())).copy()
            base_features["atmId"] = str(atm_id)
        else:
            base_features = base_features.copy()

        now = datetime.now()
        h = hour if hour is not None else now.hour
        dow = dayofweek if dayofweek is not None else now.weekday()

        base_features["atmId"] = str(atm_id)
        base_features["hour"] = int(h)
        base_features["dayofweek"] = int(dow)
        base_features["is_weekend"] = 1 if dow in [5, 6] else 0
        base_features["hour_sin"] = float(np.sin(2 * np.pi * h / 24.0))
        base_features["hour_cos"] = float(np.cos(2 * np.pi * h / 24.0))
        base_features["dow_sin"] = float(np.sin(2 * np.pi * dow / 7.0))
        base_features["dow_cos"] = float(np.cos(2 * np.pi * dow / 7.0))

        if current_balance is not None:
            base_features["totalBalance"] = float(current_balance)

        if spike_factor > 1.0:
            base_features["totalOutcome"] = float(base_features.get("totalOutcome", 1000.0)) * spike_factor
            base_features["out_roll_3"] = float(base_features.get("out_roll_3", 1000.0)) * spike_factor
            base_features["out_roll_6"] = float(base_features.get("out_roll_6", 1000.0)) * spike_factor

        # Construct dataframe with exact column order
        row_dict = {}
        for col in self.features:
            val = base_features.get(col, 0.0)
            if col == "atmId":
                row_dict[col] = str(val)
            else:
                row_dict[col] = float(val) if pd.notna(val) else 0.0

        return pd.DataFrame([row_dict])

    def predict(self, feature_df_or_dict, atm_id=None, current_balance=None, spike_factor=1.0):
        try:
            if isinstance(feature_df_or_dict, dict):
                # If dictionary is complete with features, convert to df
                if all(k in feature_df_or_dict for k in ["totalBalance", "totalOutcome", "out_roll_3"]):
                    df = pd.DataFrame([feature_df_or_dict])
                    df["atmId"] = df["atmId"].astype(str)
                else:
                    target_atm_id = atm_id or feature_df_or_dict.get("atmId", "atm350000")
                    balance = current_balance or feature_df_or_dict.get("totalBalance")
                    df = self.build_feature_vector(target_atm_id, current_balance=balance, spike_factor=spike_factor)
            elif isinstance(feature_df_or_dict, pd.DataFrame):
                df = feature_df_or_dict.copy()
                df["atmId"] = df["atmId"].astype(str)
            else:
                target_atm_id = atm_id or "atm350000"
                df = self.build_feature_vector(target_atm_id, current_balance=current_balance, spike_factor=spike_factor)

            # Reorder columns to match trained features
            if self.model is not None:
                df = df[self.features]
                prediction = self.model.predict(df)[0]
            else:
                raw_pred = df.get("out_roll_3", [None])[0] if "out_roll_3" in df else None
                if raw_pred is None or pd.isna(raw_pred):
                    raw_pred = df.get("totalOutcome", [12500.0])[0]
                prediction = float(raw_pred) if pd.notna(raw_pred) else 12500.0

            prediction = max(0.0, float(prediction))

            if spike_factor > 1.0:
                prediction *= spike_factor

            return round(prediction, 2)
        except Exception as e:
            print(f"Prediction fallback due to: {e}")
            return 12500.0

    def get_history(self, atm_id):
        return self.atm_history.get(str(atm_id), [])

    def get_benchmark_metrics(self):
        return self.metrics
