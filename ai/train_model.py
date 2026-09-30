import sys
import os
import pandas as pd
import numpy as np
import joblib
from datetime import datetime
from catboost import CatBoostRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score

if sys.stdout.encoding != 'utf-8':
    try:
        sys.stdout.reconfigure(encoding='utf-8')
    except Exception:
        pass

def train():
    csv_path = "atm_transactions.csv" if os.path.exists("atm_transactions.csv") else "data/atm_transactions.csv"
    print(f"Loading transaction dataset from {csv_path}...")
    df = pd.read_csv(csv_path)
    print(f"Dataset loaded: {df.shape[0]} rows, {df['atmId'].nunique()} unique ATMs.")

    # Parse timestamps
    df["dt"] = pd.to_datetime(df["transactionTime"])
    df = df.sort_values(["atmId", "dt"]).reset_index(drop=True)

    print("Building feature engineering pipeline...")
    # Time features
    df["hour"] = df["dt"].dt.hour
    df["dayofweek"] = df["dt"].dt.dayofweek
    df["is_weekend"] = df["dayofweek"].isin([5, 6]).astype(int)
    df["hour_sin"] = np.sin(2 * np.pi * df["hour"] / 24.0)
    df["hour_cos"] = np.cos(2 * np.pi * df["hour"] / 24.0)
    df["dow_sin"] = np.sin(2 * np.pi * df["dayofweek"] / 7.0)
    df["dow_cos"] = np.cos(2 * np.pi * df["dayofweek"] / 7.0)

    # Lag features per ATM
    for lag in [1, 2, 3, 6, 12]:
        df[f"out_lag_{lag}"] = df.groupby("atmId")["totalOutcome"].shift(lag)
        df[f"in_lag_{lag}"] = df.groupby("atmId")["totalIncome"].shift(lag)

    # Rolling window stats
    df["out_roll_3"] = df.groupby("atmId")["totalOutcome"].shift(1).rolling(3, min_periods=1).mean()
    df["out_roll_6"] = df.groupby("atmId")["totalOutcome"].shift(1).rolling(6, min_periods=1).mean()
    df["out_roll_12"] = df.groupby("atmId")["totalOutcome"].shift(1).rolling(12, min_periods=1).mean()
    df["out_std_6"] = df.groupby("atmId")["totalOutcome"].shift(1).rolling(6, min_periods=1).std().fillna(0)

    # Target: next observed totalOutcome for the same ATM
    df["target_next_demand"] = df.groupby("atmId")["totalOutcome"].shift(-1)

    # Drop rows where target is NaN (last observation of each ATM)
    valid_df = df.dropna(subset=["target_next_demand"]).copy()
    # Fill any remaining NaNs in lag features with 0
    valid_df = valid_df.fillna(0)

    features = [
        "atmId", "hour", "dayofweek", "is_weekend",
        "hour_sin", "hour_cos", "dow_sin", "dow_cos",
        "totalBalance", "numberIncomeTransaction", "numberOutcomeTransaction",
        "totalIncome", "totalOutcome",
        "out_lag_1", "out_lag_2", "out_lag_3", "out_lag_6", "out_lag_12",
        "in_lag_1", "in_lag_2", "in_lag_3", "in_lag_6", "in_lag_12",
        "out_roll_3", "out_roll_6", "out_roll_12", "out_std_6"
    ]

    valid_df["atmId"] = valid_df["atmId"].astype(str)

    # Chronological holdout split: last 20% of timestamps
    unique_dts = np.sort(valid_df["dt"].unique())
    cutoff_idx = int(len(unique_dts) * 0.8)
    cutoff_time = unique_dts[cutoff_idx]
    print(f"Chronological split cutoff: {cutoff_time}")

    train_df = valid_df[valid_df["dt"] < cutoff_time]
    test_df = valid_df[valid_df["dt"] >= cutoff_time]
    print(f"Training set: {len(train_df)} rows. Test set: {len(test_df)} rows.")

    X_train = train_df[features]
    y_train = train_df["target_next_demand"]
    X_test = test_df[features]
    y_test = test_df["target_next_demand"]

    print("Training CatBoostRegressor model on transaction dataset...")
    model = CatBoostRegressor(
        iterations=150,
        learning_rate=0.08,
        depth=6,
        loss_function="RMSE",
        eval_metric="MAE",
        cat_features=["atmId"],
        random_seed=42,
        verbose=30
    )

    model.fit(
        X_train, y_train,
        eval_set=(X_test, y_test),
        early_stopping_rounds=30,
        verbose=30
    )

    # Evaluate on test set
    preds = model.predict(X_test)
    preds = np.maximum(0, preds)

    mae = float(mean_absolute_error(y_test, preds))
    rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    r2 = float(r2_score(y_test, preds))

    print("\n--- MODEL EVALUATION METRICS ---")
    print(f"Holdout MAE:  {mae:.2f}")
    print(f"Holdout RMSE: {rmse:.2f}")
    print(f"Holdout R2:   {r2:.4f}")
    print(f"Best Iteration: {model.get_best_iteration()}")

    # Retrain on full dataset using best iterations for maximum prototype quality
    best_iter = max(100, model.get_best_iteration() or 128)
    print(f"\nFinal fit on all {len(valid_df)} rows with {best_iter} iterations...")
    final_model = CatBoostRegressor(
        iterations=best_iter,
        learning_rate=0.08,
        depth=6,
        loss_function="RMSE",
        cat_features=["atmId"],
        random_seed=42,
        verbose=False
    )
    final_model.fit(valid_df[features], valid_df["target_next_demand"])

    bundle = {
        "model": final_model,
        "features": features,
        "categorical_features": ["atmId"],
        "target": "target_next_demand",
        "forecast_horizon": "next observed interval (~2 hours for this dataset)",
        "dataset_file": csv_path,
        "best_iterations": best_iter,
        "training_rows": len(train_df),
        "test_rows": len(test_df),
        "test_cutoff": str(cutoff_time),
        "holdout_metrics": {
            "MAE": round(mae, 2),
            "RMSE": round(rmse, 2),
            "R2": round(r2, 4)
        }
    }

    os.makedirs("models", exist_ok=True)
    out_path = "models/cashrouteai_demand_model.joblib"
    joblib.dump(bundle, out_path)
    print(f"Trained model saved to {out_path} successfully.")

    # Also update data/atm_transactions.csv if needed
    if os.path.exists("atm_transactions.csv") and not os.path.samefile("atm_transactions.csv", "data/atm_transactions.csv"):
        import shutil
        shutil.copyfile("atm_transactions.csv", "data/atm_transactions.csv")
        print("Updated data/atm_transactions.csv with the newly uploaded dataset.")

if __name__ == "__main__":
    train()
