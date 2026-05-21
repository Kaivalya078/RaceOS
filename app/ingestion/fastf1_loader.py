import fastf1
import pandas as pd
import numpy as np
from sqlalchemy import create_engine, text
from dotenv import load_dotenv
from tqdm import tqdm
import os
import math
import warnings
warnings.filterwarnings("ignore")

load_dotenv()

engine = create_engine(os.getenv("SYNC_DATABASE_URL"))

cache_path = os.getenv("FASTF1_CACHE_PATH", "./cache/fastf1")
os.makedirs(cache_path, exist_ok=True)
fastf1.Cache.enable_cache(cache_path)


def load_session(year, round_number, session_type="R"):
    print(f"\nLoading {year} Round {round_number} - {session_type}")
    session = fastf1.get_session(year, round_number, session_type)
    session.load(telemetry=True, weather=True, messages=False)

    circuit_name = session.event["EventName"]
    circuit_key  = session.event["Location"]
    session_date = session.date

    print(f"Circuit : {circuit_name}")
    print(f"Date    : {session_date}")

    session_id = upsert_session(
        year, round_number, circuit_name,
        circuit_key, session_type, session_date
    )
    print(f"Session ID: {session_id}")

    upsert_drivers(session)
    insert_weather(session, session_id)
    insert_laps_and_telemetry(session, session_id)

    print("\nSession loaded successfully.")


def upsert_session(year, round_number, circuit_name,
                   circuit_key, session_type, session_date):
    with engine.begin() as conn:
        result = conn.execute(text("""
            SELECT session_id FROM sessions
            WHERE year = :year
              AND round_number = :round
              AND session_type = :stype
        """), {"year": year, "round": round_number, "stype": session_type})
        row = result.fetchone()
        if row:
            print(f"Session already exists (ID: {row[0]})")
            return row[0]

        result = conn.execute(text("""
            INSERT INTO sessions
                (year, round_number, circuit_name, circuit_key, session_type, session_date)
            VALUES
                (:year, :round, :circuit_name, :circuit_key, :stype, :date)
            RETURNING session_id
        """), {
            "year":         year,
            "round":        round_number,
            "circuit_name": circuit_name,
            "circuit_key":  circuit_key,
            "stype":        session_type,
            "date":         session_date
        })
        return result.fetchone()[0]

def upsert_drivers(session):
    drivers = []
    # Pull driver list from laps — guarantees same IDs used in lap inserts
    laps_drivers = session.laps["Driver"].unique()

    for drv in laps_drivers:
        try:
            info = session.get_driver(drv)
            full_name = str(info.get("FullName", drv))
            team      = str(info.get("TeamName", "Unknown"))
            nat       = str(info.get("CountryCode", "Unknown"))
            number    = int(info.get("DriverNumber", 0) or 0)
        except Exception:
            full_name = drv
            team      = "Unknown"
            nat       = "Unknown"
            number    = 0

        drivers.append({
            "driver_id":   drv,
            "full_name":   full_name,
            "team":        team,
            "nationality": nat,
            "number":      number
        })

    with engine.begin() as conn:
        for d in drivers:
            conn.execute(text("""
                INSERT INTO drivers (driver_id, full_name, team, nationality, number)
                VALUES (:driver_id, :full_name, :team, :nationality, :number)
                ON CONFLICT (driver_id) DO UPDATE
                SET team      = EXCLUDED.team,
                    full_name = EXCLUDED.full_name
            """), d)

    print(f"Upserted {len(drivers)} drivers")


def insert_weather(session, session_id):
    weather_df = session.weather_data.copy()
    if weather_df.empty:
        print("No weather data available")
        return

    weather_df = weather_df.rename(columns={
        "Time":          "timestamp",
        "AirTemp":       "air_temp",
        "TrackTemp":     "track_temp",
        "Humidity":      "humidity",
        "WindSpeed":     "wind_speed",
        "WindDirection": "wind_dir",
        "Rainfall":      "rainfall"
    })

    weather_df["timestamp"]  = weather_df["timestamp"].dt.total_seconds()
    weather_df["session_id"] = session_id
    weather_df["rainfall"]   = weather_df["rainfall"].astype(bool)

    cols = [
        "session_id", "timestamp", "air_temp", "track_temp",
        "humidity", "wind_speed", "wind_dir", "rainfall"
    ]
    weather_df[cols].to_sql(
        "weather", engine,
        if_exists="append", index=False, method="multi"
    )
    print(f"Inserted {len(weather_df)} weather rows")


def _nan_to_none(v):
    """Convert float NaN / Inf to None so the DB stores SQL NULL, not 'NaN'."""
    if v is None:
        return None
    if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
        return None
    # pandas NA / NaT
    try:
        if pd.isna(v):
            return None
    except (TypeError, ValueError):
        pass
    return v


