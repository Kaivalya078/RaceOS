import { useEffect, useState } from 'react';
import { api } from '../api';

export default function BestLaps({ sessionId }: { sessionId: number }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => { api.bestLaps(sessionId).then(r => setData(r.data)); }, [sessionId]);

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>⏱ Best Laps</h2>
      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
        <thead>
          <tr style={{ background: '#1a1a1a', color: '#e10600' }}>
            {['P', 'Driver', 'Team', 'Best Lap', 'S1', 'S2', 'S3', 'Theoretical Best'].map(h => (
              <th key={h} style={{ padding: '10px 14px', textAlign: 'left', borderBottom: '1px solid #333' }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={row.driver_id} style={{ background: i % 2 === 0 ? '#151515' : '#1a1a1a' }}>
              <td style={{ padding: '8px 14px', color: i === 0 ? '#e10600' : '#888' }}>{i + 1}</td>
              <td style={{ padding: '8px 14px', fontWeight: 600 }}>{row.driver_id}</td>
              <td style={{ padding: '8px 14px', color: '#888' }}>{row.team}</td>
              <td style={{ padding: '8px 14px', color: '#4ade80', fontWeight: 700 }}>{row.best_lap_time?.toFixed(3)}s</td>
              <td style={{ padding: '8px 14px' }}>{row.best_s1?.toFixed(3)}s</td>
              <td style={{ padding: '8px 14px' }}>{row.best_s2?.toFixed(3)}s</td>
              <td style={{ padding: '8px 14px' }}>{row.best_s3?.toFixed(3)}s</td>
              <td style={{ padding: '8px 14px', color: '#facc15' }}>{row.theoretical_best?.toFixed(3)}s</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}