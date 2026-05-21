# app/ml/feature_engineering.py
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
import os

load_dotenv()
engine = create_engine(os.getenv("SYNC_DATABASE_URL"))

# ── Constants ─────────────────────────────────────────────────────────────────
COMPOUND_MAP  = {"SOFT": 0, "MEDIUM": 1, "HARD": 2, "INTERMEDIATE": 3, "WET": 4, "UNKNOWN": 2}
COMPOUND_LIFE = {"SOFT": 25, "MEDIUM": 35, "HARD": 45, "INTERMEDIATE": 30, "WET": 30}


# ── Helpers ───────────────────────────────────────────────────────────────────
def encode_compound(compound: str) -> int:
    return COMPOUND_MAP.get(str(compound).upper(), 2)


def get_feature_columns() -> list[str]:
    return [
        "lap_number",
        "compound_enc",
        "tyre_age",
        "stint_number",
        "stint_lap_count",
        "driver_enc",
        "team_enc",
        "air_temp",
        "track_temp",
        "humidity",
        "wind_speed",
        "rainfall",
        "fuel_load_proxy",
        "race_progress",
        "rolling_best_3",
        "deg_proxy",
        "is_pit_lap",
    ]


# ── DB-backed feature matrix (used for training) ──────────────────────────────
def build_feature_matrix(session_id: int) -> pd.DataFrame:
    """
    Pulls laps + weather from PostgreSQL and engineers
    all features needed for lap time prediction.
    """
    query = text("""
        SELECT
            l.lap_id,
            l.driver_id,
            l.lap_number,
            l.lap_time,
            l.sector1_time,
            l.sector2_time,
            l.sector3_time,
            l.compound,
            l.tyre_age,
            l.stint_number,
            l.is_valid,
            l.pit_in_time,
            l.track_status,
            d.team,
            w.air_temp,
            w.track_temp,
            w.humidity,
            w.wind_speed,
            w.rainfall
        FROM laps l
        JOIN drivers d ON l.driver_id = d.driver_id
        LEFT JOIN LATERAL (
            SELECT air_temp, track_temp, humidity, wind_speed, rainfall
            FROM weather w
            WHERE w.session_id = l.session_id
            ORDER BY ABS(w.timestamp - (l.lap_number * 90))
            LIMIT 1
        ) w ON TRUE
        WHERE l.session_id = :session_id
          AND l.is_valid = TRUE
          AND l.lap_time IS NOT NULL
    """)

    with engine.connect() as conn:
        df = pd.read_sql(query, conn, params={"session_id": session_id})

    if df.empty:
        raise ValueError(f"No valid laps found for session_id={session_id}")

    # ── Compound encoding ──────────────────────────────────────
    df["compound_enc"] = df["compound"].map(COMPOUND_MAP).fillna(2).astype(int)

    # ── Team encoding ──────────────────────────────────────────
    df["team_enc"] = pd.Categorical(df["team"]).codes

    # ── Driver encoding ────────────────────────────────────────
    df["driver_enc"] = pd.Categorical(df["driver_id"]).codes

    # ── Tyre degradation proxy ─────────────────────────────────
    df = df.sort_values(["driver_id", "stint_number", "tyre_age"])
    df["deg_proxy"] = (
        df.groupby(["driver_id", "stint_number"])["lap_time"]
        .transform(lambda x: x.diff().fillna(0))
    )

    # ── Cumulative race distance proxy ─────────────────────────
    df["race_progress"] = df["lap_number"] / df["lap_number"].max()

    # ── Fuel load proxy ────────────────────────────────────────
    total_laps = df["lap_number"].max()
    df["fuel_load_proxy"] = (total_laps - df["lap_number"]) / total_laps

    # ── Rolling personal best (last 3 valid laps) ──────────────
    df["rolling_best_3"] = (
        df.groupby("driver_id")["lap_time"]
        .transform(lambda x: x.rolling(3, min_periods=1).min())
    )

    # ── Stint lap count ────────────────────────────────────────
    df["stint_lap_count"] = (
        df.groupby(["driver_id", "stint_number"])["tyre_age"]
        .transform("count")
    )

    # ── Weather fill ───────────────────────────────────────────
    for col in ["air_temp", "track_temp", "humidity", "wind_speed"]:
        df[col] = df[col].fillna(df[col].median())
    df["rainfall"] = df["rainfall"].fillna(False).astype(int)

    # ── Is pit lap flag ────────────────────────────────────────
    df["is_pit_lap"] = df["pit_in_time"].notna().astype(int)

    return df


# ── Inference-time single-row feature builder ─────────────────────────────────
def build_lap_features(
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
) -> pd.DataFrame:
    compound_enc    = encode_compound(compound)
    race_progress   = lap_number / total_laps
    fuel_load_proxy = (total_laps - lap_number) / total_laps

    return pd.DataFrame([{
        "lap_number":      lap_number,
        "compound_enc":    compound_enc,
        "tyre_age":        tyre_age,
        "stint_number":    stint_number,
        "stint_lap_count": tyre_age,        # best approximation at inference time
        "driver_enc":      driver_enc,
        "team_enc":        team_enc,
        "air_temp":        air_temp,
        "track_temp":      track_temp,
        "humidity":        humidity,
        "wind_speed":      wind_speed,
        "rainfall":        rainfall,
        "fuel_load_proxy": fuel_load_proxy,
        "race_progress":   race_progress,
        "rolling_best_3":  rolling_best_3,
        "deg_proxy":       deg_proxy,
        "is_pit_lap":      0,
    }])


# ── Thin wrapper for dict-based training (fallback) ───────────────────────────
def build_training_df(rows: list[dict]) -> pd.DataFrame:
    """Used only if training from raw dicts instead of DB session."""
    df = pd.DataFrame(rows)
    df = df[df["is_valid"] == True].copy()
    df = df.dropna(subset=["lap_time", "compound", "tyre_age", "lap_number"])
    df["compound_enc"] = df["compound"].apply(encode_compound)
    df = df[df["compound_enc"] >= 0]
    return df.reset_index(drop=True)


if __name__ == "__main__":
    df = build_feature_matrix(session_id=2)
    print(f"Feature matrix shape: {df.shape}")
    print(df[get_feature_columns() + ["lap_time"]].describe())