def insert_lap(lap_row, session_id, driver_id):
    try:
        with engine.begin() as conn:
            result = conn.execute(text("""
                INSERT INTO laps (
                    session_id, driver_id, lap_number,
                    lap_time, sector1_time, sector2_time, sector3_time,
                    compound, tyre_age, stint_number,
                    is_valid, pit_in_time, pit_out_time, track_status
                ) VALUES (
                    :session_id, :driver_id, :lap_number,
                    :lap_time, :s1, :s2, :s3,
                    :compound, :tyre_age, :stint,
                    :is_valid, :pit_in, :pit_out, :track_status
                )
                RETURNING lap_id
            """), {
                "session_id":   session_id,
                "driver_id":    driver_id,
                "lap_number":   int(lap_row.get("LapNumber", 0)),
                "lap_time":     _nan_to_none(lap_row.get("LapTime")),
                "s1":           _nan_to_none(lap_row.get("Sector1Time")),
                "s2":           _nan_to_none(lap_row.get("Sector2Time")),
                "s3":           _nan_to_none(lap_row.get("Sector3Time")),
                "compound":     lap_row.get("Compound", "UNKNOWN"),
                "tyre_age":     int(lap_row.get("TyreLife", 0) or 0),
                "stint":        int(lap_row.get("Stint", 1) or 1),
                "is_valid":     bool(lap_row.get("is_valid", False)),
                "pit_in":       _nan_to_none(lap_row.get("PitInTime")),
                "pit_out":      _nan_to_none(lap_row.get("PitOutTime")),
                "track_status": str(lap_row.get("TrackStatus", ""))
            })
            return result.fetchone()[0]
    except Exception as e:
        print(f"Lap insert error: {e}")
        return None


def insert_telemetry(tel, lap_id):
    tel = tel.copy()

    tel = tel.rename(columns={
        "Time":     "timestamp",
        "Distance": "distance",
        "Speed":    "speed",
        "Throttle": "throttle",
        "Brake":    "brake",
        "nGear":    "gear",
        "RPM":      "rpm",
        "DRS":      "drs",
        "X":        "x",
        "Y":        "y"
    })

    if hasattr(tel["timestamp"], "dt"):
        tel["timestamp"] = tel["timestamp"].dt.total_seconds()

    tel["lap_id"] = lap_id
    tel["brake"]  = tel["brake"].astype(float)

    cols = [
        "lap_id", "timestamp", "distance", "speed",
        "throttle", "brake", "gear", "rpm", "drs", "x", "y"
    ]
    cols = [c for c in cols if c in tel.columns]

    tel[cols].to_sql(
        "telemetry", engine,
        if_exists="append", index=False,
        method="multi", chunksize=500
    )


def insert_laps_and_telemetry(session, session_id):
    laps_df = session.laps.copy()

    def _to_seconds(x):
        """Convert Timedelta → float seconds, everything else → None (never NaN)."""
        if pd.isna(x):
            return None
        if hasattr(x, "total_seconds"):
            secs = x.total_seconds()
            return secs if math.isfinite(secs) else None
        if isinstance(x, (int, float)):
            return x if math.isfinite(x) else None
        return None

    for col in ["LapTime", "Sector1Time", "Sector2Time",
                "Sector3Time", "PitInTime", "PitOutTime"]:
        if col in laps_df.columns:
            laps_df[col] = laps_df[col].apply(_to_seconds)

    laps_df["is_valid"] = (
        laps_df["TrackStatus"].isin(["1", "2"]) &
        laps_df["Deleted"].fillna(False).eq(False) &
        laps_df["LapTime"].notna()
    )

    if "Stint" not in laps_df.columns:
        laps_df["Stint"] = (
            laps_df.groupby("Driver")["FreshTyre"]
            .transform(lambda x: x.ne(x.shift()).cumsum())
        )

    laps_df["session_id"] = session_id
    all_drivers = laps_df["Driver"].unique()
    print(f"\nProcessing {len(all_drivers)} drivers...")

    for driver_id in tqdm(all_drivers):
        driver_laps = laps_df[laps_df["Driver"] == driver_id].copy()

        for _, lap_row in driver_laps.iterrows():
            lap_id = insert_lap(lap_row, session_id, driver_id)
            if lap_id is None:
                continue
            try:
                tel = lap_row.get_telemetry()
                if tel is not None and not tel.empty:
                    insert_telemetry(tel, lap_id)
            except Exception:
                pass


if __name__ == "__main__":
    load_session(year=2024, round_number=1, session_type="R")