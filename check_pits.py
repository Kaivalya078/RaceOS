from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text
engine = create_engine(os.getenv('SYNC_DATABASE_URL'))
with engine.connect() as conn:
    # Check how postgres handles NaN in float comparison
    rows = conn.execute(text(
        "SELECT driver_id, pit_lap, pit_duration, compound_after, stint_number "
        "FROM v_pit_stops WHERE session_id=3 ORDER BY pit_lap LIMIT 15"
    )).fetchall()
    print(f"v_pit_stops rows for session 3:")
    for r in rows:
        print(dict(r._mapping))
    
    print()
    # Check actual pit timing data with explicit NaN check using 'isfinite'
    rows2 = conn.execute(text(
        "SELECT driver_id, lap_number, pit_in_time, pit_out_time "
        "FROM laps WHERE session_id=3 "
        "AND pit_in_time IS NOT NULL "
        "AND pit_in_time = 'infinity'::float IS NOT TRUE "
        "AND pit_in_time::text != 'NaN' "
        "ORDER BY driver_id, lap_number LIMIT 10"
    )).fetchall()
    print(f"Rows with real pit_in_time (no NaN): {len(rows2)}")
    for r in rows2:
        print(dict(r._mapping))
