import { useEffect, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  CartesianGrid, Cell, Legend,
} from 'recharts';
import { api } from '../api';

/* ─── colour palette (matches the rest of the app) ─── */
const RED      = '#e10600';
const GREEN    = '#4ade80';
const BLUE     = '#60a5fa';
const YELLOW   = '#facc15';
const BG_CARD  = '#1a1a1a';
const BORDER   = '#333';
const MUTED    = '#888';
const DIM      = '#666';

const COMPOUND_COLOR: Record<string, string> = {
  SOFT: RED, MEDIUM: YELLOW, HARD: '#e0e0e0', INTERMEDIATE: GREEN, WET: BLUE,
};

const BUCKET_COLOR: Record<string, string> = {
  podium: GREEN, points: BLUE, midfield: YELLOW, tail: '#f87171',
};

/* Safely extract a renderable error string from axios/FastAPI errors */
function extractError(e: any, fallback = 'Request failed'): string {
  const detail = e?.response?.data?.detail;
  if (Array.isArray(detail)) {
    return detail.map((d: any) => d.msg || JSON.stringify(d)).join(', ');
  }
  if (typeof detail === 'string') return detail;
  return e?.message || fallback;
}

/* ─── shared inline styles ─── */
const sLabel: React.CSSProperties = {
  fontSize: 11, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5,
};
const sInput: React.CSSProperties = {
  background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff',
  padding: '7px 10px', borderRadius: 4, fontFamily: 'monospace', width: '100%',
  boxSizing: 'border-box',
};
const sBtn: React.CSSProperties = {
  background: RED, color: '#fff', border: 'none', padding: '10px 32px',
  borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace', fontSize: 14,
  fontWeight: 700, letterSpacing: 0.5, transition: 'opacity .15s',
};
const sCard: React.CSSProperties = {
  background: BG_CARD, border: `1px solid ${BORDER}`, borderRadius: 8, padding: 24,
};
const sGrid4: React.CSSProperties = {
  display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, maxWidth: 900,
};

