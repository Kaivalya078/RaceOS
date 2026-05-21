import math
import json
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from app.api.routers import laps, drivers, predictions, sessions


class NaNSafeResponse(JSONResponse):
    """Replaces NaN/Inf floats with null before serializing."""
    def render(self, content) -> bytes:
        def sanitize(obj):
            if isinstance(obj, float) and (math.isnan(obj) or math.isinf(obj)):
                return None
            if isinstance(obj, dict):
                return {k: sanitize(v) for k, v in obj.items()}
            if isinstance(obj, list):
                return [sanitize(i) for i in obj]
            return obj
        return json.dumps(sanitize(content), ensure_ascii=False).encode("utf-8")


app = FastAPI(
    title="RaceOS — F1 Telemetry API",
    description="Lap analytics, driver comparison, tyre degradation, and ML lap time prediction",
    version="1.0.0",
    default_response_class=NaNSafeResponse
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(laps.router,        prefix="/api/v1")
app.include_router(drivers.router,     prefix="/api/v1")
app.include_router(predictions.router, prefix="/api/v1")
app.include_router(sessions.router,    prefix="/api/v1")


@app.get("/")
def root():
    return {"status": "RaceOS API online", "docs": "/docs"}