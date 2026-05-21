from sqlalchemy import Column, String, Integer
from app.database import Base

class Driver(Base):
    __tablename__ = "drivers"

    driver_id   = Column(String(10), primary_key=True)
    full_name   = Column(String(100), nullable=False)
    team        = Column(String(100))
    nationality = Column(String(50))
    number      = Column(Integer)