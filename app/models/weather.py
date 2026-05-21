from sqlalchemy import Column, Integer, Float, Boolean, ForeignKey
from app.database import Base

class Weather(Base):
    __tablename__ = "weather"

    weather_id = Column(Integer, primary_key=True, autoincrement=True)
    session_id = Column(Integer, ForeignKey("sessions.session_id"), nullable=False)
    timestamp  = Column(Float, nullable=False)
    air_temp   = Column(Float)
    track_temp = Column(Float)
    humidity   = Column(Float)
    wind_speed = Column(Float)
    wind_dir   = Column(Float)
    rainfall   = Column(Boolean, default=False)