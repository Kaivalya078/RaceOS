import { useEffect, useState } from 'react';
import { api } from '../api';

export default function PitStops({ sessionId }: { sessionId: number }) {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.pitStops(sessionId)
      .then(r => setData(r.data))
      .finally(() => setLoading(false));
  }, [sessionId]);

  if (loading) return <div style={{ color: '#888', padding: 32 }}>Loading pit stops...</div>;
  if (!data.length) return <div style={{ color: '#888', padding: 32 }}>No pit stop data available.</div>;

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>🔧 Pit Stops</h2>
      <p style={{ color: '#666', fontSize: 12, marginBottom: 16 }}>
        {data.length} pit stops detected from timing data
      </p>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#1a1a1a', color: '#e10600' }}>
            {['Driver', 'Full Name', 'Pit Lap', 'Duration', 'Compound After', 'Stint'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #333' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} style={{ background: i % 2 === 0 ? '#151515' : '#1a1a1a' }}>
              <td style={{ padding: '8px 14px', fontWeight: 700, color: '#fff' }}>{row.driver_id}</td>
              <td style={{ padding: '8px 14px', color: '#aaa' }}>{row.full_name}</td>
              <td style={{ padding: '8px 14px', color: '#60a5fa' }}>Lap {row.pit_lap}</td>
              <td style={{
                padding: '8px 14px',
                color: row.pit_duration
                  ? (row.pit_duration < 25 ? '#4ade80' : '#e10600')
                  : '#555'
              }}>
                {row.pit_duration ? `${row.pit_duration.toFixed(2)}s` : '—'}
              </td>
              <td style={{
                padding: '8px 14px',
                fontWeight: 600,
                color: row.compound_after === 'SOFT'
                  ? '#e10600'
                  : row.compound_after === 'MEDIUM'
                  ? '#facc15'
                  : row.compound_after === 'HARD'
                  ? '#e0e0e0'
                  : row.compound_after === 'INTERMEDIATE'
                  ? '#4ade80'
                  : '#60a5fa'
              }}>
                {row.compound_after}
              </td>
              <td style={{ padding: '8px 14px', color: '#888' }}>Stint {row.stint_number}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}