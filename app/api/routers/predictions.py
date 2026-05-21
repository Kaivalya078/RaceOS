# app/api/routers/predictions.py
# pyrefly: ignore [missing-import]
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Optional

from app.api.deps import get_db
from app.ml.lap_time_predictor import predict_lap_time, train as train_lap_model
from app.ml.strategy_predictor import predict_strategy
from app.ml.race_outcome_predictor import predict_race_outcome, train_outcome_model

router = APIRouter(prefix="/predictor", tags=["predictions"])


class LapTimePredictRequest(BaseModel):
    driver_id: Optional[int] = None   # string PK in DB; not used by ML model (driver_enc is)
    compound: str
    tyre_age: int
    lap_number: int
    stint_number: int = 1
    air_temp: float = 28.0
    track_temp: float = 40.0
    humidity: float = 50.0
    wind_speed: float = 10.0
    rainfall: int = 0
    total_laps: int = 57
    rolling_best_3: float = 90.0
    deg_proxy: float = 0.0
    team_enc: int = 0
    driver_enc: int = 0


class StrategyRequest(BaseModel):
    session_id: int
    current_lap: int
    total_laps: int
    current_compound: str
    tyre_age: int
    driver_id: Optional[int] = None


class RaceOutcomeRequest(BaseModel):
    session_id: int
    at_lap: int


def _fetch_laps(db: Session, session_id: int) -> list[dict]:
    rows = db.execute(text("""
        SELECT l.lap_number, l.lap_time, l.tyre_age, l.compound,
               l.stint_number, l.is_valid, l.driver_id
        FROM laps l
        WHERE l.session_id = :sid
        ORDER BY l.driver_id, l.lap_number
    """), {"sid": session_id}).fetchall()
    return [dict(r._mapping) for r in rows]


@router.post("/lap-time/train")
def train_lap_time(session_id: int):
    try:
        return train_lap_model(session_id)
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/lap-time/predict")
def lap_time_predict(req: LapTimePredictRequest):
    try:
        return predict_lap_time(
            compound=req.compound,
            tyre_age=req.tyre_age,
            lap_number=req.lap_number,
            stint_number=req.stint_number,
            air_temp=req.air_temp,
            track_temp=req.track_temp,
            humidity=req.humidity,
            wind_speed=req.wind_speed,
            rainfall=req.rainfall,
            total_laps=req.total_laps,
            rolling_best_3=req.rolling_best_3,
            deg_proxy=req.deg_proxy,
            team_enc=req.team_enc,
            driver_enc=req.driver_enc,
        )
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@router.post("/strategy")
def strategy_predict(req: StrategyRequest, db: Session = Depends(get_db)):
    laps_data = _fetch_laps(db, req.session_id)
    if not laps_data:
        raise HTTPException(404, f"No laps found for session {req.session_id}")

    result = predict_strategy(
        current_lap=req.current_lap,
        total_laps=req.total_laps,
        current_compound=req.current_compound,
        tyre_age=req.tyre_age,
        laps_data=laps_data,
    )
    if "error" in result:
        raise HTTPException(422, result["error"])
    return result


@router.post("/race-outcome/train")
def train_race_outcome(session_id: int, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT l.driver_id,
               l.lap_number AS laps_completed,
               l.tyre_age,
               l.compound,
               l.stint_number,
               l.lap_time AS avg_lap_time,
               r.final_position,
               COALESCE(ps.pit_stops_made, 0) AS pit_stops_made,
               0.0 AS gap_to_leader,
               1 AS current_position
        FROM laps l
        JOIN race_results r
          ON r.driver_id = l.driver_id AND r.session_id = l.session_id
        LEFT JOIN (
            SELECT driver_id, session_id, COUNT(*) AS pit_stops_made
            FROM laps
            WHERE stint_number > 1
            GROUP BY driver_id, session_id
        ) ps ON ps.driver_id = l.driver_id AND ps.session_id = l.session_id
        WHERE l.session_id = :sid AND l.is_valid = TRUE
    """), {"sid": session_id}).fetchall()

    if not rows:
        raise HTTPException(404, "No training data found. Ensure race_results table is populated.")
    try:
        return train_outcome_model([dict(r._mapping) for r in rows])
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.post("/race-outcome/predict")
def race_outcome_predict(req: RaceOutcomeRequest, db: Session = Depends(get_db)):
    rows = db.execute(text("""
        WITH driver_totals AS (
            SELECT
                driver_id,
                SUM(lap_time) AS total_time,
                AVG(lap_time) AS avg_lap_time
            FROM laps
            WHERE session_id = :sid AND lap_number <= :lap
            GROUP BY driver_id
        )
        SELECT
            l.driver_id,
            d.full_name,
            l.lap_number AS laps_completed,
            l.tyre_age,
            l.compound,
            l.stint_number,
            dt.avg_lap_time,
            ROW_NUMBER() OVER (ORDER BY dt.total_time) AS current_position,
            0.0 AS gap_to_leader,
            COALESCE(ps.pit_stops_made, 0) AS pit_stops_made
        FROM laps l
        JOIN drivers d ON d.driver_id = l.driver_id
        JOIN driver_totals dt ON dt.driver_id = l.driver_id
        LEFT JOIN (
            SELECT driver_id, session_id,
                   COUNT(DISTINCT stint_number) - 1 AS pit_stops_made
            FROM laps
            GROUP BY driver_id, session_id
        ) ps ON ps.driver_id = l.driver_id AND ps.session_id = l.session_id
        WHERE l.session_id = :sid AND l.lap_number = :lap
    """), {"sid": req.session_id, "lap": req.at_lap}).fetchall()

    if not rows:
        raise HTTPException(404, f"No standings data at lap {req.at_lap}")

    standings = [dict(r._mapping) for r in rows]
    predictions = predict_race_outcome(standings)
    name_map = {s["driver_id"]: s.get("full_name", str(s["driver_id"])) for s in standings}

    for p in predictions:
        p["driver_name"] = name_map.get(p["driver_id"], "Unknown")

    return predictions