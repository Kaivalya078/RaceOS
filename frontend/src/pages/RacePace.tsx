import { useEffect, useState } from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api';

const COLORS = ['#e10600','#4ade80','#60a5fa','#facc15','#f97316','#a78bfa','#fb7185','#34d399','#fbbf24','#38bdf8'];

export default function RacePace({ sessionId }: { sessionId: number }) {
  const [raw, setRaw]       = useState<any[]>([]);
  const [drivers, setDrivers] = useState<string[]>([]);
  const [selected, setSelected] = useState<string[]>([]);

  useEffect(() => {
    api.racePace(sessionId).then(r => {
      setRaw(r.data);
      const drv = [...new Set<string>(r.data.map((d: any) => d.driver_id))];
      setDrivers(drv);
      setSelected(drv.slice(0, 5));
    });
  }, [sessionId]);

  const filtered = raw.filter(d => selected.includes(d.driver_id));
  const laps = [...new Set<number>(filtered.map(d => d.lap_number))].sort((a, b) => a - b);
  const chartData = laps.map(lap => {
    const obj: any = { lap };
    selected.forEach(drv => {
      const row = filtered.find(d => d.driver_id === drv && d.lap_number === lap);
      if (row) obj[drv] = parseFloat(row.lap_time?.toFixed(2));
    });
    return obj;
  });

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>📈 Race Pace</h2>
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        {drivers.map((d, i) => (
          <button key={d} onClick={() => setSelected(s => s.includes(d) ? s.filter(x => x !== d) : [...s, d])}
            style={{ background: selected.includes(d) ? COLORS[i % COLORS.length] : '#222', color: '#fff', border: 'none', padding: '4px 12px', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
            {d}
          </button>
        ))}
      </div>
      <ResponsiveContainer width="100%" height={420}>
        <LineChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis dataKey="lap" stroke="#555" label={{ value: 'Lap', position: 'insideBottom', offset: -4, fill: '#888' }} />
          <YAxis stroke="#555" domain={['auto', 'auto']} label={{ value: 'Time (s)', angle: -90, position: 'insideLeft', fill: '#888' }} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }} />
          <Legend />
          {selected.map((d, i) => (
            <Line key={d} type="monotone" dataKey={d} stroke={COLORS[i % COLORS.length]} dot={false} strokeWidth={2} />
          ))}
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}