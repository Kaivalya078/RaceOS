from sqlalchemy import Column, String, Integer, DateTime
from app.database import Base

class F1Session(Base):
    __tablename__ = "sessions"

    session_id   = Column(Integer, primary_key=True, autoincrement=True)
    year         = Column(Integer, nullable=False)
    round_number = Column(Integer, nullable=False)
    circuit_name = Column(String(100), nullable=False)
    circuit_key  = Column(String(50))
    session_type = Column(String(10), nullable=False)
    session_date = Column(DateTime)