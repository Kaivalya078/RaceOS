from sqlalchemy import Column, Integer, Float, ForeignKey, Index
from app.database import Base

class Telemetry(Base):
    __tablename__ = "telemetry"

    telemetry_id = Column(Integer, primary_key=True, autoincrement=True)
    lap_id       = Column(Integer, ForeignKey("laps.lap_id"), nullable=False)
    timestamp    = Column(Float, nullable=False)
    distance     = Column(Float)
    speed        = Column(Float)
    throttle     = Column(Float)
    brake        = Column(Float)
    gear         = Column(Integer)
    rpm          = Column(Integer)
    drs          = Column(Integer)
    x            = Column(Float)
    y            = Column(Float)

    __table_args__ = (
        Index("ix_telemetry_lap_timestamp", "lap_id", "timestamp"),
    )