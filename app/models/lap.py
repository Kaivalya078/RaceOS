from sqlalchemy import Column, Integer, Float, String, Boolean, ForeignKey
from app.database import Base

class Lap(Base):
    __tablename__ = "laps"

    lap_id       = Column(Integer, primary_key=True, autoincrement=True)
    session_id   = Column(Integer, ForeignKey("sessions.session_id"), nullable=False)
    driver_id    = Column(String(10), ForeignKey("drivers.driver_id"), nullable=False)
    lap_number   = Column(Integer, nullable=False)
    lap_time     = Column(Float)
    sector1_time = Column(Float)
    sector2_time = Column(Float)
    sector3_time = Column(Float)
    compound     = Column(String(20))
    tyre_age     = Column(Integer)
    stint_number = Column(Integer)
    is_valid     = Column(Boolean, default=True)
    pit_in_time  = Column(Float)
    pit_out_time = Column(Float)
    track_status = Column(String(10))