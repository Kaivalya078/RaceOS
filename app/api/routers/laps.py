from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db
import math 
router = APIRouter(prefix="/laps", tags=["laps"])


@router.get("/best")
def best_laps(session_id: int = Query(2), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT driver_id, full_name, team,
               best_lap_time, best_s1, best_s2, best_s3, theoretical_best
        FROM v_best_laps
        WHERE session_id = :sid
        ORDER BY best_lap_time ASC
    """), {"sid": session_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/pace")
def race_pace(
    session_id: int = Query(2),
    driver_id: str = Query(None),
    db: Session = Depends(get_db)
):
    if driver_id:
        rows = db.execute(text("""
            SELECT driver_id, full_name, lap_number, lap_time,
                   compound, tyre_age, rolling_avg_5, delta_to_fastest
            FROM v_race_pace
            WHERE session_id = :sid AND driver_id = :drv
            ORDER BY lap_number
        """), {"sid": session_id, "drv": driver_id}).mappings().all()
    else:
        rows = db.execute(text("""
            SELECT driver_id, full_name, lap_number, lap_time,
                   compound, tyre_age, rolling_avg_5, delta_to_fastest
            FROM v_race_pace
            WHERE session_id = :sid
            ORDER BY driver_id, lap_number
        """), {"sid": session_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/compare")
def compare_drivers(
    session_id: int = Query(2),
    driver_a: str = Query(...),
    driver_b: str = Query(...),
    db: Session = Depends(get_db)
):
    rows = db.execute(text("""
        SELECT driver_id, lap_number, lap_time, compound,
               tyre_age, sector1_time, sector2_time, sector3_time
        FROM laps
        WHERE session_id = :sid
          AND driver_id IN (:a, :b)
          AND is_valid = TRUE
        ORDER BY driver_id, lap_number
    """), {"sid": session_id, "a": driver_a, "b": driver_b}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/sectors")
def sector_comparison(
    session_id: int = Query(2),
    db: Session = Depends(get_db)
):
    rows = db.execute(text("""
        SELECT driver_id, full_name, team, lap_number,
               s1, s2, s3, s1_delta, s2_delta, s3_delta
        FROM v_sector_comparison
        WHERE session_id = :sid
        ORDER BY driver_id, lap_number
    """), {"sid": session_id}).mappings().all()
    return [dict(r) for r in rows]


@router.get("/tyres")
def tyre_degradation(
    session_id: int = Query(2),
    driver_id: str = Query(None),
    db: Session = Depends(get_db)
):
    if driver_id:
        rows = db.execute(text("""
            SELECT driver_id, compound, stint_number, tyre_age,
                   lap_time, deg_from_new, deg_rate_per_lap
            FROM v_tyre_degradation
            WHERE session_id = :sid AND driver_id = :drv
            ORDER BY stint_number, tyre_age
        """), {"sid": session_id, "drv": driver_id}).mappings().all()
    else:
        rows = db.execute(text("""
            SELECT driver_id, compound, stint_number, tyre_age,
                   lap_time, deg_from_new, deg_rate_per_lap
            FROM v_tyre_degradation
            WHERE session_id = :sid
            ORDER BY driver_id, stint_number, tyre_age
        """), {"sid": session_id}).mappings().all()
    return [dict(r) for r in rows]

def get_pit_stops(session):
    laps = session.laps
    pit_stops = []

    for drv in laps['Driver'].unique():
        drv_laps = laps[laps['Driver'] == drv].copy()

        for _, lap in drv_laps.iterrows():
            pit_in  = lap.get('PitInTime')
            pit_out = lap.get('PitOutTime')

            # Only rows where the car actually pitted
            if pd.isnull(pit_in) or pd.isnull(pit_out):
                continue

            duration_sec = (pit_out - pit_in).total_seconds()

            # Sanity check — valid pit stop is 2–60 seconds
            if not (2 <= duration_sec <= 60):
                continue

            # Sanitize NaN/Inf before JSON serialization
            duration_rounded = round(duration_sec, 1) if math.isfinite(duration_sec) else None

            pit_stops.append({
                "driver":         lap['Driver'],
                "full_name":      ...,
                "pit_lap":        int(lap['LapNumber']),
                "duration":       duration_rounded,   # ← now populated
                "compound_after": lap['Compound'],
                "stint":          int(lap['Stint']),
            })

    return pit_stops
@router.get("/pitstops")
def pit_stops(session_id: int = Query(2), db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT
            driver_id,
            full_name,
            pit_lap,
            pit_duration,
            compound_after,
            stint_number
        FROM v_pit_stops
        WHERE session_id = :sid
        ORDER BY pit_lap
    """), {"sid": session_id}).mappings().all()

    def safe(v):
        import decimal
        if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
            return None
        if isinstance(v, decimal.Decimal):
            return float(v)
        return v

    return [{k: safe(v) for k, v in dict(r).items()} for r in rows]