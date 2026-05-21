from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.api.deps import get_db

router = APIRouter(prefix="/sessions", tags=["sessions"])


@router.get("/")
def list_sessions(db: Session = Depends(get_db)):
    rows = db.execute(text("""
        SELECT session_id AS id,
               year,
               round_number,
               circuit_key  AS round_name,
               circuit_name AS event_name,
               session_type
        FROM sessions
        ORDER BY year DESC, round_number ASC
    """)).mappings().all()
    return [dict(r) for r in rows]
