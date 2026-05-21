import { useEffect, useState } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api';

const COMPOUND_COLOR: Record<string, string> = { SOFT: '#e10600', MEDIUM: '#facc15', HARD: '#e0e0e0', INTERMEDIATE: '#4ade80', WET: '#60a5fa' };

export default function TyreDeg({ sessionId }: { sessionId: number }) {
  const [data, setData]     = useState<any[]>([]);
  const [driver, setDriver] = useState('VER');

  const load = () => api.tyres(sessionId, driver).then(r => setData(r.data));
  useEffect(() => { load(); }, [sessionId]);

  const compounds = [...new Set<string>(data.map(d => d.compound))];

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>🔴 Tyre Degradation</h2>
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input value={driver} onChange={e => setDriver(e.target.value.toUpperCase())}
          style={{ background: '#1a1a1a', border: '1px solid #e10600', color: '#fff', padding: '6px 12px', borderRadius: 4, width: 80, fontFamily: 'monospace' }} />
        <button onClick={load} style={{ background: '#e10600', color: '#fff', border: 'none', padding: '6px 16px', borderRadius: 4, cursor: 'pointer', fontFamily: 'monospace' }}>Load</button>
      </div>
      <ResponsiveContainer width="100%" height={400}>
        <ScatterChart>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="tyre_age" name="Tyre Age" stroke="#555" label={{ value: 'Tyre Age (laps)', position: 'insideBottom', offset: -4, fill: '#888' }} />
          <YAxis dataKey="lap_time" name="Lap Time" stroke="#555" domain={['auto', 'auto']} label={{ value: 'Lap Time (s)', angle: -90, position: 'insideLeft', fill: '#888' }} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }} cursor={{ strokeDasharray: '3 3' }} />
          <Legend />
          {compounds.map(c => (
            <Scatter key={c} name={c} data={data.filter(d => d.compound === c).map(d => ({ tyre_age: d.tyre_age, lap_time: parseFloat(d.lap_time) }))}
              fill={COMPOUND_COLOR[c] || '#888'} />
          ))}
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}