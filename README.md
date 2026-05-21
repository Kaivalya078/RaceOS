# RaceOS

RaceOS is a full-stack Formula 1 race analytics platform. It ingests race data with FastF1, stores normalized telemetry in PostgreSQL, exposes analytics through a FastAPI backend, and renders interactive React dashboards for lap pace, tyre degradation, sectors, pit stops, driver comparison, and ML-assisted predictions.

## Features

- Best laps by driver, including sector splits and theoretical best lap.
- Lap-by-lap race pace charts with rolling averages and driver filtering.
- Head-to-head driver comparison across lap times, sectors, tyre age, and compounds.
- Tyre degradation analysis by compound, stint, and driver.
- Sector delta comparison across the field.
- Pit stop timing and compound transition views.
- ML endpoints for lap time prediction, strategy recommendation, and race outcome buckets.

## Tech Stack

| Area | Tools |
| --- | --- |
| Data ingestion | FastF1, pandas, NumPy |
| Database | PostgreSQL, SQLAlchemy, Alembic |
| API | FastAPI, Uvicorn, Pydantic |
| ML | XGBoost, scikit-learn |
| Frontend | React, TypeScript, Recharts, Axios |

## Repository Structure

```text
RaceOS/
|-- app/
|   |-- api/
|   |   |-- main.py              # FastAPI app setup and router registration
|   |   |-- deps.py              # Database session dependency
|   |   `-- routers/             # API endpoints
|   |-- db/
|   |   `-- analytics_views.sql  # PostgreSQL analytics views
|   |-- ingestion/
|   |   `-- fastf1_loader.py     # FastF1 loading and database ingestion
|   |-- ml/                      # Feature engineering and prediction models
|   |-- models/                  # SQLAlchemy ORM models
|   `-- database.py              # Async database engine/session setup
|-- alembic/                     # Database migration environment
|-- frontend/
|   |-- public/                  # Static React assets
|   |-- src/
|   |   |-- pages/               # Dashboard tab views
|   |   |-- hooks/               # React data hooks
|   |   |-- api.ts               # Axios API client
|   |   `-- App.tsx              # Main React shell
|   |-- package.json
|   `-- package-lock.json
|-- notebooks/                   # Exploration notebooks
|-- ingest.py                    # Ingest one race by year and round
|-- ingest_season.py             # Ingest a full season
|-- apply_views.py               # Apply analytics views manually
|-- check_pits.py                # Pit stop inspection helper
|-- requirements.txt             # Python dependencies
`-- .env.example                 # Required environment variables
```

Generated folders such as `.venv/`, `cache/`, `frontend/node_modules/`, `frontend/build/`, `__pycache__/`, and trained ML model files are intentionally ignored by Git.

## Prerequisites

- Python 3.11+
- Node.js 18+
- PostgreSQL 16+

## Environment

Copy the example environment file and update it with your local PostgreSQL credentials.

```bash
cp .env.example .env
```

```env
DATABASE_URL=postgresql+asyncpg://user:password@localhost:5432/raceos
SYNC_DATABASE_URL=postgresql+psycopg2://user:password@localhost:5432/raceos
```

`DATABASE_URL` is used by the async application database layer. `SYNC_DATABASE_URL` is used by synchronous utilities, feature engineering, and ML workflows.

## Backend Setup

```bash
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

On macOS or Linux, activate the environment with:

```bash
source .venv/bin/activate
```

Run migrations and apply analytics views:

```bash
alembic upgrade head
psql -U postgres -d raceos -f app/db/analytics_views.sql
```

Start the API:

```bash
uvicorn app.api.main:app --reload
```

The API runs at `http://127.0.0.1:8000`, with Swagger docs at `http://127.0.0.1:8000/docs`.

## Data Ingestion

Ingest a single race:

```bash
python ingest.py 2024 1
```

Ingest a full season:

```bash
python ingest_season.py 2024
```

FastF1 downloads and caches timing data locally. First runs can take a while; later runs are much faster.

## Frontend Setup

```bash
cd frontend
npm install
npm start
```

The React app runs at `http://localhost:3000` and expects the backend API to be available at `http://127.0.0.1:8000`.

## API Overview

| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/api/v1/sessions/` | List ingested sessions |
| GET | `/api/v1/drivers/` | List drivers |
| GET | `/api/v1/drivers/{driver_id}/summary` | Driver summary for a session |
| GET | `/api/v1/laps/best?session_id=` | Best lap per driver |
| GET | `/api/v1/laps/pace?session_id=` | Lap-by-lap race pace |
| GET | `/api/v1/laps/compare?session_id=&driver_a=&driver_b=` | Compare two drivers |
| GET | `/api/v1/laps/sectors?session_id=` | Sector comparison |
| GET | `/api/v1/laps/tyres?session_id=` | Tyre degradation |
| GET | `/api/v1/laps/pitstops?session_id=` | Pit stop analysis |
| POST | `/api/v1/predictor/lap-time/train?session_id=` | Train the lap time model |
| POST | `/api/v1/predictor/lap-time/predict` | Predict lap time |
| POST | `/api/v1/predictor/strategy` | Recommend pit strategy |
| POST | `/api/v1/predictor/race-outcome/train?session_id=` | Train race outcome model |
| POST | `/api/v1/predictor/race-outcome/predict` | Predict race outcome buckets |

## ML Models

Trained model artifacts are not committed. They are regenerated locally from ingested data and ignored under `app/ml/models/`.

| Model | Approach |
| --- | --- |
| Lap Time Predictor | XGBoost regressor over engineered race-state features |
| Strategy Predictor | Heuristic pit-window scorer using tyre degradation and pit loss |
| Race Outcome Predictor | Gradient boosting classifier for finish-position buckets |

## GitHub Readiness

Before committing, check the following:

- `.env` is present locally but not staged.
- FastF1 cache folders and generated frontend builds are ignored.
- Python bytecode folders are ignored.
- `frontend/package-lock.json` is committed with `frontend/package.json`.
- `requirements.txt` is committed for backend setup.
- Run `git status --short --ignored` if you want to confirm ignored generated files are staying out of the commit.

## Notes

- Race data is sourced through [FastF1](https://github.com/theOehrly/Fast-F1).
- The main project notes live in `project_context.md`.
- The frontend keeps a small README that points back to this root guide.
