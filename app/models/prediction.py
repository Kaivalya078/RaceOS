from sqlalchemy import Column, Integer, Float, String, DateTime, JSON, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class Prediction(Base):
    __tablename__ = "predictions"

    prediction_id   = Column(Integer, primary_key=True, autoincrement=True)
    session_id      = Column(Integer, ForeignKey("sessions.session_id"), nullable=False)
    driver_id       = Column(String(10), ForeignKey("drivers.driver_id"), nullable=False)
    model_name      = Column(String(50), nullable=False)
    predicted_value = Column(Float)
    confidence      = Column(Float)
    shap_values     = Column(JSON)
    created_at      = Column(DateTime, server_default=func.now())