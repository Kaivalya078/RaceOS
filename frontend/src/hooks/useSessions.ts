import { useEffect, useState } from 'react';
import axios from 'axios';

export interface Session {
  id: number;
  year: number;
  round_number: number;
  round_name: string;
  event_name: string;
  session_type: string;
}

export function useSessions() {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    axios
      .get<Session[]>('http://localhost:8000/api/v1/sessions/')
      .then(r => setSessions(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return { sessions, loading };
}
