import axios from 'axios';

const BASE = 'http://localhost:8000/api/v1';

export const api = {
  sessions:      () => axios.get(`${BASE}/sessions/`),
  bestLaps:      (session_id: number) => axios.get(`${BASE}/laps/best?session_id=${session_id}`),
  racePace:      (session_id: number, driver_id?: string) =>
    axios.get(`${BASE}/laps/pace?session_id=${session_id}${driver_id ? `&driver_id=${driver_id}` : ''}`),
  compare:       (a: string, b: string, session_id: number) =>
    axios.get(`${BASE}/laps/compare?session_id=${session_id}&driver_a=${a}&driver_b=${b}`),
  sectors:       (session_id: number) => axios.get(`${BASE}/laps/sectors?session_id=${session_id}`),
  tyres:         (session_id: number, driver_id?: string) =>
    axios.get(`${BASE}/laps/tyres?session_id=${session_id}${driver_id ? `&driver_id=${driver_id}` : ''}`),
  pitStops:      (session_id: number) => axios.get(`${BASE}/laps/pitstops?session_id=${session_id}`),
  drivers:       () => axios.get(`${BASE}/drivers/`),
  driverSummary: (driver_id: string, session_id: number) =>
    axios.get(`${BASE}/drivers/${driver_id}/summary?session_id=${session_id}`),

  // ── Prediction endpoints ──────────────────────────────────
  predictLap:         (payload: object) => axios.post(`${BASE}/predictor/lap-time/predict`, payload),
  trainLapModel:      (session_id: number) => axios.post(`${BASE}/predictor/lap-time/train?session_id=${session_id}`),
  predictStrategy:    (payload: object) => axios.post(`${BASE}/predictor/strategy`, payload),
  predictRaceOutcome: (payload: object) => axios.post(`${BASE}/predictor/race-outcome/predict`, payload),
  trainRaceOutcome:   (session_id: number) => axios.post(`${BASE}/predictor/race-outcome/train?session_id=${session_id}`),
};