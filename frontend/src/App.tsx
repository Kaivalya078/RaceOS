import { useState, useEffect } from 'react';
import BestLaps from './pages/BestLaps';
import RacePace from './pages/RacePace';
import Compare from './pages/Compare';
import TyreDeg from './pages/TyreDeg';
import PitStops from './pages/PitStops';
import Predictor from './pages/Predictor';
import Sectors from './pages/Sectors';
import { useSessions } from './hooks/useSessions';
import './App.css';

const PAGES = ['Best Laps', 'Race Pace', 'Compare', 'Tyre Deg', 'Sectors', 'Pit Stops', 'Predictor'];

export default function App() {
  const [page, setPage] = useState('Best Laps');
  const { sessions, loading: sessionsLoading } = useSessions();
  const [sessionId, setSessionId] = useState<number | null>(null);

  // Default to first session once loaded
  useEffect(() => {
    if (sessions.length > 0 && sessionId === null) {
      setSessionId(sessions[0].id);
    }
  }, [sessions, sessionId]);

  // Find the current session for display
  const currentSession = sessions.find(s => s.id === sessionId);

  if (sessionsLoading || sessionId === null) {
    return (
      <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#888', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        Loading sessions…
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', background: '#0f0f0f', color: '#e0e0e0', fontFamily: 'monospace' }}>
      {/* Header */}
      <div style={{ background: '#1a1a1a', borderBottom: '2px solid #e10600', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 24 }}>
        <span style={{ color: '#e10600', fontWeight: 700, fontSize: 20, letterSpacing: 2 }}>RACE<span style={{ color: '#fff' }}>OS</span></span>
        <select
          value={sessionId}
          onChange={e => setSessionId(parseInt(e.target.value))}
          style={{
            background: '#111', border: '1px solid #444', color: '#ccc',
            padding: '6px 12px', borderRadius: 4, fontFamily: 'monospace', fontSize: 12,
            cursor: 'pointer', minWidth: 260,
          }}
        >
          {sessions.map(s => (
            <option key={s.id} value={s.id}>
              {s.year} R{s.round_number} — {s.event_name}
            </option>
          ))}
        </select>
        <nav style={{ marginLeft: 'auto', display: 'flex', gap: 8 }}>
          {PAGES.map(p => (
            <button key={p} onClick={() => setPage(p)} style={{
              background: page === p ? '#e10600' : 'transparent',
              color: page === p ? '#fff' : '#aaa',
              border: '1px solid ' + (page === p ? '#e10600' : '#333'),
              padding: '6px 14px', borderRadius: 4, cursor: 'pointer', fontSize: 12, fontFamily: 'monospace'
            }}>{p}</button>
          ))}
        </nav>
      </div>
      {/* Content */}
      <div style={{ padding: 24 }}>
        {page === 'Best Laps'  && <BestLaps sessionId={sessionId!} />}
        {page === 'Race Pace'  && <RacePace sessionId={sessionId!} />}
        {page === 'Compare'    && <Compare sessionId={sessionId!} />}
        {page === 'Tyre Deg'   && <TyreDeg sessionId={sessionId!} />}
        {page === 'Sectors'    && <Sectors sessionId={sessionId!} />}
        {page === 'Pit Stops'  && <PitStops sessionId={sessionId!} />}
        {page === 'Predictor'  && <Predictor sessionId={sessionId!} />}
      </div>
    </div>
  );
}