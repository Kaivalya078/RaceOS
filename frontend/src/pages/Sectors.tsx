import { useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from 'recharts';
import { api } from '../api';

export default function Sectors({ sessionId }: { sessionId: number }) {
  const [data, setData] = useState<any[]>([]);

  useEffect(() => {
    api.bestLaps(sessionId).then(r => setData(r.data));
  }, [sessionId]);

  const chartData = data.map(d => ({
    driver: d.driver_id,
    S1: parseFloat(d.best_s1?.toFixed(3)),
    S2: parseFloat(d.best_s2?.toFixed(3)),
    S3: parseFloat(d.best_s3?.toFixed(3)),
  }));

  // 40px per driver row (3 bars each) + 80px for axes/legend padding
  const chartHeight = Math.max(300, chartData.length * 40 + 80);

  return (
    <div>
      <h2 style={{ color: '#e10600', marginBottom: 16 }}>🗺 Sector Times</h2>
      <ResponsiveContainer width="100%" height={chartHeight}>
        <BarChart data={chartData} layout="vertical" margin={{ top: 8, right: 24, bottom: 8, left: 8 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#222" />
          <XAxis type="number" stroke="#555" domain={['auto', 'auto']} />
          <YAxis dataKey="driver" type="category" stroke="#555" width={48} />
          <Tooltip contentStyle={{ background: '#1a1a1a', border: '1px solid #333', color: '#fff' }} />
          <Legend />
          <Bar dataKey="S1" fill="#e10600" />
          <Bar dataKey="S2" fill="#facc15" />
          <Bar dataKey="S3" fill="#4ade80" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}