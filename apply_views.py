from dotenv import load_dotenv
load_dotenv()
import os
from sqlalchemy import create_engine, text

engine = create_engine(os.getenv('SYNC_DATABASE_URL'))
sql = open('app/db/analytics_views.sql').read()

with engine.begin() as conn:
    conn.execute(text("DROP VIEW IF EXISTS v_pit_stops CASCADE"))
    conn.execute(text(sql))
print('Views updated.')

with engine.connect() as conn:
    rows = conn.execute(text(
        "SELECT driver_id, pit_lap, pit_duration, compound_after, stint_number "
        "FROM v_pit_stops WHERE session_id=3 ORDER BY pit_lap, driver_id"
    )).fetchall()
    print(f"\nTotal pit stops for session 3: {len(rows)}")
    for r in rows:
        dur = f"{float(r.pit_duration):.2f}s" if r.pit_duration else "—"
        print(f"  {r.driver_id:4s}  Lap {r.pit_lap:2d}  {dur:8s}  → {r.compound_after}  Stint {r.stint_number}")