/* ─── tiny field + select helpers ─── */
function Field({ label, value, onChange, type = 'number' }: {
  label: string; value: any; onChange: (v: any) => void; type?: string;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={sLabel}>{label}</label>
      <input type={type} value={value}
        onChange={e => onChange(type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        style={sInput} />
    </div>
  );
}

function Select({ label, value, options, onChange }: {
  label: string; value: string; options: string[]; onChange: (v: string) => void;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <label style={sLabel}>{label}</label>
      <select value={value} onChange={e => onChange(e.target.value)} style={sInput}>
        {options.map(o => <option key={o}>{o}</option>)}
      </select>
    </div>
  );
}

/* ─── Tab button ─── */
function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} style={{
      background: active ? RED : 'transparent',
      color: active ? '#fff' : '#aaa',
      border: `1px solid ${active ? RED : BORDER}`,
      padding: '8px 20px', borderRadius: 6, cursor: 'pointer',
      fontFamily: 'monospace', fontSize: 13, fontWeight: active ? 700 : 400,
      transition: 'all .15s',
    }}>
      {label}
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 1 — LAP TIME PREDICTOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function LapTimeTab({ drivers, sessionId }: { drivers: any[]; sessionId: number }) {
  const [form, setForm] = useState({
    driver_id: '',          // string PK e.g. "VER" — for display only
    compound: 'MEDIUM',
    tyre_age: 10,
    lap_number: 30,
    stint_number: 2,
    air_temp: 28.0,
    track_temp: 40.0,
    humidity: 50.0,
    wind_speed: 10.0,
    rainfall: 0,
    total_laps: 57,
    rolling_best_3: 90.0,
    deg_proxy: 0.0,
    team_enc: 0,
    driver_enc: 0,          // 0-based index used by the ML model
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  /* ── Training state ── */
  const [training, setTraining]               = useState(false);
  const [trainResult, setTrainResult]         = useState<any>(null);
  const [trainError, setTrainError]           = useState('');
  const [trainedSessionId, setTrainedSessionId] = useState<number | null>(null);

  const set = (key: string) => (v: any) => setForm(f => ({ ...f, [key]: v }));

  const trainModel = async () => {
    setTraining(true); setTrainError(''); setTrainResult(null);
    try {
      const r = await api.trainLapModel(sessionId);
      setTrainResult(r.data);
      setTrainedSessionId(sessionId);
    } catch (e: any) {
      setTrainError(extractError(e, 'Training failed'));
    }
    setTraining(false);
  };

  const predict = async () => {
    if (!form.driver_id) {
      setError('Please select a driver before predicting.');
      return;
    }
    setLoading(true); setError(''); setResult(null);
    try {
      const payload = {
        // driver_id is a string PK — not used by the ML model; driver_enc carries the encoding
        compound:       form.compound,
        tyre_age:       parseInt(String(form.tyre_age)),
        lap_number:     parseInt(String(form.lap_number)),
        stint_number:   parseInt(String(form.stint_number)),
        air_temp:       parseFloat(String(form.air_temp)),
        track_temp:     parseFloat(String(form.track_temp)),
        humidity:       parseFloat(String(form.humidity)),
        wind_speed:     parseFloat(String(form.wind_speed)),
        rainfall:       parseInt(String(form.rainfall)),
        total_laps:     parseInt(String(form.total_laps)),
        rolling_best_3: parseFloat(String(form.rolling_best_3)),
        deg_proxy:      parseFloat(String(form.deg_proxy)),
        team_enc:       parseInt(String(form.team_enc)),
        driver_enc:     parseInt(String(form.driver_enc)),
      };
      const r = await api.predictLap(payload);
      setResult(r.data);
    } catch (e: any) {
      setError(extractError(e, 'Prediction failed'));
    }
    setLoading(false);
  };

  return (
    <div>
      {/* ── Train section ── */}
      <div style={{ ...sCard, marginBottom: 24, borderColor: '#444', maxWidth: 900 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
          <button onClick={trainModel} disabled={training}
            style={{ ...sBtn, background: '#2563eb', opacity: training ? 0.6 : 1, padding: '8px 24px', fontSize: 13 }}>
            {training ? 'Training…' : '🧠 Train on this session'}
          </button>

          {trainResult && (
            <div style={{ display: 'flex', gap: 16, fontSize: 12, color: GREEN }}>
              <span>MAE: <b>{trainResult.mae_seconds?.toFixed(3)}s</b></span>
              <span>Rows: <b>{trainResult.rows_used}</b></span>
              <span>Features: <b>{trainResult.features?.length ?? trainResult.feature_count ?? '—'}</b></span>
            </div>
          )}

          {trainError && (
            <span style={{ fontSize: 12, color: '#f87171', fontFamily: 'monospace' }}>✕ {trainError}</span>
          )}
        </div>

        {/* Warning banner: trained on different session */}
        {trainedSessionId !== null && trainedSessionId !== sessionId && (
          <div style={{
            marginTop: 12, padding: '8px 14px', borderRadius: 4,
            background: '#422006', border: '1px solid #a16207', color: YELLOW, fontSize: 12,
            fontFamily: 'monospace',
          }}>
            ⚠ Model trained on session {trainedSessionId} — retrain for accurate predictions.
          </div>
        )}
      </div>

      <p style={{ color: DIM, fontSize: 12, marginBottom: 20 }}>
        XGBoost model — enter race parameters to predict lap time in seconds.
      </p>

      <div style={sGrid4}>
        {/* Driver dropdown — driver_id is VARCHAR ("VER"); driver_enc is the 0-based ML index */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          <label style={sLabel}>Driver</label>
          <select value={form.driver_id}
            onChange={e => {
              const idx = e.target.selectedIndex - 1; // subtract 1 for the "— select —" option
              setForm(f => ({
                ...f,
                driver_id:  e.target.value,
                driver_enc: idx >= 0 ? idx : 0,
              }));
            }}
            style={sInput}>
            <option value=''>— select —</option>
            {drivers.map(d => (
              <option key={d.driver_id} value={d.driver_id}>
                {d.driver_id} — {d.full_name}
              </option>
            ))}
          </select>
        </div>

        <Select label="Compound" value={form.compound}
          options={['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET']}
          onChange={v => setForm(f => ({ ...f, compound: v }))} />

        <Field label="Lap Number" value={form.lap_number} onChange={set('lap_number')} />
        <Field label="Tyre Age (laps)" value={form.tyre_age} onChange={set('tyre_age')} />
        <Field label="Stint Number" value={form.stint_number} onChange={set('stint_number')} />
        <Field label="Total Laps" value={form.total_laps} onChange={set('total_laps')} />
        <Field label="Air Temp (°C)" value={form.air_temp} onChange={set('air_temp')} />
        <Field label="Track Temp (°C)" value={form.track_temp} onChange={set('track_temp')} />
        <Field label="Humidity (%)" value={form.humidity} onChange={set('humidity')} />
        <Field label="Wind Speed" value={form.wind_speed} onChange={set('wind_speed')} />
        <Field label="Rainfall (0/1)" value={form.rainfall} onChange={set('rainfall')} />
        <Field label="Rolling Best 3" value={form.rolling_best_3} onChange={set('rolling_best_3')} />
        <Field label="Deg Proxy" value={form.deg_proxy} onChange={set('deg_proxy')} />
        <Field label="Team Enc (0–9)" value={form.team_enc} onChange={set('team_enc')} />
        <Field label="Driver Enc (0–19)" value={form.driver_enc} onChange={set('driver_enc')} />
      </div>

      <button onClick={predict} disabled={loading}
        style={{ ...sBtn, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Predicting…' : '⚡ Predict Lap Time'}
      </button>

      {error && (
        <div style={{ marginTop: 16, color: '#f87171', fontSize: 13, fontFamily: 'monospace' }}>
          ✕ {error}
        </div>
      )}

      {result && (
        <div style={{ ...sCard, marginTop: 24, maxWidth: 480, borderColor: RED }}>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 4 }}>Predicted Lap Time</div>
          <div style={{ fontSize: 48, color: GREEN, fontWeight: 700, lineHeight: 1.1 }}>
            {result.predicted_lap_time}<span style={{ fontSize: 20, color: DIM }}>s</span>
          </div>
          <div style={{ marginTop: 12, fontSize: 12, color: DIM, display: 'flex', gap: 16 }}>
            <span>Compound: <b style={{ color: COMPOUND_COLOR[result.compound] || '#fff' }}>{result.compound}</b></span>
            <span>Tyre age: <b>{result.tyre_age}</b> laps</span>
            <span>Lap: <b>{result.lap_number}</b></span>
          </div>
          {(result.confidence_low != null) && (
            <div style={{ marginTop: 8, fontSize: 11, color: DIM }}>
              Confidence range: {result.confidence_low}s – {result.confidence_high}s
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 2 — TYRE STRATEGY PREDICTOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function StrategyTab({ sessionId }: { sessionId: number }) {
  const [form, setForm] = useState({
    current_lap: 20,
    total_laps: 57,
    current_compound: 'MEDIUM',
    tyre_age: 15,
    driver_id: null as number | null,
  });
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const set = (key: string) => (v: any) => setForm(f => ({ ...f, [key]: v }));

  const predict = async () => {
    setLoading(true); setError(''); setResult(null);
    try {
      const payload: any = {
        session_id:       sessionId,
        current_lap:      parseInt(String(form.current_lap)),
        total_laps:       parseInt(String(form.total_laps)),
        current_compound: form.current_compound,
        tyre_age:         parseInt(String(form.tyre_age)),
      };
      if (form.driver_id != null) {
        payload.driver_id = parseInt(String(form.driver_id));
      }
      const r = await api.predictStrategy(payload);
      setResult(r.data);
    } catch (e: any) {
      setError(extractError(e, 'Strategy prediction failed'));
    }
    setLoading(false);
  };

  /* build chart data from degradation_curves */
  const degData = result?.degradation_curves
    ? Object.entries(result.degradation_curves).map(([compound, v]: [string, any]) => ({
        compound,
        base_time: v.base_time,
        deg_per_lap: v.deg_per_lap,
      }))
    : [];

  return (
    <div>
      <p style={{ color: DIM, fontSize: 12, marginBottom: 20 }}>
        Heuristic pit-strategy engine — recommends optimal pit window and compound based on session data.
      </p>

      <div style={sGrid4}>
        <Field label="Current Lap" value={form.current_lap} onChange={set('current_lap')} />
        <Field label="Total Laps" value={form.total_laps} onChange={set('total_laps')} />
        <Field label="Tyre Age" value={form.tyre_age} onChange={set('tyre_age')} />
        <Select label="Current Compound" value={form.current_compound}
          options={['SOFT', 'MEDIUM', 'HARD']}
          onChange={v => setForm(f => ({ ...f, current_compound: v }))} />
        <Field label="Driver ID (optional)" value={form.driver_id ?? ''} onChange={(v: any) => {
          setForm(f => ({ ...f, driver_id: v === '' || isNaN(v) ? null : Number(v) }));
        }} />
      </div>

      <button onClick={predict} disabled={loading}
        style={{ ...sBtn, marginTop: 24, opacity: loading ? 0.6 : 1 }}>
        {loading ? 'Calculating…' : '🏁 Predict Strategy'}
      </button>

      {error && (
        <div style={{ marginTop: 16, color: '#f87171', fontSize: 13, fontFamily: 'monospace' }}>
          ✕ {error}
        </div>
      )}

      {result && (
        <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
          {/* Left — key numbers */}
          <div style={{ ...sCard, borderColor: RED, flex: '1 1 320px' }}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Recommended Strategy</div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div>
                <div style={sLabel}>Pit Lap</div>
                <div style={{ fontSize: 32, color: GREEN, fontWeight: 700 }}>{result.recommended_pit_lap}</div>
              </div>
              <div>
                <div style={sLabel}>New Compound</div>
                <div style={{
                  fontSize: 22, fontWeight: 700,
                  color: COMPOUND_COLOR[result.recommended_compound] || '#fff',
                }}>{result.recommended_compound}</div>
              </div>
              <div>
                <div style={sLabel}>Pit Window</div>
                <div style={{ fontSize: 16, color: BLUE }}>
                  Lap {result.pit_window_open} – {result.pit_window_close}
                </div>
              </div>
              <div>
                <div style={sLabel}>Tyre Cliff</div>
                <div style={{ fontSize: 16, color: '#f87171' }}>Lap {result.tyre_cliff_lap}</div>
              </div>
              <div style={{ gridColumn: '1 / -1' }}>
                <div style={sLabel}>Est. Total Cost</div>
                <div style={{ fontSize: 16, color: YELLOW }}>
                  {result.estimated_cost_seconds}s
                </div>
              </div>
            </div>
          </div>

          {/* Right — degradation chart */}
          {degData.length > 0 && (
            <div style={{ ...sCard, flex: '1 1 360px' }}>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Degradation per Compound</div>
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={degData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis dataKey="compound" stroke="#555" />
                  <YAxis stroke="#555" label={{ value: 'deg / lap', angle: -90, position: 'insideLeft', fill: MUTED }} />
                  <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff' }} />
                  <Bar dataKey="deg_per_lap" radius={[4, 4, 0, 0]}>
                    {degData.map((d, i) => (
                      <Cell key={i} fill={COMPOUND_COLOR[d.compound] || MUTED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   TAB 3 — RACE OUTCOME PREDICTOR
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
function RaceOutcomeTab({ sessionId }: { sessionId: number }) {
  const [form, setForm] = useState({ at_lap: 30 });
  const [result, setResult] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const predict = async () => {
    setLoading(true); setError(''); setResult([]);
    try {
      const payload = {
        session_id: sessionId,
        at_lap:     parseInt(String(form.at_lap)),
      };
      const r = await api.predictRaceOutcome(payload);
      setResult(r.data);
    } catch (e: any) {
      setError(extractError(e, 'Prediction failed'));
    }
    setLoading(false);
  };

  /* chart data: one bar per driver showing confidence */
  const chartData = result.map(r => ({
    name: r.driver_name || `#${r.driver_id}`,
    confidence: Math.round(r.confidence * 100),
    bucket: r.predicted_bucket,
  }));

  return (
    <div>
      <p style={{ color: DIM, fontSize: 12, marginBottom: 20 }}>
        GBM classifier — predicts finishing bucket (podium / points / midfield / tail) at a given lap.
      </p>

      <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', maxWidth: 400 }}>
        <Field label="At Lap" value={form.at_lap}
          onChange={v => setForm(f => ({ ...f, at_lap: v }))} />
        <button onClick={predict} disabled={loading}
          style={{ ...sBtn, opacity: loading ? 0.6 : 1, whiteSpace: 'nowrap', marginBottom: 0 }}>
          {loading ? 'Running…' : '🏆 Predict'}
        </button>
      </div>

      {error && (
        <div style={{ marginTop: 16, color: '#f87171', fontSize: 13, fontFamily: 'monospace' }}>
          ✕ {error}
        </div>
      )}

      {result.length > 0 && (
        <div style={{ display: 'flex', gap: 24, marginTop: 24, flexWrap: 'wrap' }}>
          {/* Table */}
          <div style={{ ...sCard, flex: '1 1 420px', overflow: 'auto' }}>
            <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Predicted Outcomes at Lap {form.at_lap}</div>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ color: RED }}>
                  {['Driver', 'Bucket', 'Confidence'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', borderBottom: `1px solid ${BORDER}` }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.map((r, i) => (
                  <tr key={r.driver_id} style={{ background: i % 2 === 0 ? '#151515' : BG_CARD }}>
                    <td style={{ padding: '8px 12px', fontWeight: 600 }}>
                      {r.driver_name || r.driver_id}
                    </td>
                    <td style={{
                      padding: '8px 12px', fontWeight: 700,
                      color: BUCKET_COLOR[r.predicted_bucket] || '#fff',
                    }}>
                      {r.predicted_bucket?.toUpperCase()}
                    </td>
                    <td style={{ padding: '8px 12px', color: BLUE }}>
                      {(r.confidence * 100).toFixed(1)}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Bar chart */}
          {chartData.length > 0 && (
            <div style={{ ...sCard, flex: '1 1 380px' }}>
              <div style={{ fontSize: 13, color: MUTED, marginBottom: 12 }}>Confidence by Driver</div>
              <ResponsiveContainer width="100%" height={Math.max(220, chartData.length * 32)}>
                <BarChart data={chartData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#222" />
                  <XAxis type="number" stroke="#555" domain={[0, 100]}
                    label={{ value: 'Confidence %', position: 'insideBottom', offset: -4, fill: MUTED }} />
                  <YAxis dataKey="name" type="category" stroke="#555" width={70} tick={{ fontSize: 11 }} />
                  <Tooltip contentStyle={{ background: BG_CARD, border: `1px solid ${BORDER}`, color: '#fff' }}
                    formatter={(v: any) => `${v}%`} />
                  <Legend />
                  <Bar dataKey="confidence" name="Confidence %" radius={[0, 4, 4, 0]}>
                    {chartData.map((d, i) => (
                      <Cell key={i} fill={BUCKET_COLOR[d.bucket] || MUTED} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
   MAIN PREDICTOR PAGE (3 tabs)
   ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
const TABS = ['Lap Time', 'Strategy', 'Race Outcome'] as const;

export default function Predictor({ sessionId }: { sessionId: number }) {
  const [tab, setTab] = useState<typeof TABS[number]>('Lap Time');
  const [drivers, setDrivers] = useState<any[]>([]);

  /* fetch driver list once for the Lap Time tab dropdown */
  useEffect(() => {
    api.drivers().then(r => setDrivers(r.data)).catch(() => {});
  }, []);

  return (
    <div>
      <h2 style={{ color: RED, marginBottom: 4 }}>🤖 ML Predictions</h2>
      <p style={{ color: DIM, fontSize: 12, marginBottom: 20 }}>
        Machine-learning powered insights — lap times, pit strategy, and race outcome.
      </p>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {TABS.map(t => (
          <TabButton key={t} label={t} active={tab === t} onClick={() => setTab(t)} />
        ))}
      </div>

      {/* Tab content */}
      {tab === 'Lap Time'     && <LapTimeTab drivers={drivers} sessionId={sessionId} />}
      {tab === 'Strategy'     && <StrategyTab sessionId={sessionId} />}
      {tab === 'Race Outcome' && <RaceOutcomeTab sessionId={sessionId} />}
    </div>
  );
}