from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db

router = APIRouter(prefix="/drivers", tags=["drivers"])


@router.get("/")
def list_drivers(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT driver_id, full_name, team, nationality, number
        FROM drivers ORDER BY full_name
    """)).mappings().all()
    return [dict(r) for r in rows]


@router.get("/{driver_id}/summary")
def driver_summary(
    driver_id: str,
    session_id: int = 2,
    db: Session = Depends(get_db)
):
    best = db.execute(text("""
        SELECT best_lap_time, theoretical_best, best_s1, best_s2, best_s3
        FROM v_best_laps
        WHERE session_id = :sid AND driver_id = :drv
    """), {"sid": session_id, "drv": driver_id}).mappings().first()

    stint_info = db.execute(text("""
        SELECT compound, COUNT(*) AS laps, MIN(lap_time) AS best,
               AVG(lap_time) AS avg, MAX(tyre_age) AS max_age
        FROM laps
        WHERE session_id = :sid AND driver_id = :drv AND is_valid = TRUE
        GROUP BY compound ORDER BY best
    """), {"sid": session_id, "drv": driver_id}).mappings().all()

    return {
        "driver_id":   driver_id,
        "best_lap":    dict(best) if best else {},
        "stints":      [dict(s) for s in stint_info]
    }