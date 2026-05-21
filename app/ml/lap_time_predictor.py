# app/ml/lap_time_predictor.py
import os
import pickle
import numpy as np
from xgboost import XGBRegressor
from sklearn.preprocessing import StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_absolute_error

from app.ml.feature_engineering import (
    build_feature_matrix,
    build_lap_features,
    get_feature_columns,
)

MODEL_PATH  = os.path.join(os.path.dirname(__file__), "models", "lap_time_model.pkl")
SCALER_PATH = os.path.join(os.path.dirname(__file__), "models", "scaler.pkl")

_model  = None
_scaler = None


def _load():
    global _model, _scaler
    if _model is None and os.path.exists(MODEL_PATH):
        with open(MODEL_PATH, "rb") as f:
            _model = pickle.load(f)
    if _scaler is None and os.path.exists(SCALER_PATH):
        with open(SCALER_PATH, "rb") as f:
            _scaler = pickle.load(f)


def train(session_id: int) -> dict:
    """
    Trains XGBoost lap time model directly from DB
    using build_feature_matrix(session_id).
    """
    df           = build_feature_matrix(session_id)
    feature_cols = get_feature_columns()

    X = df[feature_cols].values
    y = df["lap_time"].values

    scaler   = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.15, random_state=42
    )

    model = XGBRegressor(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        random_state=42,
        tree_method="hist",
    )
    model.fit(
        X_train, y_train,
        eval_set=[(X_test, y_test)],
        verbose=False,
    )
    mae = mean_absolute_error(y_test, model.predict(X_test))

    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    with open(MODEL_PATH, "wb") as f: pickle.dump(model, f)
    with open(SCALER_PATH, "wb") as f: pickle.dump(scaler, f)

    global _model, _scaler
    _model, _scaler = model, scaler

    return {
        "status":      "trained",
        "mae_seconds": round(mae, 3),
        "rows_used":   len(df),
        "features":    feature_cols,
    }


def predict_lap_time(
    compound:       str,
    tyre_age:       int,
    lap_number:     int,
    stint_number:   int   = 1,
    air_temp:       float = 28.0,
    track_temp:     float = 40.0,
    humidity:       float = 50.0,
    wind_speed:     float = 10.0,
    rainfall:       int   = 0,
    total_laps:     int   = 57,
    rolling_best_3: float = 90.0,
    deg_proxy:      float = 0.0,
    team_enc:       int   = 0,
    driver_enc:     int   = 0,
) -> dict:
    _load()
    if _model is None or _scaler is None:
        raise RuntimeError(
            "Model not trained yet. POST /api/predictor/lap-time/train first."
        )

    feat_df = build_lap_features(
        compound=compound,
        tyre_age=tyre_age,
        lap_number=lap_number,
        stint_number=stint_number,
        air_temp=air_temp,
        track_temp=track_temp,
        humidity=humidity,
        wind_speed=wind_speed,
        rainfall=rainfall,
        total_laps=total_laps,
        rolling_best_3=rolling_best_3,
        deg_proxy=deg_proxy,
        team_enc=team_enc,
        driver_enc=driver_enc,
    )

    X    = _scaler.transform(feat_df[get_feature_columns()].values)
    pred = float(_model.predict(X)[0])

    return {
        "predicted_lap_time": round(pred, 3),
        "compound":           compound,
        "tyre_age":           tyre_age,
        "lap_number":         lap_number,
        "confidence_low":     round(pred - 1.5, 3),
        "confidence_high":    round(pred + 1.5, 3),
    }