import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api';

export default function Compare({ sessionId }: { sessionId: number }) {
  const [driverA, setDriverA] = useState('VER');
  const [driverB, setDriverB] = useState('LEC');
  const [data, setData]       = useState<any[]>([]);

  const load = () => api.compare(driverA, driverB, sessionId).then(r => setData(r.data));
  useEffect(() => { load(); }, [sessionId]);

  const laps = [...new Set<number>(data.map(d => d.lap_number))].sort((a, b) => a - b);
  const chartData = laps.map(lap => ({
    lap,
    [driverA]: data.find(d => d.driver_id === driverA && d.lap_number === lap)?.lap_time?.toFixed(3),
    [driverB]: data.find(d => d.driver_id === driverB && d.lap_number === lap)?.lap_time?.toFixed(3),
  }));

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>🔁 Driver Comparison</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input value={driverA} onChange={e => setDriverA(e.target.value.toUpperCase())}
          style={{ background: '#1a1a1a', border: '1px solid #e10600', color: '#fff', padding: '6px 12px', borderRadius: 4, width: 80, fontFamily: 'monospace' }} />
        <span style={{ color: '#888' }}>vs</span>
        <input value={driverB} onChange={e => setDriverB(e.target.value.toUpperCase())}
          style={{ background: '#1a1a1a', border: '1px solid #60a5fa', color: '#fff', padding: '6px 12px', borderRadius: 4, width: 80, fontFamily: 'monospace' }} />
        <button onClick={load} style={{ background: '#e10600', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace' }}>
          Compare
        </button>
      </div>
      <ResponsiveContainer width="100%" height={380}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="lap" stroke="#555" />
          <YAxis stroke="#555" domain={['auto', 'auto']} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }} />
          <Legend />
          <Line type="monotone" dataKey={driverA} stroke="#e10600" dot={false} strokeWidth={2} />
          <Line type="monotone" dataKey={driverB} stroke="#60a5fa" dot={false} strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}